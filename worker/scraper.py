"""Zybble's Google Maps discovery engine.

Powered by the open-source **gosom/google-maps-scraper** engine
(https://github.com/gosom/google-maps-scraper, MIT — see
``worker/vendor/UPSTREAM.md``). The engine is a Go binary that drives a real
Chromium browser through the public Google Maps UI with Playwright; Zybble runs
it as a bounded child process and streams its JSONL output
(:mod:`gmaps_engine`). **No Google Maps API key, Places API or Geocoding API is
used anywhere.**

Zybble wraps that engine so it behaves like a professional lead-generation
platform instead of a one-shot CLI:

* **Area coverage** — the requested location is geocoded with OpenStreetMap
  (no Google Geocoding API), tiled into viewports the size of the requested
  radius and swept centre-out, with several query formulations, so "gym in
  Delhi" searches the whole city instead of one locality (``coverage.py``).
* **Batched runs** — coverage targets are handed to the engine a batch at a
  time, so one browser session scrapes several viewports concurrently and the
  crash-safe cursor advances after every batch.
* **Pagination that keeps going** — when a batch returns fewer businesses than
  requested, the sweep simply moves to the next batch; a job is only
  "exhausted" when every planned search has been executed.
* **Live streaming** — results are read from the engine's output file *while it
  still runs*, so leads are stored, counters updated and progress reported per
  business rather than at the end of a sweep.
* **Deduplication** — businesses are keyed by Google place id, canonical Maps
  URL, then normalised name + address, within the job and across resumes.
* **Filtering** — :mod:`filters` evaluates every business before it is stored.
* **Resumability** — :class:`ScrapeState` is JSON-serialisable and is persisted
  by the worker, so a crash, a redeploy or a time budget continues where it
  left off.
* **Contract-safe records** — every field is clipped to the exact limits the
  API's ``leadSchema`` accepts, so one unusually long Google description can
  never fail a batch.
"""

from __future__ import annotations

import math
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional, Sequence
from urllib.parse import quote_plus, urlsplit, urlunsplit

from coverage import (
    CoveragePlan,
    SearchTarget,
    build_coverage,
    iter_batches,
    plan_from_state,
)
from filters import LeadFilters, evaluate_discovery
from gmaps_engine import (
    EngineFailure,
    EngineRun,
    EngineTarget,
    EngineUnavailable,
    GosomEngine,
    upstream_pin,
)

# Stage boundaries (percent) — mirrors the UI stepper:
# Searching → Discovering businesses → Deduplicating → Enriching → Finding emails → Complete
P_SEARCH_START = 4.0
P_SEARCH_END = 34.0
P_COLLECT_END = 68.0
P_DEDUPE = 70.0
P_ENRICH = 76.0

STAGE_SEARCHING = "searching"
STAGE_COLLECTING = "collecting"
STAGE_DEDUPLICATING = "deduplicating"
STAGE_ENRICHING = "enriching"
STAGE_FINDING_EMAILS = "finding_emails"
STAGE_COMPLETE = "complete"

MAX_SEEN_LINKS = 4_000
MAX_SEEN_KEYS = 4_000
DEFAULT_TARGETS_PER_RUN = 6
MAX_TARGETS_PER_RUN = 24
# Google Maps yields roughly a dozen listings per scroll of the results feed,
# so the engine's -depth is derived from how many businesses are still missing.
LISTINGS_PER_SCROLL = 12
# Two consecutive batches with a dead engine are a real failure, not bad luck.
MAX_CONSECUTIVE_ENGINE_FAILURES = 2

# Field limits of the API's leadSchema (api/_lib/routes-worker.ts). Anything
# longer is clipped here so a batch is never rejected for one long string.
LIMIT_COMPANY = 300
LIMIT_CATEGORY = 200
LIMIT_ADDRESS = 500
LIMIT_CITY = 160
LIMIT_STATE = 160
LIMIT_COUNTRY = 160
LIMIT_PHONE = 100
LIMIT_WEBSITE = 1_000
LIMIT_MAPS_URL = 2_000
LIMIT_HOURS = 2_000
LIMIT_DESCRIPTION = 2_000
LIMIT_SOURCE_QUERY = 300
LIMIT_ID = 500
LIMIT_SOCIAL = 500
MAX_SOCIALS = 10
MAX_EMAIL_CANDIDATES = 5

