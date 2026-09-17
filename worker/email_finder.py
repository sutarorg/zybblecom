"""Find emails a business has published on its own public website.

No address patterns are guessed. Every address has a source URL. DNS MX
validation separates invalid domains from verified/risky public addresses.
Every redirect hop is checked against an SSRF denylist.
"""

from __future__ import annotations

import ipaddress
import re
import socket
from dataclasses import dataclass
from typing import Optional
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

BLOCKED_LOCAL = {
    "noreply", "no-reply", "donotreply", "mailer-daemon", "postmaster",
    "example", "email", "yourname", "name", "user", "webmaster", "sentry",
}
BLOCKED_DOMAINS = (
    "example.com", "sentry.io", "wixpress.com", "schema.org", "w3.org",
    "godaddy.com", "squarespace.com", "cloudflare.com",
)
CONTACT_PATHS = ("/contact", "/contact-us", "/about", "/about-us")
UA = "ZybbleBusinessResearch/1.0 (+https://zybble.com/about)"
MAX_BYTES = 600_000
TIMEOUT = 8


@dataclass
class FoundEmail:
    email: str
    status: str
    source_url: str


def _valid(address: str) -> bool:
    value = address.strip().strip(".,;:()[]<>").lower()
    if not value or len(value) > 120 or "@" not in value:
        return False
    local, domain = value.rsplit("@", 1)
    return (
        local not in BLOCKED_LOCAL
        and "." in domain
        and not any(fragment in domain for fragment in BLOCKED_DOMAINS)
        and not any(value.endswith(ext) for ext in (".png", ".jpg", ".svg", ".css", ".js"))
    )


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


def find_email(site_url: str) -> Optional[FoundEmail]:
    try:
        parsed = urlparse(site_url if site_url.startswith("http") else f"https://{site_url}")
        if not parsed.netloc:
            return None
        base = f"{parsed.scheme}://{parsed.netloc}"
    except ValueError:
        return None

    candidates: list[tuple[str, str, bool]] = []
    for path in ("/", *CONTACT_PATHS):
        page_url = urljoin(base, path)
        html = _fetch(page_url)
        if not html:
            continue
        strong = path != "/"
        candidates.extend((email.lower(), page_url, True) for email in MAILTO_RE.findall(html))
        candidates.extend((email.lower(), page_url, strong) for email in EMAIL_RE.findall(html))
        for local, domain in OBFUSCATED_RE.findall(html):
            fixed = re.sub(r"\s*(?:\(|\[)?\s*dot\s*(?:\)|\])?\s*", ".", domain, flags=re.I)
            candidates.append((f"{local}@{fixed}".lower(), page_url, False))
        if any(_valid(item[0]) for item in candidates):
            break

    seen: set[str] = set()
    ranked = []
    for item in candidates:
        if _valid(item[0]) and item[0] not in seen:
            seen.add(item[0])
            ranked.append(item)
    ranked.sort(key=lambda item: item[2], reverse=True)
    if not ranked:
        return None

    email, source, strong = ranked[0]
    mx = _mx(email.rsplit("@", 1)[1])
    if mx is False:
        return FoundEmail(email, "invalid", source)
    return FoundEmail(email, "verified" if strong else "risky", source)