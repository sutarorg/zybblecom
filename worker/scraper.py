"""Zybble's Google Maps discovery engine.

Built on the vendored two-phase core of **SoCloseSociety/GoogleMapScraper**
(``worker/vendor/googlemapscraper.py``, MIT):

    Phase 1  smart-scroll the Google Maps results feed and collect the unique
             ``/maps/place/`` URLs it can reach  (``vendor.collect_links``)
    Phase 2  visit each URL and read the public business panel
             (``vendor.extract_details``)

Zybble extends that engine so it behaves like a professional lead-generation
platform instead of a one-shot scraper:

* **Area coverage** — the requested location is geocoded with OpenStreetMap
  (no Google Geocoding API), tiled into viewports the size of the requested
  radius and swept centre-out, with several query formulations, so "gym in
  Delhi" searches the whole city instead of one locality.
* **Pagination that keeps going** — when a batch returns fewer businesses than
  requested, the engine simply moves to the next search target; a job is only
  "exhausted" when every planned search has been executed.
* **Deduplication** — businesses are keyed by Maps place id, canonical Maps URL,
  then normalised name + address, within the job and across resumes.
* **Filtering** — :mod:`filters` evaluates every business before it is stored.
* **Resumability** — :class:`ScrapeState` is JSON-serialisable and is persisted
  by the worker, so a crash or redeploy continues where it left off.
* **Bounded and clean** — one deadline for the whole session, and the browser is
  always quit in a ``finally`` block.

No Google Maps API key, Places API or Geocoding API is used anywhere.
"""

from __future__ import annotations

import os
import random
import re
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional
from urllib.parse import quote_plus

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

from vendor.googlemapscraper import (
    canonical_place_url,
    collect_links,
    extract_details,
    looks_like_challenge,
    place_id_from_url,
)

from coverage import (
    CoveragePlan,
    SearchTarget,
    build_coverage,
    geocode_location,
    plan_from_state,
)
from filters import LeadFilters, evaluate_discovery

PAGE_TIMEOUT = 20
SCROLL_PAUSE = 1.2
MAX_STALLS = 8
MAX_SEEN_LINKS = 4_000
MAX_SEEN_KEYS = 4_000

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


class SelectorChangedError(RuntimeError):
    """Google Maps loaded but no known results layout was recognised."""


class JobTimeout(RuntimeError):
    """The scrape exceeded its time budget; the job is resumable."""


class ChallengeError(RuntimeError):
    """Google served a bot challenge instead of results."""


# ————————————————————————————————————————————————————————————
# Business record
# ————————————————————————————————————————————————————————————


@dataclass
class Place:
    """One business, exactly as published on Google Maps."""

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


def place_key(place: Place) -> str:
    """Stable identity for a business.

    Priority: Google place id → canonical Maps URL → normalised name + address.
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
    #   discovered + duplicates + errors == business sightings processed
    discovered: int = 0  # distinct businesses identified on Google Maps
    unique: int = 0  # accepted after dedupe + filters
    duplicates: int = 0  # repeat sightings of an already-seen business
    filtered: int = 0  # rejected by the user's filters
    errors: int = 0  # pages that could not be read
    targets_total: int = 0
    targets_done: int = 0

    def as_dict(self) -> dict:
        return {
            "discovered": self.discovered,
            "unique": self.unique,
            "duplicates": self.duplicates,
            "filtered": self.filtered,
            "errors": self.errors,
            "targets_total": self.targets_total,
            "targets_done": self.targets_done,
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
# Browser
# ————————————————————————————————————————————————————————————


def _driver() -> webdriver.Chrome:
    options = Options()
    for arg in (
        "--headless=new",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1440,1000",
        "--lang=en-US",
        "--disable-blink-features=AutomationControlled",
        "--disable-background-networking",
        "--disable-extensions",
        "--no-first-run",
        "--no-default-browser-check",
    ):
        options.add_argument(arg)
    options.add_argument(
        "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    )
    # Docker image: system chromedriver. Local machine: CHROMEDRIVER_PATH or
    # Selenium Manager auto-resolution. Never hard-fail on one location.
    service = None
    if os.path.exists("/usr/bin/chromedriver"):
        service = Service("/usr/bin/chromedriver")
    elif os.environ.get("CHROMEDRIVER_PATH"):
        service = Service(os.environ["CHROMEDRIVER_PATH"])
    driver = (
        webdriver.Chrome(service=service, options=options)
        if service
        else webdriver.Chrome(options=options)
    )
    driver.set_page_load_timeout(PAGE_TIMEOUT + 15)
    return driver


def _dismiss_consent(driver) -> None:
    """Best-effort click through Google's cookie/consent interstitial."""
    from selenium.webdriver.common.by import By  # local import: keeps module import cheap

    for selector in (
        "button[aria-label*='Accept all']",
        "button[aria-label*='Reject all']",
        "form[action*='consent'] button",
        "button[jsname='b3VHJd']",
    ):
        try:
            driver.find_element(By.CSS_SELECTOR, selector).click()
            time.sleep(random.uniform(0.3, 0.7))
            return
        except Exception:  # noqa: BLE001 - consent UI differs by region
            continue


