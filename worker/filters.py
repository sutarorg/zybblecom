"""Professional lead filters for Zybble's Lead Finder.

The same filter contract is implemented twice — here for the scraper worker and
in ``api/_lib/filters.ts`` for the Vercel API — because the worker filters while
it scrapes and the API re-applies the identical rules server-side as a safety
net. Both implementations must accept the same JSON shape:

    {
      "category": "gym" | null,            // business type / category contains
      "country": "India" | null,
      "state": "Delhi" | null,             // state / region
      "city": "New Delhi" | null,
      "min_rating": 4.0 | null,
      "max_rating": null,
      "min_reviews": 10 | null,
      "max_reviews": null,
      "has_website": true | null,          // null = do not care
      "has_phone": null,
      "has_email": null,                   // applied after email discovery
      "email_status": ["verified"],        // [] = any status
      "has_social": null,                  // applied after email discovery
      "enriched_only": false,             // only businesses with a resolved email status
      "open_status": ["open"],             // open | closed | permanently_closed | unknown
      "keywords_include": ["crossfit"],
      "keywords_exclude": ["franchise"],
      "exclude_previously_collected": true,
      "websites_only": false,              // convenience alias of has_website
      "contactable_only": false,           // website or phone present
      "sort_by": "relevance",              // relevance | rating | reviews | newest
      "limit": 50
    }

Two-stage evaluation is deliberate:

* :func:`evaluate_discovery` runs on freshly scraped Google Maps data and only
  uses fields that exist at that moment (rating, reviews, website, phone,
  location, category, keywords, opening status).
* :func:`evaluate_enrichment` runs after email discovery and adds the filters
  that need it (has email, email status, social profiles, enriched/unenriched).

Filters never invent data and never drop a business silently: every rejection
returns a human-readable reason that the job reports as ``filtered_count``.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from typing import Any, Mapping, Optional, Sequence

SORT_OPTIONS = ("relevance", "rating", "reviews", "newest")
EMAIL_STATUSES = ("verified", "risky", "invalid", "unknown")
OPEN_STATUSES = ("open", "closed", "permanently_closed", "unknown")


def _text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip().lower()


def _has(value: Any) -> bool:
    if isinstance(value, (list, tuple, set)):
        return len(value) > 0
    return bool(value and str(value).strip())


def _opt_bool(raw: Mapping[str, Any], key: str) -> Optional[bool]:
    if key not in raw or raw[key] is None or raw[key] == "":
        return None
    value = raw[key]
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value).strip().lower()
    if text in ("true", "yes", "1"):
        return True
    if text in ("false", "no", "0"):
        return False
    return None


def _opt_float(raw: Mapping[str, Any], key: str) -> Optional[float]:
    value = raw.get(key)
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _opt_int(raw: Mapping[str, Any], key: str) -> Optional[int]:
    value = _opt_float(raw, key)
    return None if value is None else int(value)


def _str_list(raw: Mapping[str, Any], key: str) -> list[str]:
    value = raw.get(key)
    if value is None or value == "":
        return []
    if isinstance(value, str):
        items = re.split(r"[,\n]", value)
    elif isinstance(value, (list, tuple, set)):
        items = list(value)
    else:
        return []
    return [item.strip().lower() for item in items if item and item.strip()]


@dataclass
class LeadFilters:
    """Decoded, validated filter set. ``None`` always means "do not care"."""

    category: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    min_rating: Optional[float] = None
    max_rating: Optional[float] = None
    min_reviews: Optional[int] = None
    max_reviews: Optional[int] = None
    has_website: Optional[bool] = None
    has_phone: Optional[bool] = None
    has_email: Optional[bool] = None
    email_status: list[str] = field(default_factory=list)
    has_social: Optional[bool] = None
    enriched_only: bool = False
    open_status: list[str] = field(default_factory=list)
    keywords_include: list[str] = field(default_factory=list)
    keywords_exclude: list[str] = field(default_factory=list)
    exclude_previously_collected: bool = True
    websites_only: bool = False
    contactable_only: bool = False
    sort_by: str = "relevance"
    limit: Optional[int] = None

    # ——— decoding ———

    @classmethod
    def from_dict(cls, raw: Optional[Mapping[str, Any]]) -> "LeadFilters":
        raw = raw or {}
        sort_by = str(raw.get("sort_by") or "relevance").strip().lower()
        if sort_by not in SORT_OPTIONS:
            sort_by = "relevance"
        email_status = [s for s in _str_list(raw, "email_status") if s in EMAIL_STATUSES]
        open_status = [s for s in _str_list(raw, "open_status") if s in OPEN_STATUSES]
        return cls(
            category=(str(raw.get("category")).strip() or None) if raw.get("category") else None,
            country=(str(raw.get("country")).strip() or None) if raw.get("country") else None,
            state=(str(raw.get("state")).strip() or None) if raw.get("state") else None,
            city=(str(raw.get("city")).strip() or None) if raw.get("city") else None,
            min_rating=_opt_float(raw, "min_rating"),
            max_rating=_opt_float(raw, "max_rating"),
            min_reviews=_opt_int(raw, "min_reviews"),
            max_reviews=_opt_int(raw, "max_reviews"),
            has_website=_opt_bool(raw, "has_website"),
            has_phone=_opt_bool(raw, "has_phone"),
            has_email=_opt_bool(raw, "has_email"),
            email_status=email_status,
            has_social=_opt_bool(raw, "has_social"),
            enriched_only=bool(raw.get("enriched_only", False)),
            open_status=open_status,
            keywords_include=_str_list(raw, "keywords_include"),
            keywords_exclude=_str_list(raw, "keywords_exclude"),
            exclude_previously_collected=bool(raw.get("exclude_previously_collected", True)),
            websites_only=bool(raw.get("websites_only", False)),
            contactable_only=bool(raw.get("contactable_only", False)),
            sort_by=sort_by,
            limit=_opt_int(raw, "limit"),
        )

    def to_dict(self) -> dict:
        return asdict(self)

    # ——— derived intent ———

    def wants_website(self) -> Optional[bool]:
        if self.websites_only:
            return True
        return self.has_website

    def uses_enrichment_filters(self) -> bool:
        return bool(
            self.has_email is not None
            or self.email_status
            or self.has_social is not None
            or self.enriched_only
        )


# ————————————————————————————————————————————————————————————
# Stage 1 — discovery filters (data Google Maps exposes directly)
# ————————————————————————————————————————————————————————————


def evaluate_discovery(place: Any, filters: LeadFilters) -> tuple[bool, Optional[str]]:
    """Return ``(keep, reason)`` for a freshly discovered business."""
    company = _text(getattr(place, "company", ""))
    category = _text(getattr(place, "category", ""))
    description = _text(getattr(place, "description", ""))
    haystack = " ".join(
        part
        for part in (
            company,
            category,
            description,
            _text(getattr(place, "address", "")),
            _text(getattr(place, "city", "")),
            _text(getattr(place, "state", "")),
            _text(getattr(place, "country", "")),
        )
        if part
    )

    if filters.category and filters.category.lower() not in category and filters.category.lower() not in company:
        if filters.category.lower() not in haystack:
            return False, f"category does not match “{filters.category}”"

    if filters.country and filters.country.lower() not in _text(getattr(place, "country", "")):
        return False, f"country is not {filters.country}"
    if filters.state and filters.state.lower() not in _text(getattr(place, "state", "")):
        return False, f"state/region is not {filters.state}"
    if filters.city and filters.city.lower() not in _text(getattr(place, "city", "")):
        return False, f"city is not {filters.city}"

    rating = getattr(place, "rating", None)
    if filters.min_rating is not None:
        if rating is None:
            return False, f"no rating (minimum {filters.min_rating})"
        if float(rating) < filters.min_rating:
            return False, f"rating {rating} below {filters.min_rating}"
    if filters.max_rating is not None:
        if rating is None:
            return False, f"no rating (maximum {filters.max_rating})"
        if float(rating) > filters.max_rating:
            return False, f"rating {rating} above {filters.max_rating}"

    reviews = getattr(place, "reviews", None)
    if filters.min_reviews is not None:
        if reviews is None:
            return False, f"no review count (minimum {filters.min_reviews})"
        if int(reviews) < filters.min_reviews:
            return False, f"{reviews} reviews below {filters.min_reviews}"
    if filters.max_reviews is not None:
        if reviews is None:
            return False, f"no review count (maximum {filters.max_reviews})"
        if int(reviews) > filters.max_reviews:
            return False, f"{reviews} reviews above {filters.max_reviews}"

    has_website = _has(getattr(place, "website", None))
    wants_website = filters.wants_website()
    if wants_website is True and not has_website:
        return False, "no website"
    if wants_website is False and has_website:
        return False, "has a website"

    if filters.has_phone is not None:
        has_phone = _has(getattr(place, "phone", None))
        if filters.has_phone and not has_phone:
            return False, "no phone number"
        if filters.has_phone is False and has_phone:
            return False, "has a phone number"

    if filters.contactable_only and not (has_website or _has(getattr(place, "phone", None))):
        return False, "no public contact details"

    if filters.open_status:
        status = _text(getattr(place, "open_status", "")) or "unknown"
        if status not in filters.open_status:
            return False, f"opening status “{status}” not selected"

    for keyword in filters.keywords_include:
        if _text(keyword) not in haystack:
            return False, f"missing keyword “{keyword}”"
    for keyword in filters.keywords_exclude:
        if _text(keyword) in haystack:
            return False, f"contains excluded keyword “{keyword}”"

    return True, None


# ————————————————————————————————————————————————————————————
# Stage 2 — enrichment filters (need email / social discovery)
# ————————————————————————————————————————————————————————————


def evaluate_enrichment(lead: Mapping[str, Any], filters: LeadFilters) -> tuple[bool, Optional[str]]:
    """Return ``(keep, reason)`` for a stored lead after email discovery."""
    email = lead.get("email")
    status = (lead.get("email_status") or "unknown") if lead.get("email_status") is not None else None
    socials = lead.get("social_profiles") or []

    if filters.enriched_only and status is None:
        return False, "not enriched (email status unknown)"

    if filters.has_email is not None:
        if filters.has_email and not email:
            return False, "no email found"
        if filters.has_email is False and email:
            return False, "has an email"

    if filters.email_status:
        if (status or "unknown") not in filters.email_status:
            return False, f"email status “{status or 'unknown'}” not selected"

    if filters.has_social is not None:
        has_social = bool(socials)
        if filters.has_social and not has_social:
            return False, "no social profile found"
        if filters.has_social is False and has_social:
            return False, "has a social profile"

    return True, None


# ————————————————————————————————————————————————————————————
# Sorting
# ————————————————————————————————————————————————————————————


def sort_places(places: Sequence[Any], sort_by: str) -> list[Any]:
    """Order results by the user's choice; ``relevance`` keeps Maps' order."""
    items = list(places)
    if sort_by == "rating":
        return sorted(items, key=lambda p: (getattr(p, "rating", None) or 0.0), reverse=True)
    if sort_by == "reviews":
        return sorted(items, key=lambda p: (getattr(p, "reviews", None) or 0), reverse=True)
    if sort_by == "newest":
        # Discovery order: the most recently collected business first.
        return list(reversed(items))
    return items


def sort_leads(leads: Sequence[Mapping[str, Any]], sort_by: str) -> list[Mapping[str, Any]]:
    items = list(leads)
    if sort_by == "rating":
        return sorted(items, key=lambda l: float(l.get("rating") or 0.0), reverse=True)
    if sort_by == "reviews":
        return sorted(items, key=lambda l: int(l.get("reviews") or 0), reverse=True)
    if sort_by == "newest":
        return sorted(items, key=lambda l: str(l.get("created_at") or ""), reverse=True)
    return items
