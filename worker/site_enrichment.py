"""Public social-profile enrichment for a business's own website.

This module deliberately does **not** look for email addresses. Emails in
Zybble come from exactly one source — the pinned
`gosom/google-maps-scraper <https://github.com/gosom/google-maps-scraper>`_
engine (``-email``) — so nothing here can invent, guess or independently
discover an address.

What it does do is read the pages a business publishes (homepage, /contact,
/about) and collect the public social profile links they link to, which powers
the "has social profile" lead filter. Every redirect hop is checked against an
SSRF denylist before it is fetched, and any failure is a non-event: the lead
simply keeps no socials.
"""

from __future__ import annotations

import re
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests

from engine_contacts import is_public_host

CONTACT_PATHS = ("/contact", "/contact-us", "/about", "/about-us")
UA = "ZybbleBusinessResearch/1.0 (+https://zybble.com/about)"
MAX_BYTES = 600_000
TIMEOUT = 5
MAX_REDIRECTS = 4

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
#: How many profiles one business may keep.
MAX_SOCIALS = 5


def extract_social_profiles(html: str) -> list[str]:
    """Collect public social profile links published on a page."""
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


def _public_url(raw: str) -> bool:
    """True only for public http(s) hosts — never internal networks."""
    try:
        parsed = urlparse(raw)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            return False
        if parsed.port and parsed.port not in (80, 443):
            return False
        return is_public_host(parsed.hostname)
    except (OSError, ValueError):
        return False


def _fetch(url: str) -> Optional[str]:
    """Fetch one page, validating every redirect hop. Never raises."""
    current = url
    for _ in range(MAX_REDIRECTS):
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


def find_social_profiles(site_url: str) -> list[str]:
    """The public social profiles a business links to on its own website.

    Returns an empty list for anything unreachable or malformed: a missing
    profile is never an error and never fails a job.
    """
    if not site_url:
        return []
    try:
        parsed = urlparse(site_url if site_url.startswith("http") else f"https://{site_url}")
        if not parsed.netloc:
            return []
        base = f"{parsed.scheme}://{parsed.netloc}"
    except ValueError:
        return []

    socials: list[str] = []
    for path in ("/", *CONTACT_PATHS):
        html = _fetch(urljoin(base, path))
        if not html:
            continue
        socials.extend(extract_social_profiles(html))
        if len({url.lower() for url in socials}) >= MAX_SOCIALS:
            break

    deduped: list[str] = []
    for url in socials:
        if url.lower() not in {seen.lower() for seen in deduped}:
            deduped.append(url)
        if len(deduped) >= MAX_SOCIALS:
            break
    return deduped


__all__ = [
    "CONTACT_PATHS",
    "MAX_SOCIALS",
    "extract_social_profiles",
    "find_social_profiles",
]