DAY_ORDER = (
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
)

# Google appends tracking/entry parameters to Maps links; the same business can
# appear under several of them across tiles and query variants.
_TRACKING_PARAMS = ("entry=", "g_ep=", "utm_", "sa=", "ved=", "source=", "hl=", "authuser=")
_COORD_RE = re.compile(r"@(-?\d+\.?\d*),(-?\d+\.?\d*)")


class JobTimeout(RuntimeError):
    """The scrape exceeded its time budget; the job is resumable."""


class ChallengeError(RuntimeError):
    """Google served a bot challenge instead of results; the job is resumable."""


# ————————————————————————————————————————————————————————————
# Business record
# ————————————————————————————————————————————————————————————


@dataclass
class Place:
    """One business, exactly as published on Google Maps.

    ``json()`` is the payload contract with ``POST /api/worker/jobs/:id/leads``;
    ``email_candidates`` is worker-internal (addresses the engine read on the
    business's own website) and is never sent unverified.
    """

    company: str
    category: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    country: str = ""
    phone: Optional[str] = None
    website: Optional[str] = None
    maps_url: str = ""
    rating: Optional[float] = None
    reviews: Optional[int] = None
    hours: Optional[str] = None
    open_status: str = "unknown"
    place_id: Optional[str] = None
    external_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    social_profiles: list[str] = field(default_factory=list)
    source_query: str = ""
    description: Optional[str] = None
    email_candidates: list[str] = field(default_factory=list)

    def json(self) -> dict:
        return {
            "company": self.company,
            "category": self.category,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "phone": self.phone,
            "website": self.website,
            "maps_url": self.maps_url,
            "rating": self.rating,
            "reviews": self.reviews,
            "hours": self.hours,
            "open_status": self.open_status,
            "place_id": self.place_id,
            "external_id": self.external_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "social_profiles": list(self.social_profiles),
            "source_query": self.source_query,
            "description": self.description,
        }


def _normalise_name(value: str) -> str:
    text = re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()
    return re.sub(r"\s+", " ", text)


def canonical_place_url(href: str) -> str:
    """Collapse Google's tracking noise so one business has one stable URL.

    The ``data=`` payload (which carries the place id) is preserved because it
    is the strongest identifier Google exposes in a Maps link.
    """
    raw = (href or "").strip()
    if not raw:
        return ""
    try:
        parts = urlsplit(raw)
    except ValueError:
        return raw
    query = parts.query
    if query:
        kept = [
            segment
            for segment in query.split("&")
            if segment and not segment.startswith(_TRACKING_PARAMS)
        ]
        query = "&".join(kept)
    if parts.scheme and parts.netloc:
        return urlunsplit((parts.scheme, parts.netloc, parts.path, query, ""))
    return urlunsplit(("", "", parts.path, query, ""))


def place_key(place: Place) -> str:
    """Stable identity for a business.

    Priority: Google place id → canonical Maps URL → normalised name + address.
    Mirrors ``dedupeKeyFor`` in ``api/_lib/routes-worker.ts`` exactly.
    """
    if place.place_id:
        return f"pid:{place.place_id}"
    canonical = canonical_place_url(place.maps_url)
    if canonical and "/maps/place/" in canonical:
        return f"url:{canonical}"
    name = _normalise_name(place.company)
    address = _normalise_name(place.address)
    return f"na:{name}|{address}"


# ————————————————————————————————————————————————————————————
# Counters & resumable state
# ————————————————————————————————————————————————————————————


@dataclass
class ScrapeStats:
    """Every number the UI reports, in one place."""

    # Invariants, so every number the UI shows reconciles:
    #   discovered == unique + filtered
    #   discovered + duplicates + errors == engine sightings processed
    discovered: int = 0  # distinct businesses identified on Google Maps
    unique: int = 0  # accepted after dedupe + filters
    duplicates: int = 0  # repeat sightings of an already-seen business
    filtered: int = 0  # rejected by the user's filters
    errors: int = 0  # results that could not be read
    targets_total: int = 0
    targets_done: int = 0
    engine_runs: int = 0  # how many times the scraping engine was invoked

    def as_dict(self) -> dict:
        return {
            "discovered": self.discovered,
            "unique": self.unique,
            "duplicates": self.duplicates,
            "filtered": self.filtered,
            "errors": self.errors,
            "targets_total": self.targets_total,
            "targets_done": self.targets_done,
            "engine_runs": self.engine_runs,
        }

    @classmethod
    def from_dict(cls, raw: Optional[dict]) -> "ScrapeStats":
        raw = raw or {}
        return cls(
            discovered=int(raw.get("discovered", 0) or 0),
            unique=int(raw.get("unique", 0) or 0),
            duplicates=int(raw.get("duplicates", 0) or 0),
            filtered=int(raw.get("filtered", 0) or 0),
            errors=int(raw.get("errors", 0) or 0),
            targets_total=int(raw.get("targets_total", 0) or 0),
            targets_done=int(raw.get("targets_done", 0) or 0),
            engine_runs=int(raw.get("engine_runs", 0) or 0),
        )