# ————————————————————————————————————————————————————————————
# Phase 2 extras (Zybble fields beyond the upstream panel)
# ————————————————————————————————————————————————————————————

_COORD_RE = re.compile(r"@(-?\d+\.\d+),(-?\d+\.\d+)")
_REVIEWS_RE = re.compile(r"([\d,\.]+)\s*(?:reviews?|Google reviews?)", re.I)
_RATING_RE = re.compile(r"([0-5](?:[.,]\d)?)")
_CLOSED_WORDS = ("permanently closed", "temporarily closed", "closed permanently")
_OPEN_RE = re.compile(r"\b(open|closed)\s*(?:⋅|·|-|\|)?\s*(?:\w[\w\s:]*)$", re.I)


def _address_parts(full: str, fallback_location: str = "") -> tuple[str, str, str, str]:
    """Split a Google-formatted address into street / city / state / country."""
    parts = [item.strip() for item in (full or "").split(",") if item.strip()]
    if not parts:
        parts = [item.strip() for item in fallback_location.split(",") if item.strip()]
    if not parts:
        return "", "", "", ""

    street = parts[0]
    city = ""
    state = ""
    country = ""

    tail = parts[1:]
    if len(parts) == 1:
        return street, "", "", ""
    if len(tail) == 1:
        city = tail[0]
    else:
        # Common Google shapes:
        #   street, city, state postal, country
        #   street, area, city, state postal, country
        country = tail[-1]
        state_raw = tail[-2]
        state = re.sub(r"\s+\d[\d\s-]*$", "", state_raw).strip()
        city_candidates = tail[:-2]
        city = city_candidates[-1] if city_candidates else ""
        # Drop a postal code that ended up in the city slot.
        if re.fullmatch(r"\d{4,8}", city):
            city = city_candidates[-2] if len(city_candidates) > 1 else ""
    return street, city, state, country


