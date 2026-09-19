"""Validation for the contact details the scraping engine returns.

Zybble has exactly one source for emails: the pinned
`gosom/google-maps-scraper <https://github.com/gosom/google-maps-scraper>`_
engine (``-email``), which visits each business's public website and emits the
addresses it read there as ``entry["emails"]``. Zybble never guesses, generates,
pattern-builds or independently crawls for an address.

This module is the only place that decides which of those addresses are usable:

* :func:`normalize_email` — strict RFC-5322-pragmatic syntax validation. A
  malformed address is *discarded*, never stored.
* :func:`verify_engine_emails` — orders the valid addresses and resolves their
  status with a DNS MX lookup: a domain that publishes mail records yields
  ``verified``, an undeterminable lookup yields ``risky``, and a domain that
  publishes no mail records at all yields ``invalid`` (kept so the user can see
  it, never used for outreach).
* :func:`normalize_phones` — the same treatment for phone numbers, so several
  published numbers survive as a list instead of being flattened to one.

Nothing here performs network requests other than DNS MX lookups.
"""

from __future__ import annotations

import ipaddress
import re
import socket
from typing import Iterable, Optional, Sequence

import dns.exception
import dns.resolver

#: How many addresses / phone numbers one business may keep.
MAX_EMAILS = 5
MAX_PHONES = 3

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

# Phone numbers: RFC-3966-friendly. Digits, the usual separators, and an
# optional extension marker. Anything else (URLs, "Call us", emails) is not a
# phone number and is dropped.
PHONE_ALLOWED_RE = re.compile(r"^\+?[\d\s().\-/]{6,40}(?:\s*(?:ext|x|extension)\.?\s*\d{1,6})?$", re.I)
PHONE_SPLIT_RE = re.compile(r"\s*(?:,|;|\||·|•|\n|\r|/)\s*")
PHONE_DIGITS_RE = re.compile(r"\d")


def normalize_email(raw: Optional[str]) -> Optional[str]:
    """Return a syntactically valid, cleaned address — or ``None``.

    Nothing is ever invented here: an address the engine published but that
    fails validation is simply dropped and reported as ``unknown``.
    """
    if not raw:
        return None
    value = str(raw).strip().strip("<>").strip()
    value = value.strip(".,;:()[]{}\"' \t\r\n")
    if value.lower().startswith("mailto:"):
        value = value[7:]
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


def normalize_phone(raw: Optional[str]) -> Optional[str]:
    """Return one clean phone number — or ``None`` when it is not a number."""
    if raw is None:
        return None
    value = str(raw).strip()
    if not value or "@" in value or "http" in value.lower():
        return None
    value = re.sub(r"\s+", " ", value)
    # Only trailing/leading sentence punctuation is noise; parentheses, dashes
    # and the leading + are part of the number's formatting.
    value = value.strip(" \t.,;:")
    if not PHONE_ALLOWED_RE.match(value):
        return None
    digits = PHONE_DIGITS_RE.findall(value)
    if not 6 <= len(digits) <= 15:
        return None
    return value


def split_phones(raw: object) -> list[str]:
    """Expand whatever the engine published into individual phone numbers.

    The engine usually returns one ``phone`` string, but a listing can carry
    several (``"… · …"``, ``"a; b"``, or a ``phones`` list on newer builds).
    Each candidate is validated independently so a junk entry can never
    discard a real number.
    """
    candidates: list[str] = []
    if isinstance(raw, (list, tuple, set)):
        for item in raw:
            candidates.extend(split_phones(item))
        return candidates
    if isinstance(raw, str):
        for piece in PHONE_SPLIT_RE.split(raw):
            phone = normalize_phone(piece)
            if phone:
                candidates.append(phone)
    return candidates


def normalize_phones(*sources: object) -> list[str]:
    """Every valid, de-duplicated phone number, in the engine's original order."""
    out: list[str] = []
    for source in sources:
        for phone in split_phones(source):
            if phone not in out:
                out.append(phone)
            if len(out) >= MAX_PHONES:
                return out
    return out


# ————————————————————————————————————————————————————————————
# DNS MX — does the domain accept mail at all?
# ————————————————————————————————————————————————————————————

_MX_CACHE: dict[str, Optional[bool]] = {}
_MX_CACHE_LIMIT = 512


def _resolve_mx(domain: str) -> Optional[bool]:
    """``True``/``False`` when DNS answers, ``None`` when it cannot."""
    try:
        return len(list(dns.resolver.resolve(domain, "MX", lifetime=4.0))) > 0
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
        return False
    except (dns.resolver.NoNameservers, dns.exception.Timeout, OSError):
        return None


def mx_status(domain: str) -> Optional[bool]:
    """Cached :func:`_resolve_mx`, so one domain is only resolved once."""
    domain = (domain or "").lower().rstrip(".")
    if not domain:
        return None
    if domain not in _MX_CACHE:
        if len(_MX_CACHE) >= _MX_CACHE_LIMIT:
            _MX_CACHE.clear()
        _MX_CACHE[domain] = _resolve_mx(domain)
    return _MX_CACHE[domain]


def email_status(address: str) -> str:
    """``verified`` / ``risky`` / ``invalid`` for a syntactically valid address."""
    verdict = mx_status(address.rsplit("@", 1)[-1])
    if verdict is True:
        return "verified"
    if verdict is False:
        return "invalid"
    return "risky"


#: Best first: outreach uses the first verified address, then risky, then invalid.
_STATUS_RANK = {"verified": 0, "risky": 1, "invalid": 2}


def verify_engine_emails(candidates: object) -> list[tuple[str, str]]:
    """Validate the engine's addresses and pair each with its MX status.

    Returns ``[(address, status), …]`` ordered best-first: addresses whose
    domain accepts mail come before unverifiable ones, which come before
    domains that publish no mail records. Malformed addresses never appear.
    """
    valid: list[str] = []
    if isinstance(candidates, (list, tuple, set)):
        for raw in candidates:
            email = normalize_email(raw if isinstance(raw, str) else None)
            if email and email not in valid:
                valid.append(email)
    elif isinstance(candidates, str):
        email = normalize_email(candidates)
        if email:
            valid.append(email)

    pairs = [(address, email_status(address)) for address in valid]
    pairs.sort(key=lambda item: _STATUS_RANK.get(item[1], 3))
    return pairs[:MAX_EMAILS]


def is_public_host(host: str) -> bool:
    """SSRF guard used anywhere a URL from the engine is dereferenced."""
    try:
        if not host or host.lower() in {"localhost", "metadata.google.internal"}:
            return False
        if host.lower().endswith(".local"):
            return False
        for info in socket.getaddrinfo(host, None):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return False
        return True
    except (OSError, ValueError):
        return False


def primary_email(pairs: Sequence[tuple[str, str]]) -> tuple[Optional[str], str]:
    """The address to display first and the lead's overall email status."""
    if not pairs:
        return None, "unknown"
    return pairs[0][0], pairs[0][1]


def verified_only(pairs: Iterable[tuple[str, str]]) -> list[str]:
    """Addresses that are safe to email (verified or unverifiable-but-published)."""
    return [address for address, status in pairs if status != "invalid"]


__all__ = [
    "BLOCKED_DOMAINS",
    "BLOCKED_LOCAL",
    "MAX_EMAILS",
    "MAX_PHONES",
    "STRICT_EMAIL_RE",
    "email_status",
    "is_public_host",
    "mx_status",
    "normalize_email",
    "normalize_phone",
    "normalize_phones",
    "primary_email",
    "split_phones",
    "verified_only",
    "verify_engine_emails",
]
