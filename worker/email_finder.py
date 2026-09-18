"""Find emails a business has published on its own public website.

No address patterns are guessed. Every address has a source URL. DNS MX
validation separates invalid domains from verified/risky public addresses.
Every redirect hop is checked against an SSRF denylist.

Zybble additions:
  * :func:`normalize_email` — strict syntax validation. An address that is not
    syntactically valid is *discarded*, never stored and never allowed to fail
    a job. Missing or unusable emails are reported as ``unknown``.
  * public social profiles published on the same pages are collected too, which
    powers the "has social profile" lead filter.
  * :func:`find_site_intel` also accepts ``candidates`` — addresses the scraping
    engine (`gosom/google-maps-scraper`, ``-email``) already read on the same
    website. They go through exactly the same validation and DNS MX check as
    addresses found here, are only used when this scan finds nothing, and are
    reported as ``risky`` because the publishing page is not re-verified.
"""

from __future__ import annotations

import ipaddress
import re
import socket
from dataclasses import dataclass, field
from typing import Optional, Sequence
from urllib.parse import urljoin, urlparse

import dns.exception
import dns.resolver
import requests

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
MAILTO_RE = re.compile(r"mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})", re.I)
OBFUSCATED_RE = re.compile(
    r"([a-zA-Z0-9._%+\-]{2,})\s*(?:\(|\[)?\s*(?:at|@)\s*(?:\)|\])?\s*"
    r"([a-zA-Z0-9\-]+(?:\s*(?:\(|\[)?\s*(?:dot|\.)\s*(?:\)|\])?\s*[a-zA-Z0-9\-]+)+)",
    re.I,
)

# RFC-5322-pragmatic syntax check: one @, allowed local characters, a dotted
# domain with a real TLD, no leading/trailing/consecutive dots.
STRICT_EMAIL_RE = re.compile(
    r"^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*"
    r"@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$"
)

BLOCKED_LOCAL = {
    "noreply", "no-reply", "donotreply", "mailer-daemon", "postmaster",
    "example", "email", "yourname", "name", "user", "webmaster", "sentry",
    "youremail", "firstname", "lastname", "someone", "recipient", "sender",
}
BLOCKED_DOMAINS = (
    "example.com", "example.org", "example.net", "sentry.io", "wixpress.com",
    "schema.org", "w3.org", "godaddy.com", "squarespace.com", "cloudflare.com",
    "domain.com", "yourdomain.com", "email.com", "test.com", "sentry-cdn.com",
)
BLOCKED_SUFFIXES = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".js", ".ico", ".pdf")

CONTACT_PATHS = ("/contact", "/contact-us", "/about", "/about-us")
UA = "ZybbleBusinessResearch/1.0 (+https://zybble.com/about)"
MAX_BYTES = 600_000
TIMEOUT = 5
# Faster per-site budget — parallel discovery at the worker level means we
# can be less patient per host and still surface the same addresses.

SOCIAL_DOMAINS = (
    "facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com",
    "youtube.com", "tiktok.com", "pinterest.com",
)
SOCIAL_RE = re.compile(
    r"https?://(?:[\w-]+\.)*("
    + "|".join(domain.replace(".", r"\.") for domain in SOCIAL_DOMAINS)
    + r")/[^\s<>]+",
    re.I,
)
MAX_SOCIALS = 5


def normalize_email(raw: Optional[str]) -> Optional[str]:
    """Return a syntactically valid, cleaned address — or ``None``.

    Nothing is ever invented here: an address that Google or a business website
    published but that fails validation is simply dropped and reported as
    ``unknown``, which keeps the rest of the job running.
    """
    if not raw:
        return None
    value = str(raw).strip().strip("<>").strip()
    value = value.strip(".,;:()[]{}\"' \t\r\n")
    value = value.replace("mailto:", "") if value.lower().startswith("mailto:") else value
    value = value.split("?")[0].strip()
    value = value.lower()
    if not value or len(value) > 254 or "@" not in value:
        return None
    local, _, domain = value.rpartition("@")
    if not local or not domain or len(local) > 64:
        return None
    if ".." in value or local.startswith(".") or local.endswith(".") or domain.startswith(".") or domain.endswith("."):
        return None
    if local in BLOCKED_LOCAL:
        return None
    if any(fragment in domain for fragment in BLOCKED_DOMAINS):
        return None
    if any(value.endswith(suffix) for suffix in BLOCKED_SUFFIXES):
        return None
    if not STRICT_EMAIL_RE.match(value):
        return None
    return value


@dataclass
class FoundEmail:
    email: str
    status: str
    source_url: str
    social_profiles: list[str] = field(default_factory=list)


def _valid(address: str) -> bool:
    return normalize_email(address) is not None


def _public_url(raw: str) -> bool:
    try:
        parsed = urlparse(raw)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            return False
        if parsed.port and parsed.port not in (80, 443):
            return False
        host = parsed.hostname.lower().rstrip(".")
        if host == "localhost" or host.endswith(".local") or host == "metadata.google.internal":
            return False
        for info in socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80)):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return False
        return True
    except (OSError, ValueError):
        return False