def _soup_extras(soup: BeautifulSoup) -> dict:
    """Read rating, reviews, category, hours and opening status from the panel."""
    extras: dict[str, Any] = {
        "rating": None,
        "reviews": None,
        "category": "",
        "hours": None,
        "open_status": "unknown",
        "phone": None,
        "address": None,
        "website": None,
    }

    text_blob = soup.get_text(" ", strip=True)

    # — rating —
    for class_name in ("F7nice", "-fdtn5c", "jANrlb"):
        node = soup.find("div", class_=class_name)
        if node:
            match = _RATING_RE.search(node.get_text(" ", strip=True))
            if match:
                try:
                    value = float(match.group(1).replace(",", "."))
                    if 0.0 <= value <= 5.0:
                        extras["rating"] = round(value, 1)
                        break
                except ValueError:
                    pass

    # — review count —
    for node in soup.find_all(["button", "span", "div"], attrs={"aria-label": True}):
        label = node.get("aria-label", "")
        if "review" in label.lower():
            match = _REVIEWS_RE.search(label)
            if match:
                try:
                    extras["reviews"] = int(float(match.group(1).replace(",", "")))
                    break
                except ValueError:
                    continue
    if extras["reviews"] is None:
        match = re.search(r"\(([\d,]{1,12})\)", text_blob)
        if match:
            try:
                extras["reviews"] = int(match.group(1).replace(",", ""))
            except ValueError:
                pass

    # — category —
    for node in soup.find_all("button", attrs={"jsaction": True}):
        if "category" in node.get("jsaction", ""):
            value = node.get_text(" ", strip=True)
            if value:
                extras["category"] = value
                break
    if not extras["category"]:
        for node in soup.find_all("button", class_="DkEaL"):
            value = node.get_text(" ", strip=True)
            if value:
                extras["category"] = value
                break

    # — hours —
    for node in soup.find_all("button", attrs={"data-item-id": True}):
        if node.get("data-item-id", "").startswith("oh"):
            label = node.get("aria-label") or node.get_text(" ", strip=True)
            if label:
                extras["hours"] = re.sub(r"\s+", " ", str(label))[:2000]
                break
    if not extras["hours"]:
        for node in soup.find_all("div", attrs={"aria-label": True}):
            label = node.get("aria-label", "")
            if "opening hours" in label.lower() or "open hours" in label.lower():
                extras["hours"] = label.split(".")[0].replace(",", " -> ")[:2000]
                break

    # — opening status —
    lowered = text_blob.lower()
    if any(phrase in lowered for phrase in _CLOSED_WORDS):
        extras["open_status"] = "permanently_closed"
    else:
        for node in soup.find_all(["span", "div"], class_=re.compile(r"ZDu9vd|o0Svhf|dpxINe|WgFkxc")):
            value = node.get_text(" ", strip=True)
            if not value:
                continue
            head = value.split("⋅")[0].split("·")[0].strip().lower()
            if head.startswith("open"):
                extras["open_status"] = "open"
                break
            if head.startswith("closed") or head.startswith("temporarily closed"):
                extras["open_status"] = "closed"
                break
        if extras["open_status"] == "unknown":
            match = re.search(r"\b(Open|Closed)\b\s*(?:⋅|·)?\s*(?:Closes|Opens|24 hours)?", text_blob)
            if match:
                extras["open_status"] = "open" if match.group(1).lower() == "open" else "closed"

    # — fallbacks for phone / address / website —
    for node in soup.find_all("button", attrs={"aria-label": True}):
        label = node.get("aria-label", "")
        if label.startswith("Phone:") and not extras["phone"]:
            extras["phone"] = label.replace("Phone:", "", 1).strip()
        if label.startswith("Address:") and not extras["address"]:
            extras["address"] = label.replace("Address:", "", 1).strip()
    for node in soup.find_all("a", attrs={"aria-label": True}):
        label = node.get("aria-label", "")
        if label.startswith("Website:") and node.get("href"):
            extras["website"] = node.get("href")

    return extras


def extract_place(
    driver,
    url: str,
    source_query: str = "",
    fallback_location: str = "",
    timeout: int = PAGE_TIMEOUT,
    sleep: Callable[[float], None] = time.sleep,
) -> Optional[Place]:
    """Phase 2 for one business: upstream panel + Zybble extras."""
    details = extract_details(driver, url, wait_timeout=timeout)
    company = (details.get("name") or "").strip()
    if not company:
        return None

    soup = BeautifulSoup(driver.page_source, "html.parser")
    extras = _soup_extras(soup)

    current = getattr(driver, "current_url", "") or url
    place_id = place_id_from_url(current) or place_id_from_url(url)
    maps_url = current.split("?authuser=")[0] or url

    address = details.get("address") or extras.get("address") or ""
    street, city, state, country = _address_parts(address, fallback_location)

    latitude = longitude = None
    match = _COORD_RE.search(current)
    if match:
        try:
            latitude = float(match.group(1))
            longitude = float(match.group(2))
        except ValueError:
            latitude = longitude = None

    phone = details.get("phone") or extras.get("phone")
    website = details.get("website") or extras.get("website")
    hours = extras.get("hours") or details.get("schedule")

    return Place(
        company=company,
        category=(extras.get("category") or "").strip(),
        address=street,
        city=city,
        state=state,
        country=country,
        phone=(phone or None),
        website=(website or None),
        maps_url=maps_url,
        rating=extras.get("rating"),
        reviews=extras.get("reviews"),
        hours=hours,
        open_status=extras.get("open_status") or "unknown",
        place_id=place_id,
        external_id=place_id,
        latitude=latitude,
        longitude=longitude,
        source_query=source_query,
    )