@dataclass
class ScrapeState:
    """Resumable cursor for one job — JSON-serialisable, stored by the API."""

    target_index: int = 0
    seen_links: list[str] = field(default_factory=list)
    seen_keys: list[str] = field(default_factory=list)
    filtered_keys: list[str] = field(default_factory=list)
    stats: ScrapeStats = field(default_factory=ScrapeStats)
    exhausted: bool = False
    plan: Optional[CoveragePlan] = None
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "target_index": self.target_index,
            "seen_links": list(self.seen_links)[-MAX_SEEN_LINKS:],
            "seen_keys": list(self.seen_keys)[-MAX_SEEN_KEYS:],
            "filtered_keys": list(self.filtered_keys)[-MAX_SEEN_KEYS:],
            "stats": self.stats.as_dict(),
            "exhausted": self.exhausted,
            "plan": self.plan.to_dict() if self.plan else None,
            "notes": list(self.notes)[-20:],
        }

    @classmethod
    def from_dict(cls, raw: Optional[dict]) -> "ScrapeState":
        raw = raw or {}
        plan = plan_from_state(raw) or (CoveragePlan.from_dict(raw["plan"]) if raw.get("plan") else None)
        return cls(
            target_index=int(raw.get("target_index", 0) or 0),
            seen_links=[str(v) for v in raw.get("seen_links", [])],
            seen_keys=[str(v) for v in raw.get("seen_keys", [])],
            filtered_keys=[str(v) for v in raw.get("filtered_keys", [])],
            stats=ScrapeStats.from_dict(raw.get("stats")),
            exhausted=bool(raw.get("exhausted", False)),
            plan=plan,
            notes=[str(v) for v in raw.get("notes", [])],
        )

    def note(self, message: str) -> None:
        if message and message not in self.notes:
            self.notes.append(message[:200])


# ————————————————————————————————————————————————————————————
# Engine entry → Zybble lead
# ————————————————————————————————————————————————————————————


def _clip(value: Any, limit: int) -> str:
    """Trim/collapse a Google-supplied string to the API's column limit."""
    if value is None:
        return ""
    text = re.sub(r"\s+", " ", str(value)).strip()
    return text[:limit].rstrip()


def site_key(website: str) -> str:
    """Host-only key for a website, used to attach engine-found email candidates."""
    return (website or "").strip().lower().split("//")[-1].split("/")[0].split("?")[0]


def _optional(value: Any, limit: int) -> Optional[str]:
    text = _clip(value, limit)
    return text or None


def _optional_number(value: Any) -> Optional[float]:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def split_address(full: str) -> tuple[str, str, str, str]:
    """Fallback street/city/state/country split for a formatted address."""
    parts = [item.strip() for item in (full or "").split(",") if item.strip()]
    if not parts:
        return "", "", "", ""
    street = parts[0]
    tail = parts[1:]
    if not tail:
        return street, "", "", ""
    if len(tail) == 1:
        return street, tail[0], "", ""
    country = tail[-1]
    state = re.sub(r"\s+\d[\d\s-]*$", "", tail[-2]).strip()
    city_candidates = tail[:-2]
    city = city_candidates[-1] if city_candidates else ""
    if re.fullmatch(r"\d{4,8}", city or ""):
        city = city_candidates[-2] if len(city_candidates) > 1 else ""
    return street, city, state, country