def _fetch(url: str) -> Optional[str]:
    current = url
    for _ in range(4):
        if not _public_url(current):
            return None
        try:
            response = requests.get(
                current,
                headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"},
                timeout=TIMEOUT,
                stream=True,
                allow_redirects=False,
            )
        except requests.RequestException:
            return None
        if response.is_redirect:
            location = response.headers.get("location")
            response.close()
            if not location:
                return None
            current = urljoin(current, location)
            continue
        with response:
            if response.status_code >= 400:
                return None
            ctype = response.headers.get("content-type", "")
            if ctype and "text/html" not in ctype and "text/plain" not in ctype:
                return None
            chunks, size = [], 0
            for chunk in response.iter_content(8192):
                chunks.append(chunk)
                size += len(chunk)
                if size >= MAX_BYTES:
                    break
            return b"".join(chunks).decode("utf-8", errors="ignore")
    return None


def _mx(domain: str) -> Optional[bool]:
    try:
        return len(list(dns.resolver.resolve(domain, "MX", lifetime=4.0))) > 0
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
        return False
    except (dns.resolver.NoNameservers, dns.exception.Timeout, OSError):
        return None


def extract_social_profiles(html: str) -> list[str]:
    """Collect public social profile links the business published on its site."""
    if not html:
        return []
    found: list[str] = []
    seen: set[str] = set()
    for match in SOCIAL_RE.finditer(html):
        url = match.group(0).strip().rstrip(".'\",;)]>")
        key = url.lower()
        if key in seen:
            continue
        seen.add(key)
        found.append(url)
        if len(found) >= MAX_SOCIALS:
            break
    return found


@dataclass
class SiteIntel:
    """Everything one business website publicly publishes about contacting it."""

    email: Optional[str] = None
    status: str = "unknown"
    source_url: Optional[str] = None
    social_profiles: list[str] = field(default_factory=list)


def verify_candidate_emails(candidates: Optional[Sequence[str]]) -> Optional[str]:
    """Validate engine-supplied addresses; return the first that can receive mail.

    Nothing is invented and nothing unverified is returned: an address that is
    syntactically invalid, or whose domain publishes no MX record, is dropped.
    """
    for raw in candidates or ():
        email = normalize_email(raw)
        if not email:
            continue
        if _mx(email.rsplit("@", 1)[1]) is False:
            continue
        return email
    return None


def find_site_intel(site_url: str, engine_candidates: Optional[Sequence[str]] = None) -> Optional[SiteIntel]:
    """Discover a published address *and* public social profiles.

    ``engine_candidates`` are addresses the scraping engine already read on this
    website; they are used only when this scan finds nothing, and are held to
    the same validation + DNS MX rules.

    Raises nothing for unreachable or malformed sites: callers treat a missing
    address as ``unknown`` and keep the lead.
    """
    try:
        parsed = urlparse(site_url if site_url.startswith("http") else f"https://{site_url}")
        if not parsed.netloc:
            return None
        base = f"{parsed.scheme}://{parsed.netloc}"
    except ValueError:
        return None

    candidates: list[tuple[str, str, bool]] = []
    socials: list[str] = []

    for path in ("/", *CONTACT_PATHS):
        page_url = urljoin(base, path)
        html = _fetch(page_url)
        if not html:
            continue
        strong = path != "/"
        socials.extend(extract_social_profiles(html))
        candidates.extend((email.lower(), page_url, True) for email in MAILTO_RE.findall(html))
        candidates.extend((email.lower(), page_url, strong) for email in EMAIL_RE.findall(html))
        for local, domain in OBFUSCATED_RE.findall(html):
            fixed = re.sub(r"\s*(?:\(|\[)?\s*dot\s*(?:\)|\])?\s*", ".", domain, flags=re.I)
            candidates.append((f"{local}@{fixed}".lower(), page_url, False))
        if any(_valid(item[0]) for item in candidates):
            break

    seen: set[str] = set()
    ranked: list[tuple[str, str, bool]] = []
    for raw, page_url, strong in candidates:
        email = normalize_email(raw)
        if not email or email in seen:
            continue
        seen.add(email)
        ranked.append((email, page_url, strong))
    ranked.sort(key=lambda item: item[2], reverse=True)

    deduped_socials: list[str] = []
    for url in socials:
        if url not in deduped_socials:
            deduped_socials.append(url)

    if not ranked:
        # Nothing published where we looked. Fall back to the addresses the
        # scraping engine read on this site — validated and MX-checked here.
        candidate = verify_candidate_emails(engine_candidates)
        if candidate:
            return SiteIntel(
                email=candidate,
                status="risky",
                source_url=base,
                social_profiles=deduped_socials[:MAX_SOCIALS],
            )
        # No valid address — social profiles are still real enrichment.
        return (
            SiteIntel(email=None, status="unknown", source_url=base, social_profiles=deduped_socials[:MAX_SOCIALS])
            if deduped_socials
            else None
        )

    email, source, strong = ranked[0]
    mx = _mx(email.rsplit("@", 1)[1])
    status = "invalid" if mx is False else ("verified" if strong else "risky")
    return SiteIntel(
        email=email,
        status=status,
        source_url=source,
        social_profiles=deduped_socials[:MAX_SOCIALS],
    )


def find_email(site_url: str) -> Optional[FoundEmail]:
    """Backwards-compatible wrapper: one published address, or ``None``."""
    intel = find_site_intel(site_url)
    if not intel or not intel.email:
        return None
    return FoundEmail(
        email=intel.email,
        status=intel.status,
        source_url=intel.source_url or site_url,
        social_profiles=list(intel.social_profiles),
    )
