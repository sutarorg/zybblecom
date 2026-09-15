"""
Zybble email finder & verification.

Discovers publicly listed business emails on a company's own
website — homepage, /contact, /about — never guesses or invents
addresses. Signals, strongest first:

  mailto: link on a contact page  → verified
  email text on a contact page    → verified
  obfuscated "name [at] domain"   → risky
  regex match on the homepage     → risky

Verification: DNS MX lookup for the address domain. A domain
with no MX records can never receive mail → invalid.
"""

from __future__ import annotations

import re
import socket
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urljoin, urlparse

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
    "example", "email", "yourname", "name", "user", "webmaster",
}
BLOCKED_DOMAIN_FRAGS = ("example.com", "sentry.io", "wixpress.com", "schema.org", "w3.org")
BLOCKED_SUFFIXES = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".js")

CONTACT_PATHS = ("/contact", "/contact-us", "/about", "/about-us", "/company")

UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)
MAX_BYTES = 600_000
TIMEOUT = 9


@dataclass
class FoundEmail:
    email: str
    status: str          # verified | risky | invalid | unknown
    source_url: str


def _valid(addr: str) -> bool:
    addr = addr.strip().strip(".,;:()[]<>").lower()
    if not addr or len(addr) > 120:
        return False
    local, _, domain = addr.partition("@")
    if not local or not domain or "." not in domain:
        return False
    if local in BLOCKED_LOCAL:
        return False
    if any(addr.endswith(sfx) for sfx in BLOCKED_SUFFIXES):
        return False
    if any(f in domain for f in BLOCKED_DOMAIN_FRAGS):
        return False
    return True


def _has_mx(domain: str) -> Optional[bool]:
    """DNS MX presence via stdlib resolver heuristics."""
    try:
        import dns.resolver  # dnspython (optional dependency)

        answers = dns.resolver.resolve(domain, "MX", lifetime=4.0)
        return len(list(answers)) > 0
    except ImportError:
        try:
            socket.getaddrinfo(domain, 25)
            return True
        except OSError:
            return None
    except Exception:
        return False


def _fetch(url: str) -> Optional[str]:
    try:
        with requests.get(
            url,
            headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"},
            timeout=TIMEOUT,
            stream=True,
            allow_redirects=True,
        ) as res:
            if res.status_code >= 400:
                return None
            ctype = res.headers.get("content-type", "")
            if "text/html" not in ctype and "text/plain" not in ctype and ctype:
                return None
            chunks, size = [], 0
            for chunk in res.iter_content(8192, decode_unicode=False):
                chunks.append(chunk)
                size += len(chunk)
                if size >= MAX_BYTES:
                    break
            return b"".join(chunks).decode("utf-8", errors="ignore")
    except requests.RequestException:
        return None


def find_email(site_url: str) -> Optional[FoundEmail]:
    parsed = urlparse(site_url if site_url.startswith("http") else f"https://{site_url}")
    if not parsed.netloc:
        return None
    base = f"{parsed.scheme}://{parsed.netloc}"

    candidates: list[tuple[str, str, bool]] = []  # (email, source_page, strong)
    for path in ("", *CONTACT_PATHS):
        page_url = urljoin(base, path or "/")
        html = _fetch(page_url)
        if not html:
            continue
        strong_page = bool(path)
        for m in MAILTO_RE.findall(html):
            candidates.append((m.lower(), page_url, True))
        for m in EMAIL_RE.findall(html):
            candidates.append((m.lower(), page_url, strong_page))
        for local, domain in OBFUSCATED_RE.findall(html):
            fixed_domain = re.sub(r"\s*(?:\(|\[)?\s*(?:dot)\s*(?:\)|\])?\s*", ".", domain, flags=re.I)
            candidates.append((f"{local}@{fixed_domain}".lower(), page_url, False))

        valid_here = [c for c in candidates if _valid(c[0])]
        if valid_here:
            break  # stop at the first page that yields data

    seen: set[str] = set()
    ranked: list[tuple[str, str, bool]] = []
    for cand in candidates:
        addr = cand[0]
        if not _valid(addr) or addr in seen:
            continue
        seen.add(addr)
        ranked.append(cand)
    if not ranked:
        return None

    email, source, strong = ranked[0]
    domain = email.partition("@")[2]
    mx = _has_mx(domain)
    if mx is False:
        return FoundEmail(email=email, status="invalid", source_url=source)
    return FoundEmail(email=email, status="verified" if strong else "risky", source_url=source)