def format_hours(open_hours: Any) -> Optional[str]:
    """Render the engine's ``open_hours`` map as one stable, readable string."""
    if not isinstance(open_hours, dict) or not open_hours:
        return None
    days = [day for day in DAY_ORDER if day in open_hours]
    days += [day for day in open_hours if day not in DAY_ORDER]
    parts: list[str] = []
    for day in days:
        slots = open_hours.get(day)
        if isinstance(slots, str):
            slots = [slots]
        if not isinstance(slots, (list, tuple)) or not slots:
            continue
        rendered = ", ".join(_clip(slot, 120) for slot in slots if _clip(slot, 120))
        if rendered:
            parts.append(f"{_clip(day, 20)}: {rendered}")
    return _clip("; ".join(parts), LIMIT_HOURS) or None


def map_open_status(status: Any) -> str:
    """Google's free-text status → the four values the lead schema allows."""
    text = _clip(status, 200).lower()
    if not text:
        return "unknown"
    if "permanently closed" in text or text == "closed_permanently":
        return "permanently_closed"
    if "temporarily closed" in text:
        return "closed"
    if text.startswith("open") or "open ⋅" in text or "· open" in text or text == "open":
        return "open"
    if text.startswith("closed") or text == "closed":
        return "closed"
    return "unknown"


def _coordinates(entry: dict) -> tuple[Optional[float], Optional[float]]:
    latitude = _optional_number(entry.get("latitude"))
    # Upstream emits the misspelled legacy key "longtitude" *and* "longitude".
    longitude = _optional_number(entry.get("longitude"))
    if longitude is None:
        longitude = _optional_number(entry.get("longtitude"))
    if latitude is not None and not -90.0 <= latitude <= 90.0:
        latitude = None
    if longitude is not None and not -180.0 <= longitude <= 180.0:
        longitude = None
    return (None if latitude in (None, 0.0) else round(latitude, 7),
            None if longitude in (None, 0.0) else round(longitude, 7))


def _rating(entry: dict) -> Optional[float]:
    value = _optional_number(entry.get("review_rating"))
    if value is None or value <= 0.0:
        return None
    return round(min(5.0, value), 1)


def _reviews(entry: dict) -> Optional[int]:
    value = _optional_number(entry.get("review_count"))
    if value is None or value <= 0:
        return None
    return int(value)


def _address_fields(entry: dict) -> tuple[str, str, str, str]:
    complete = entry.get("complete_address")
    if isinstance(complete, dict):
        street = _clip(complete.get("street"), LIMIT_ADDRESS)
        borough = _clip(complete.get("borough"), LIMIT_CITY)
        city = _clip(complete.get("city"), LIMIT_CITY) or borough
        state = _clip(complete.get("state"), LIMIT_STATE)
        country = _clip(complete.get("country"), LIMIT_COUNTRY)
        if street or city or state or country:
            if not street:
                street = _clip(entry.get("address"), LIMIT_ADDRESS)
            return street, city, state, country
    return split_address(_clip(entry.get("address"), LIMIT_ADDRESS))


def entry_to_place(entry: dict, source_query: str = "") -> Optional[Place]:
    """Map one `gosom/google-maps-scraper` entry onto Zybble's lead record.

    Returns ``None`` for an entry without a business name — the engine already
    skips those, and Zybble never invents a company name.
    """
    if not isinstance(entry, dict):
        return None
    company = _clip(entry.get("title"), LIMIT_COMPANY)
    if not company:
        return None

    categories = entry.get("categories")
    category = _clip(entry.get("category"), LIMIT_CATEGORY)
    if not category and isinstance(categories, (list, tuple)) and categories:
        category = _clip(categories[0], LIMIT_CATEGORY)

    address, city, state, country = _address_fields(entry)
    latitude, longitude = _coordinates(entry)

    place_id = _optional(entry.get("place_id"), LIMIT_ID)
    cid = _optional(entry.get("cid"), LIMIT_ID)
    data_id = _optional(entry.get("data_id"), LIMIT_ID)

    maps_url = _clip(entry.get("link"), LIMIT_MAPS_URL)
    if not maps_url and place_id:
        maps_url = _clip(f"https://www.google.com/maps/place/?q=place_id:{place_id}", LIMIT_MAPS_URL)

    emails: list[str] = []
    raw_emails = entry.get("emails")
    if isinstance(raw_emails, (list, tuple)):
        for raw in raw_emails:
            text = _clip(raw, 320).lower()
            if text and "@" in text and text not in emails:
                emails.append(text)
            if len(emails) >= MAX_EMAIL_CANDIDATES:
                break
    elif isinstance(raw_emails, str) and "@" in raw_emails:
        emails = [_clip(raw_emails, 320).lower()]

    if not latitude and not longitude:
        match = _COORD_RE.search(maps_url or "")
        if match:
            latitude, longitude = _coordinates({"latitude": match.group(1), "longitude": match.group(2)})

    return Place(
        company=company,
        category=category,
        address=address,
        city=city,
        state=state,
        country=country,
        phone=_optional(entry.get("phone"), LIMIT_PHONE),
        website=_optional(entry.get("web_site") or entry.get("website"), LIMIT_WEBSITE),
        maps_url=maps_url,
        rating=_rating(entry),
        reviews=_reviews(entry),
        hours=format_hours(entry.get("open_hours")),
        open_status=map_open_status(entry.get("status")),
        place_id=place_id or cid or data_id,
        external_id=cid or data_id or place_id,
        latitude=latitude,
        longitude=longitude,
        social_profiles=[],
        source_query=_clip(source_query, LIMIT_SOURCE_QUERY),
        description=_optional(entry.get("description"), LIMIT_DESCRIPTION),
        email_candidates=emails[:MAX_EMAIL_CANDIDATES],
    )