# ————————————————————————————————————————————————————————————
# The engine
# ————————————————————————————————————————————————————————————


def _trim(values: list[str], maximum: int) -> list[str]:
    return values[-maximum:] if len(values) > maximum else values


def _sleep(low: float = 0.6, high: float = 1.6) -> None:
    time.sleep(random.uniform(low, high))


def _check(deadline: float) -> None:
    if time.monotonic() >= deadline:
        raise JobTimeout("The scrape exceeded its job time budget; it will resume from the saved cursor.")


@dataclass
class ScrapeResult:
    state: ScrapeState
    places: list[Place] = field(default_factory=list)
    exhausted: bool = False
    message: str = ""

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
    driver_factory: Callable[[], Any] = _driver,
    geocoder: Optional[Callable[[str], Any]] = None,
    max_tiles: Optional[int] = None,
    page_timeout: int = PAGE_TIMEOUT,
    sleep: Callable[[float], None] = time.sleep,
    driver: Any = None,
) -> ScrapeResult:
    """Run one bounded Google Maps session and return the businesses found.

    Never raises for an individual business: unreadable pages increment
    ``stats.errors`` and the sweep continues. Only a hard deadline
    (:class:`JobTimeout`) or a Google challenge (:class:`ChallengeError`)
    aborts the session — both are resumable via :class:`ScrapeState`.
    """
    filters = filters or LeadFilters()
    state = state or ScrapeState()
    deadline = time.monotonic() + max(60, timeout_seconds)

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

    def emit(stage: str, percent: float, message: str) -> None:
        if on_stage:
            on_stage(stage, max(1.0, min(99.0, percent)), stats, message)

    def persist(index: int) -> None:
        state.target_index = index
        state.seen_links = _trim(sorted(seen_links), MAX_SEEN_LINKS)
        state.seen_keys = _trim(sorted(seen_keys), MAX_SEEN_KEYS)
        state.filtered_keys = _trim(sorted(filtered_keys), MAX_SEEN_KEYS)
        if on_state:
            try:
                on_state(state)
            except Exception:  # noqa: BLE001 - persistence must not kill the scrape
                pass

    if state.target_index >= plan.total:
        state.exhausted = True
        return ScrapeResult(state=state, places=[], exhausted=True, message="Search coverage already exhausted.")

    own_driver = driver is None
    if own_driver:
        driver = driver_factory()
    try:
        # Google sometimes shows a consent interstitial on the first search;
        # clicking it once keeps the results feed reachable.
        try:
            _dismiss_consent(driver)
        except Exception:  # noqa: BLE001 - consent UI is region-specific
            pass

        for index in range(state.target_index, plan.total):
            if stats.unique >= max(1, limit):
                break
            _check(deadline)
            target: SearchTarget = plan.targets[index]
            stats.targets_done = index
            emit(STAGE_SEARCHING, P_SEARCH_START + (index / max(1, plan.total)) * (P_SEARCH_END - P_SEARCH_START),
                 f"Searching {target.label}")

            # — Phase 1: collect this viewport's result links —
            per_target_cap = max(20, min(150, max(1, limit) * 4))
            try:
                links = collect_links(
                    driver,
                    target.url,
                    max_links=per_target_cap,
                    deadline=deadline,
                    pause=SCROLL_PAUSE,
                    max_stalls=MAX_STALLS,
                    wait_timeout=page_timeout,
                    sleep=sleep,
                )
            except WebDriverException as err:
                stats.errors += 1
                state.note(f"Result page unavailable for {target.label}: {err.__class__.__name__}")
                persist(index + 1)
                continue

            if not links and looks_like_challenge(getattr(driver, "page_source", "") or ""):
                stats.errors += 1
                state.note("Google presented a traffic challenge; retrying with a clean session.")
                raise ChallengeError("Google Maps presented a traffic challenge; the job will retry.")

            # A business already returned by an earlier viewport is a repeat
            # sighting, not a new discovery: skip it and count it once.
            repeat_links = [link for link in links if link in seen_links]
            stats.duplicates += len(repeat_links)
            new_links = [link for link in links if link not in seen_links]
            for link in new_links:
                seen_links.add(link)

            # — Phase 2: visit each new business —
            total_new = len(new_links)
            for position, link in enumerate(new_links, start=1):
                if stats.unique >= max(1, limit):
                    break
                try:
                    _check(deadline)
                    # Pause between business pages: fast enough to fill a
                    # 50-lead search in one slice, slow enough to stay a
                    # well-behaved visitor of Google Maps.
                    sleep(random.uniform(0.8, 2.0))
                    place = extract_place(
                        driver,
                        link,
                        source_query=target.label,
                        fallback_location=location,
                        timeout=page_timeout,
                    )
                except JobTimeout:
                    raise
                except Exception as err:  # noqa: BLE001 - one bad page must not stop the sweep
                    stats.errors += 1
                    state.note(f"Could not read a business page: {err.__class__.__name__}")
                    continue

                if place is None or not place.company:
                    stats.errors += 1
                    continue

                key = place_key(place)
                if key in seen_keys or key in filtered_keys:
                    # Same business under a different URL (maps tracking
                    # parameters, or a second viewport) — count it once.
                    stats.duplicates += 1
                    emit(STAGE_COLLECTING, _percent(index, plan.total, position, total_new),
                         f"Deduplicating · {stats.unique} unique so far")
                    continue

                # First time this business has been identified.
                stats.discovered += 1

                keep, reason = evaluate_discovery(place, filters)
                if not keep:
                    stats.filtered += 1
                    filtered_keys.add(key)
                    continue

                seen_keys.add(key)
                stats.unique += 1
                collected.append(place)
                if on_place:
                    on_place(place, stats.unique, max(1, limit))

                emit(STAGE_COLLECTING, _percent(index, plan.total, position, total_new),
                     f"Discovering businesses · {stats.unique}/{limit}")

            persist(index + 1)

        state.exhausted = state.target_index >= plan.total or stats.unique >= max(1, limit)
        stats.targets_done = min(plan.total, state.target_index)
        message = (
            f"Coverage complete: {stats.targets_done}/{plan.total} searches"
            if state.target_index >= plan.total
            else f"Collected {stats.unique} unique businesses"
        )
        emit(STAGE_DEDUPLICATING, P_DEDUPE, message)
        return ScrapeResult(state=state, places=collected, exhausted=bool(state.target_index >= plan.total), message=message)
    finally:
        if own_driver:
            try:
                driver.quit()
            except Exception:  # noqa: BLE001
                pass


def _percent(target_index: int, total_targets: int, position: int, total_positions: int) -> float:
    """Blend target progress and within-target progress into one percentage."""
    span = P_COLLECT_END - P_SEARCH_START
    target_frac = (target_index / max(1, total_targets)) * span
    inner_frac = (position / max(1, total_positions)) * (span / max(1, total_targets))
    return P_SEARCH_START + min(span, target_frac + inner_frac)


def build_search_url(query: str, location: str) -> str:
    """Convenience: the plain text-search URL (no coordinates)."""
    return f"https://www.google.com/maps/search/{quote_plus(f'{query} in {location}')}"


__all__ = [
    "ChallengeError",
    "CoveragePlan",
    "JobTimeout",
    "LeadFilters",
    "Place",
    "ScrapeResult",
    "ScrapeState",
    "ScrapeStats",
    "SearchTarget",
    "SelectorChangedError",
    "build_coverage",
    "build_search_url",
    "canonical_place_url",
    "evaluate_discovery",
    "extract_place",
    "geocode_location",
    "place_key",
    "run_scrape",
]