# ————————————————————————————————————————————————————————————
# The engine
# ————————————————————————————————————————————————————————————


def _trim(values: list[str], maximum: int) -> list[str]:
    return values[-maximum:] if len(values) > maximum else values


def _check(deadline: float) -> None:
    if time.monotonic() >= deadline:
        raise JobTimeout("The scrape exceeded its job time budget; it will resume from the saved cursor.")


def targets_per_run(configured: Optional[int] = None) -> int:
    """How many coverage targets one engine invocation receives."""
    raw = configured if configured is not None else os.environ.get("SCRAPER_TARGETS_PER_RUN")
    try:
        value = int(str(raw if raw is not None else DEFAULT_TARGETS_PER_RUN).strip())
    except (TypeError, ValueError):
        value = DEFAULT_TARGETS_PER_RUN
    return max(1, min(MAX_TARGETS_PER_RUN, value))


def depth_for(remaining: int, batch_size: int, maximum: int) -> int:
    """Scroll depth per target: enough for what is missing, never more."""
    needed = math.ceil(max(1, remaining) * 1.5 / max(1, batch_size))
    depth = math.ceil(needed / LISTINGS_PER_SCROLL)
    return max(1, min(max(1, maximum), depth))


def _batch_note(batch: Sequence[SearchTarget]) -> str:
    if len(batch) == 1:
        return f"Searching {batch[0].label}"
    return f"Searching {len(batch)} viewports · {batch[0].label}"


def collect_percent(unique: int, wanted: int, targets_done: int, targets_total: int) -> float:
    """Overall sweep progress: whichever of leads/coverage advanced furthest.

    Both inputs only ever grow, so the reported percentage is monotonic — the
    UI stepper never moves backwards.
    """
    span = P_COLLECT_END - P_SEARCH_START
    lead_frac = min(1.0, max(0, unique) / max(1, wanted))
    coverage_frac = min(1.0, max(0, targets_done) / max(1, targets_total))
    return P_SEARCH_START + span * max(lead_frac, coverage_frac)


@dataclass
class ScrapeResult:
    state: ScrapeState
    places: list[Place] = field(default_factory=list)
    exhausted: bool = False
    message: str = ""
    runs: list[EngineRun] = field(default_factory=list)
    #: website host → addresses the engine read on that site (only when the
    #: engine's own email extraction is enabled). Verified before use.
    email_candidates: dict[str, list[str]] = field(default_factory=dict)

    @property
    def stats(self) -> ScrapeStats:
        return self.state.stats


def run_scrape(
    query: str,
    location: str,
    radius_meters: int,
    limit: int,
    timeout_seconds: int,
    filters: Optional[LeadFilters] = None,
    state: Optional[ScrapeState] = None,
    on_stage: Optional[Callable[[str, float, ScrapeStats, str], None]] = None,
    on_place: Optional[Callable[[Place, int, int], None]] = None,
    on_state: Optional[Callable[[ScrapeState], None]] = None,
    engine: Optional[GosomEngine] = None,
    geocoder: Optional[Callable[[str], Any]] = None,
    max_tiles: Optional[int] = None,
    targets_per_batch: Optional[int] = None,
    sleep: Callable[[float], None] = time.sleep,
    should_stop: Optional[Callable[[], bool]] = None,
) -> ScrapeResult:
    """Run one bounded Google Maps sweep and return the businesses found.

    Never raises for an individual business: unusable results increment
    ``stats.errors`` and the sweep continues. Only a hard deadline
    (:class:`JobTimeout`), a Google challenge (:class:`ChallengeError`) or a
    repeatedly failing engine (:class:`EngineFailure`) aborts the slice — all of
    them resumable through :class:`ScrapeState`.
    """
    filters = filters or LeadFilters()
    state = state or ScrapeState()
    engine = engine or GosomEngine.from_env(sleep=sleep)
    deadline = time.monotonic() + max(60, timeout_seconds)
    wanted = max(1, limit)

    plan = state.plan
    if plan is None or not plan.targets:
        plan = build_coverage(
            query=query,
            location=location,
            radius_meters=radius_meters,
            max_tiles=max_tiles or int(os.environ.get("SCRAPER_MAX_TILES", "36")),
            geocode=geocoder,
        )
        state.plan = plan
        if plan.degraded and plan.note:
            state.note(plan.note)

    stats = state.stats
    stats.targets_total = plan.total
    seen_links = set(state.seen_links)
    seen_keys = set(state.seen_keys)
    filtered_keys = set(state.filtered_keys)

    collected: list[Place] = []
    email_candidates: dict[str, list[str]] = {}
    runs: list[EngineRun] = []
    batch_size = targets_per_run(targets_per_batch)
    last_percent = [0.0]

    def emit(stage: str, percent: float, message: str) -> None:
        if not on_stage:
            return
        # Progress only ever moves forward, whichever stage reports it.
        value = max(last_percent[0], max(1.0, min(99.0, percent)))
        last_percent[0] = value
        on_stage(stage, value, stats, message)

    def persist(index: int) -> None:
        state.target_index = index
        stats.targets_done = min(plan.total, index)
        state.seen_links = _trim(sorted(link for link in seen_links if link), MAX_SEEN_LINKS)
        state.seen_keys = _trim(sorted(seen_keys), MAX_SEEN_KEYS)
        state.filtered_keys = _trim(sorted(filtered_keys), MAX_SEEN_KEYS)
        if on_state:
            try:
                on_state(state)
            except Exception:  # noqa: BLE001 - persistence must not kill the scrape
                pass

    if state.target_index >= plan.total:
        state.exhausted = True
        return ScrapeResult(
            state=state, places=[], exhausted=True,
            message="Search coverage already exhausted.", runs=runs,
        )

    consecutive_failures = 0
    remaining_targets = plan.targets[state.target_index:]

    for batch in iter_batches(remaining_targets, batch_size):
        if stats.unique >= wanted:
            break
        if should_stop is not None and should_stop():
            persist(state.target_index)
            raise JobTimeout("Worker received a shutdown signal; the job will resume from the saved cursor.")
        _check(deadline)

        index = state.target_index
        remaining = wanted - stats.unique
        depth = depth_for(remaining, len(batch), engine.depth)

        stats.targets_done = index
        emit(
            STAGE_SEARCHING,
            P_SEARCH_START + (index / max(1, plan.total)) * (P_SEARCH_END - P_SEARCH_START),
            _batch_note(batch),
        )

        def on_entry(entry: dict, label: str) -> Any:
            place = entry_to_place(entry, source_query=label or batch[0].label)
            if place is None:
                stats.errors += 1
                return True

            key = place_key(place)
            if key in seen_keys or key in filtered_keys:
                # Same business under another viewport or query wording.
                stats.duplicates += 1
                emit(
                    STAGE_COLLECTING,
                    collect_percent(stats.unique, wanted, index, plan.total),
                    f"Deduplicating · {stats.unique} unique so far",
                )
                return True

            stats.discovered += 1
            keep, _reason = evaluate_discovery(place, filters)
            if not keep:
                stats.filtered += 1
                filtered_keys.add(key)
                return True

            seen_keys.add(key)
            canonical = canonical_place_url(place.maps_url)
            if canonical:
                seen_links.add(canonical)
            stats.unique += 1
            collected.append(place)
            if place.email_candidates and place.website:
                site = site_key(place.website)
                bucket = email_candidates.setdefault(site, [])
                for address in place.email_candidates:
                    if address not in bucket:
                        bucket.append(address)
            if on_place:
                on_place(place, stats.unique, wanted)
            emit(
                STAGE_COLLECTING,
                collect_percent(stats.unique, wanted, index, plan.total),
                f"Discovering businesses · {stats.unique}/{wanted}",
            )
            # Asking the engine to stop early keeps a big sweep from scraping
            # viewports whose results would be thrown away.
            return stats.unique < wanted

        run = engine.scrape(
            [EngineTarget.from_search_target(target, f"t{position}") for position, target in enumerate(batch)],
            deadline=deadline,
            on_entry=on_entry,
            on_note=state.note,
            should_stop=should_stop,
            depth=depth,
        )
        runs.append(run)
        stats.engine_runs += 1
        stats.errors += run.malformed + run.skipped

        if run.timed_out or run.interrupted:
            # Keep the cursor at the start of this batch: it is re-run on the
            # next slice, and dedupe makes the overlap free.
            persist(index)
            reason = "shutdown signal" if run.interrupted else "job time budget"
            raise JobTimeout(f"The scrape reached its {reason}; it will resume from the saved cursor.")

        if run.challenge and run.emitted == 0:
            persist(index)
            raise ChallengeError("Google Maps presented a traffic challenge; the job will retry with a fresh session.")

        if run.failed:
            consecutive_failures += 1
            stats.errors += 1
            state.note(
                f"The scraping engine exited with code {run.exit_code} for {len(batch)} viewport(s); "
                "the batch will be retried."
            )
            persist(index)
            if consecutive_failures >= MAX_CONSECUTIVE_ENGINE_FAILURES:
                raise EngineFailure(
                    f"The scraping engine failed {consecutive_failures} batches in a row "
                    f"(last exit code {run.exit_code})."
                )
            continue

        consecutive_failures = 0
        persist(index + len(batch))

    state.exhausted = state.target_index >= plan.total or stats.unique >= wanted
    stats.targets_done = min(plan.total, state.target_index)
    message = (
        f"Coverage complete: {stats.targets_done}/{plan.total} searches"
        if state.target_index >= plan.total
        else f"Collected {stats.unique} unique businesses"
    )
    emit(STAGE_DEDUPLICATING, P_DEDUPE, message)
    return ScrapeResult(
        state=state,
        places=collected,
        exhausted=bool(state.target_index >= plan.total or stats.unique >= wanted),
        message=message,
        runs=runs,
        email_candidates=email_candidates,
    )


def engine_summary(engine: Optional[GosomEngine] = None) -> dict:
    """What the worker logs at boot: which engine, which version, which pin."""
    engine = engine or GosomEngine.from_env()
    pin = upstream_pin()
    try:
        binary = engine.resolve_binary()
    except EngineUnavailable as err:
        return {"available": False, "error": str(err), "upstream": pin.get("upstream", "")}
    return {
        "available": True,
        "binary": binary,
        "version": engine.version(),
        "upstream": pin.get("upstream", ""),
        "engine_version": pin.get("version", ""),
        "engine_commit": pin.get("commit", ""),
        "concurrency": engine.concurrency,
        "browser_pool_size": engine.browser_pool_size,
        "pages_per_browser": engine.pages_per_browser,
        "depth": engine.depth,
        "extract_email": engine.extract_email,
    }


def build_search_url(query: str, location: str) -> str:
    """Convenience: the plain text-search URL (no coordinates)."""
    return f"https://www.google.com/maps/search/{quote_plus(f'{query} in {location}')}"


__all__ = [
    "ChallengeError",
    "CoveragePlan",
    "EngineFailure",
    "EngineRun",
    "EngineTarget",
    "EngineUnavailable",
    "GosomEngine",
    "JobTimeout",
    "LeadFilters",
    "Place",
    "ScrapeResult",
    "ScrapeState",
    "ScrapeStats",
    "SearchTarget",
    "build_coverage",
    "build_search_url",
    "canonical_place_url",
    "collect_percent",
    "depth_for",
    "engine_summary",
    "entry_to_place",
    "evaluate_discovery",
    "format_hours",
    "map_open_status",
    "place_key",
    "run_scrape",
    "site_key",
    "split_address",
    "targets_per_run",
]
