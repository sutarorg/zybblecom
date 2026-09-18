"""Offline simulator for the `gosom/google-maps-scraper` engine.

This module is **test-only**. It never runs in production and it never produces
leads for users: it exists so the real production code path — the coverage
planner, the engine adapter (``gmaps_engine.GosomEngine``), the JSONL stream
reader, ``scraper.entry_to_place``, dedupe, filters and the whole worker
pipeline — can be exercised end-to-end without a browser and without touching
Google.

It works at the *process boundary*: :func:`install_fake_binary` writes a real
executable that speaks the upstream CLI contract (``-input``, ``-results``,
``-json``, ``-c``, ``-depth``, ``-lang``, ``-exit-on-inactivity``,
``-browser-pool-size``, ``-pages-per-browser``, ``-email``, ``-version``),
reads the ``<url>#!#<id>`` input file Zybble writes and streams the same
``gmaps.Entry`` JSON objects the real engine emits — one per line, flushed as
they are discovered.

It reproduces the behaviours the product has to survive:

* businesses that legitimately appear in more than one viewport (dedupe);
* viewports that return nothing (coverage keeps going);
* business pages that cannot be read (no entry, sweep continues);
* malformed / nameless result lines (counted as errors, never fatal);
* Google's "unusual traffic" challenge (resumable ``ChallengeError``);
* an engine crash, and an engine that hangs past the job's time budget
  (deadline enforcement + process-group kill).
"""

from __future__ import annotations

import json
import math
import os
import random
import re
import shutil
import stat
import sys
import tempfile
from dataclasses import asdict, dataclass, field
from typing import Optional
from urllib.parse import urlparse

# Delhi's real bounding box (Nominatim's shape), used as the test "world".
DELHI_BOX = {
    "display_name": "Delhi, India",
    "center_lat": 28.6139,
    "center_lng": 77.2090,
    "south": 28.4020,
    "north": 28.8840,
    "west": 76.8380,
    "east": 77.3460,
}

MUMBAI_BOX = {
    "display_name": "Mumbai, Maharashtra, India",
    "center_lat": 19.0760,
    "center_lng": 72.8777,
    "south": 18.8900,
    "north": 19.2700,
    "west": 72.7700,
    "east": 73.0000,
}

BOXES = {"delhi": DELHI_BOX, "mumbai": MUMBAI_BOX}

HOURS = {
    "Monday": ["6 AM–10 PM"],
    "Tuesday": ["6 AM–10 PM"],
    "Wednesday": ["6 AM–10 PM"],
    "Thursday": ["6 AM–10 PM"],
    "Friday": ["6 AM–11 PM"],
    "Saturday": ["7 AM–11 PM"],
    "Sunday": ["Closed"],
}

STATUS_TEXT = {
    "open": "Open ⋅ Closes 10 PM",
    "closed": "Closed ⋅ Opens 6 AM",
    "permanently_closed": "Permanently closed",
    "unknown": "",
}


def geocode_stub(location: str):
    """A Nominatim-shaped geocoder usable as ``run_scrape(geocoder=...)``."""
    from coverage import GeoBox

    key = (location or "").strip().lower()
    for name, box in BOXES.items():
        if name in key:
            return GeoBox(**box)
    return None


# ————————————————————————————————————————————————————————————
# The world
# ————————————————————————————————————————————————————————————


@dataclass
class FakeBusiness:
    """One business as Google Maps would publish it."""

    place_id: str  # Google's cid (0x…:0x…)
    company: str
    google_place_id: str = ""  # ChIJ… place id
    category: str = "Gym"
    address: str = "1 Main Road"
    borough: str = "Connaught Place"
    city: str = "New Delhi"
    state: str = "Delhi"
    postal_code: str = "110001"
    country: str = "India"
    phone: Optional[str] = "+91 11 4000 0000"
    website: Optional[str] = "https://example-gym.in"
    rating: Optional[float] = 4.3
    reviews: Optional[int] = 120
    hours: Optional[dict] = field(default_factory=lambda: dict(HOURS))
    open_status: str = "open"
    description: Optional[str] = None
    lat: float = 28.6139
    lng: float = 77.2090
    broken: bool = False  # place page cannot be read → the engine emits nothing
    emails: list[str] = field(default_factory=list)

    def __post_init__(self):
        if not self.google_place_id:
            self.google_place_id = f"ChIJ{re.sub(r'[^0-9a-zA-Z]', '', self.place_id)[:18]}"

    # ——— serialisation (the fake binary is a separate process) ———

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, raw: dict) -> "FakeBusiness":
        known = {key: raw[key] for key in cls.__dataclass_fields__ if key in raw}
        return cls(**known)

    # ——— upstream entry shape ———

    @property
    def slug(self) -> str:
        return re.sub(r"[^\w\s-]", "", self.company or "").strip().replace(" ", "-")

    def maps_link(self) -> str:
        return (
            f"https://www.google.com/maps/place/{self.slug}/data=!4m2!3m1!1s{self.place_id}"
            f"?hl=en&authuser=0&entry=ttu"
        )

    def formatted_address(self) -> str:
        return ", ".join(
            part
            for part in (self.address, self.city, f"{self.state} {self.postal_code}", self.country)
            if part
        )

    def entry(self, input_id: str = "", include_emails: bool = False) -> dict:
        """The exact ``gmaps.Entry`` JSON the real engine writes."""
        entry = {
            "input_id": input_id,
            "link": self.maps_link(),
            "cid": self.place_id,
            "title": self.company,
            "categories": [self.category],
            "category": self.category,
            "address": self.formatted_address(),
            "open_hours": dict(self.hours or {}),
            "popular_times": {},
            "web_site": self.website or "",
            "phone": self.phone or "",
            "plus_code": "8FVC2222+33",
            "review_count": int(self.reviews or 0),
            "review_rating": float(self.rating or 0.0),
            "reviews_per_rating": {str(n): 0 for n in range(1, 6)},
            "latitude": self.lat,
            "longtitude": self.lng,
            "longitude": self.lng,
            "status": STATUS_TEXT.get(self.open_status, ""),
            "description": self.description or "",
            "reviews_link": f"https://search.google.com/local/reviews?placeid={self.google_place_id}",
            "thumbnail": "",
            "timezone": "Asia/Kolkata",
            "price_range": "$$",
            "data_id": self.place_id,
            "street_view_url": "",
            "place_id": self.google_place_id,
            "images": [],
            "reservations": [],
            "order_online": [],
            "menu": {"link": "", "source": ""},
            "owner": {"id": "", "name": "", "link": ""},
            "complete_address": {
                "borough": self.borough,
                "street": self.address,
                "city": self.city,
                "postal_code": self.postal_code,
                "state": self.state,
                "country": self.country,
            },
            "credit_cards_accepted": [],
            "about": [],
            "user_reviews": [],
            "user_reviews_extended": [],
        }
        if include_emails:
            entry["emails"] = list(self.emails or [])
        return entry


def build_world(
    count: int,
    seed: int = 7,
    box: dict = DELHI_BOX,
    prefix: str = "Business",
    category: str = "Gym",
) -> list[FakeBusiness]:
    """Deterministic set of businesses spread over the whole bounding box."""
    rng = random.Random(seed)
    businesses: list[FakeBusiness] = []
    for index in range(count):
        lat = rng.uniform(box["south"], box["north"])
        lng = rng.uniform(box["west"], box["east"])
        has_website = index % 5 != 0  # every 5th business has no website
        website = f"https://{prefix.lower()}-{index + 1}.example.in" if has_website else None
        businesses.append(
            FakeBusiness(
                place_id=f"0x390ce19d{index:04x}:0xa1b2c3{index:04x}",
                company=f"{prefix} {index + 1}",
                category=category,
                address=f"{index + 1}, Sector {index % 20 + 1}",
                city="New Delhi" if index % 3 else "Delhi",
                postal_code=f"1100{(index % 9) + 1:02d}",
                rating=round(rng.uniform(3.0, 5.0), 1),
                reviews=rng.randint(5, 900),
                phone=None if index % 7 == 0 else f"+91 11 4{index:03d} 0000",
                website=website,
                emails=[f"hello@{website.split('//')[-1]}" ] if website else [],
                lat=round(lat, 6),
                lng=round(lng, 6),
                broken=(index % 23 == 22),  # ~4% of place pages fail to load
                open_status="closed" if index % 11 == 0 else "open",
                description=(
                    f"{prefix} {index + 1} is a {category.lower()} serving {box['display_name']}."
                ),
            )
        )
    return businesses


def _distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    return math.hypot((lat1 - lat2) * 111_320.0, (lng1 - lng2) * 111_320.0 * math.cos(math.radians(lat1)))


class FakeMaps:
    """Serves a deterministic set of businesses for Google Maps search URLs."""

    def __init__(
        self,
        businesses: list[FakeBusiness],
        overlap_m: float = 50_000.0,
        max_results: int = 20,
    ):
        """``overlap_m`` is the viewport reach and ``max_results`` Google's
        practical ~20-listing first page — both mirrored from real behaviour."""
        self.businesses = businesses
        self.overlap_m = overlap_m
        self.max_results = max_results
        self.by_id = {b.place_id: b for b in businesses}
        self.search_calls: list[str] = []

    @staticmethod
    def tile_center(url: str) -> Optional[tuple[float, float]]:
        match = re.search(r"@(-?\d+\.?\d*),(-?\d+\.?\d*)", urlparse(url).path or url)
        if not match:
            return None
        return float(match.group(1)), float(match.group(2))

    def results_for(self, url: str, depth: int = 1) -> list[FakeBusiness]:
        """Businesses one viewport search returns, nearest first.

        ``depth`` is upstream's scroll depth: each scroll surfaces roughly
        another page of the feed, capped by Google's ~120-listing limit.
        """
        self.search_calls.append(url)
        cap = max(1, min(self.max_results * max(1, depth), 120))
        center = self.tile_center(url)
        pool = list(self.businesses)
        if center is not None:
            lat, lng = center
            pool = [b for b in pool if _distance_m(lat, lng, b.lat, b.lng) <= self.overlap_m]
            pool.sort(key=lambda b: _distance_m(lat, lng, b.lat, b.lng))
        return pool[:cap]


# ————————————————————————————————————————————————————————————
# The fake engine binary
# ————————————————————————————————————————————————————————————

FAKE_BINARY_SOURCE = r'''#!/usr/bin/env python3
"""Test double for the gosom/google-maps-scraper CLI (see tests/fake_gms.py)."""
import json
import os
import sys
import time

BOOL_FLAGS = {"-json", "-email", "-debug", "-fast-mode", "-resume", "-disable-page-reuse", "-version"}


def parse_flags(argv):
    flags, positional = {}, []
    index = 0
    while index < len(argv):
        token = argv[index]
        if token.startswith("-") and len(token) > 1:
            if "=" in token:
                name, value = token.split("=", 1)
                flags[name] = value
            elif token in BOOL_FLAGS:
                flags[token] = True
            else:
                index += 1
                flags[token] = argv[index] if index < len(argv) else ""
        else:
            positional.append(token)
        index += 1
    return flags, positional


def log(message):
    sys.stderr.write(message + "\n")
    sys.stderr.flush()


def main():
    argv = sys.argv[1:]
    flags, _ = parse_flags(argv)

    argv_log = os.environ.get("FAKE_GMS_ARGV_LOG")
    if argv_log:
        with open(argv_log, "a", encoding="utf-8") as handle:
            handle.write(json.dumps({"argv": argv}) + "\n")

    if flags.get("-version"):
        print("v1.18.0-fakeengine")
        return 0

    mode = os.environ.get("FAKE_GMS_MODE", "ok")
    delay = float(os.environ.get("FAKE_GMS_DELAY", "0"))
    hang = float(os.environ.get("FAKE_GMS_HANG_SECONDS", "600"))
    max_entries = int(os.environ.get("FAKE_GMS_MAX_ENTRIES", "0") or 0)
    malformed = int(os.environ.get("FAKE_GMS_MALFORMED", "0") or 0)
    nameless = int(os.environ.get("FAKE_GMS_EMPTY_TITLE", "0") or 0)
    extra_stderr = os.environ.get("FAKE_GMS_STDERR", "")
    exit_code = os.environ.get("FAKE_GMS_EXIT_CODE")

    log("time=2026-01-01T00:00:00Z level=INFO msg=\"fake google-maps-scraper starting\" mode=" + mode)
    if extra_stderr:
        log(extra_stderr)

    if mode == "hang":
        log("time=2026-01-01T00:00:00Z level=INFO msg=\"launching browser\"")
        time.sleep(hang)
        return 0

    if mode == "challenge":
        log("Our systems have detected unusual traffic from your computer network.")
        return int(exit_code or 1)

    if mode == "crash":
        log("panic: runtime error: invalid memory address or nil pointer dereference")
        return int(exit_code or 2)

    input_path = flags.get("-input", "")
    results_path = flags.get("-results", "stdout")
    depth = int(flags.get("-depth", "1") or 1)
    include_emails = bool(flags.get("-email"))
    lang = flags.get("-lang", "en")

    world_path = os.environ["FAKE_GMS_WORLD"]
    with open(world_path, encoding="utf-8") as handle:
        world_raw = json.load(handle)

    businesses = [dict(raw) for raw in world_raw]
    maps = _Maps(businesses)

    queries = []
    if input_path and input_path != "stdin":
        with open(input_path, encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                if "#!#" in line:
                    url, target_id = line.split("#!#", 1)
                    queries.append((url.strip(), target_id.strip()))
                else:
                    queries.append((line, ""))
    else:
        for line in sys.stdin:
            if line.strip():
                queries.append((line.strip(), ""))

    search_log = os.environ.get("FAKE_GMS_SEARCH_LOG")
    out = sys.stdout if results_path in ("", "stdout") else open(results_path, "w", encoding="utf-8")
    written = 0
    seen = set()  # upstream deduplicates places across every query in one run
    template = businesses[0] if businesses else {"company": "Placeholder", "place_id": "0x0:0x0"}
    try:
        for url, target_id in queries:
            log("time=2026-01-01T00:00:00Z level=INFO msg=\"searching\" url=\"%s\" hl=%s depth=%d" % (url, lang, depth))
            if search_log:
                with open(search_log, "a", encoding="utf-8") as handle:
                    handle.write(json.dumps({"url": url, "id": target_id, "depth": depth}) + "\n")
            for business in maps.results_for(url, depth):
                if business.get("place_id") in seen:
                    continue
                if business.get("broken"):
                    log("time=2026-01-01T00:00:00Z level=ERROR msg=\"could not fetch place\" title=\"%s\"" % business.get("title", business.get("company")))
                    continue
                if max_entries and written >= max_entries:
                    break
                seen.add(business.get("place_id"))
                entry = _entry(business, target_id, include_emails)
                out.write(json.dumps(entry, ensure_ascii=False) + "\n")
                out.flush()
                written += 1
                if delay:
                    time.sleep(delay)
            if max_entries and written >= max_entries:
                break

            # A torn write and a result without a business name must be counted
            # as errors by the adapter and never abort the sweep.
            for _ in range(malformed):
                out.write("{\"title\": \"torn write\" \n")
                out.flush()
            for _ in range(nameless):
                out.write(json.dumps(_entry({**template, "company": ""}, target_id, include_emails)) + "\n")
                out.flush()
            malformed = 0
            nameless = 0

        if mode == "partial":
            log("time=2026-01-01T00:00:00Z level=ERROR msg=\"browser closed unexpectedly\"")
            return int(exit_code or 3)
    finally:
        if out is not sys.stdout:
            out.close()

    log("time=2026-01-01T00:00:00Z level=INFO msg=\"done\" results=%d" % written)
    return int(exit_code or 0)


def _entry(business, target_id, include_emails):
    """Rebuild the upstream gmaps.Entry JSON from the serialised world row."""
    company = business.get("company") or ""
    slug = "".join(ch if (ch.isalnum() or ch in " -_") else "" for ch in company).strip().replace(" ", "-")
    place_id = business.get("place_id") or ""
    google_place_id = business.get("google_place_id") or ("ChIJ" + place_id.replace(":", "")[:18])
    status_text = {
        "open": "Open \u22c5 Closes 10 PM",
        "closed": "Closed \u22c5 Opens 6 AM",
        "permanently_closed": "Permanently closed",
    }.get(business.get("open_status") or "", "")
    website = business.get("website") or ""
    address_parts = [
        business.get("address") or "",
        business.get("city") or "",
        " ".join(p for p in (business.get("state") or "", business.get("postal_code") or "") if p),
        business.get("country") or "",
    ]
    entry = {
        "input_id": target_id,
        "link": "https://www.google.com/maps/place/%s/data=!4m2!3m1!1s%s?hl=en&authuser=0&entry=ttu" % (slug, place_id),
        "cid": place_id,
        "title": company,
        "categories": [business.get("category") or ""],
        "category": business.get("category") or "",
        "address": ", ".join(part for part in address_parts if part),
        "open_hours": business.get("hours") or {},
        "popular_times": {},
        "web_site": website,
        "phone": business.get("phone") or "",
        "plus_code": "8FVC2222+33",
        "review_count": int(business.get("reviews") or 0),
        "review_rating": float(business.get("rating") or 0.0),
        "reviews_per_rating": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
        "latitude": business.get("lat"),
        "longtitude": business.get("lng"),
        "longitude": business.get("lng"),
        "status": status_text,
        "description": business.get("description") or "",
        "reviews_link": "https://search.google.com/local/reviews?placeid=" + google_place_id,
        "thumbnail": "",
        "timezone": "Asia/Kolkata",
        "price_range": "$$",
        "data_id": place_id,
        "street_view_url": "",
        "place_id": google_place_id,
        "images": [],
        "reservations": [],
        "order_online": [],
        "menu": {"link": "", "source": ""},
        "owner": {"id": "", "name": "", "link": ""},
        "complete_address": {
            "borough": business.get("borough") or "",
            "street": business.get("address") or "",
            "city": business.get("city") or "",
            "postal_code": business.get("postal_code") or "",
            "state": business.get("state") or "",
            "country": business.get("country") or "",
        },
        "credit_cards_accepted": [],
        "about": [],
        "user_reviews": [],
        "user_reviews_extended": [],
    }
    if include_emails:
        entry["emails"] = list(business.get("emails") or [])
    return entry


class _Maps:
    """Nearest-first viewport results, exactly like tests/fake_gms.FakeMaps."""

    def __init__(self, businesses):
        self.businesses = businesses

    @staticmethod
    def _center(url):
        import re as _re
        match = _re.search(r"@(-?\d+\.?\d*),(-?\d+\.?\d*)", url)
        if not match:
            return None
        return float(match.group(1)), float(match.group(2))

    @staticmethod
    def _distance(lat1, lng1, lat2, lng2):
        import math as _math
        return _math.hypot((lat1 - lat2) * 111320.0, (lng1 - lng2) * 111320.0 * _math.cos(_math.radians(lat1)))

    def results_for(self, url, depth=1):
        cap = max(1, min(20 * max(1, depth), 120))
        center = self._center(url)
        pool = list(self.businesses)
        if center is not None:
            lat, lng = center
            pool = [b for b in pool if self._distance(lat, lng, b.get("lat"), b.get("lng")) <= 50000.0]
            pool.sort(key=lambda b: self._distance(lat, lng, b.get("lat"), b.get("lng")))
        return pool[:cap]


if __name__ == "__main__":
    sys.exit(main())
'''


def write_world_file(businesses: list[FakeBusiness], path: str) -> str:
    """Serialise a world so the fake binary (another process) can read it."""
    with open(path, "w", encoding="utf-8") as handle:
        json.dump([business.to_dict() for business in businesses], handle)
    return path


def install_fake_binary(directory: str, name: str = "google-maps-scraper") -> str:
    """Write an executable engine double; returns its absolute path."""
    os.makedirs(directory, exist_ok=True)
    path = os.path.join(directory, name)
    source = FAKE_BINARY_SOURCE.replace("#!/usr/bin/env python3", f"#!{sys.executable}", 1)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(source)
    mode = os.stat(path).st_mode
    os.chmod(path, mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    return path


class FakeEngine:
    """A ready-to-use fake engine: binary + world file + env, in a temp dir.

    ``FakeEngine(world).engine`` is a **real** :class:`gmaps_engine.GosomEngine`
    pointed at the double, so tests exercise the production subprocess, JSONL
    streaming and error-classification code.
    """

    def __init__(
        self,
        businesses: Optional[list[FakeBusiness]] = None,
        mode: str = "ok",
        delay: float = 0.0,
        tmpdir: Optional[str] = None,
        depth: int = 10,
        concurrency: int = 2,
        poll_interval: float = 0.01,
        **env: str,
    ):
        from gmaps_engine import GosomEngine

        self.businesses = businesses if businesses is not None else build_world(240, seed=7)
        self.directory = tmpdir or tempfile.mkdtemp(prefix="zybble-fake-engine-")
        self.binary = install_fake_binary(self.directory)
        self.world_path = write_world_file(self.businesses, os.path.join(self.directory, "world.json"))
        self.argv_log = os.path.join(self.directory, "argv.jsonl")
        self.search_log = os.path.join(self.directory, "searches.jsonl")
        self.maps = FakeMaps(self.businesses)
        self.mode = mode
        child_env = {
            "FAKE_GMS_WORLD": self.world_path,
            "FAKE_GMS_MODE": mode,
            "FAKE_GMS_DELAY": str(delay),
            "FAKE_GMS_ARGV_LOG": self.argv_log,
            "FAKE_GMS_SEARCH_LOG": self.search_log,
            **{key: str(value) for key, value in env.items()},
        }
        self.engine = GosomEngine(
            binary=self.binary,
            concurrency=concurrency,
            depth=depth,
            poll_interval=poll_interval,
            stop_grace=5.0,
            env=child_env,
            sleep=time_sleep_noop,
        )

    def invocations(self) -> list[dict]:
        if not os.path.exists(self.argv_log):
            return []
        with open(self.argv_log, encoding="utf-8") as handle:
            return [json.loads(line) for line in handle if line.strip()]

    def searches(self) -> list[dict]:
        """Every viewport the engine actually searched, in order."""
        if not os.path.exists(self.search_log):
            return []
        with open(self.search_log, encoding="utf-8") as handle:
            return [json.loads(line) for line in handle if line.strip()]

    def cleanup(self) -> None:
        shutil.rmtree(self.directory, ignore_errors=True)


def time_sleep_noop(_seconds: float) -> None:
    """The engine's polling sleep, disabled so tests stay fast."""
    return None


__all__ = [
    "DELHI_BOX",
    "FakeBusiness",
    "FakeEngine",
    "FakeMaps",
    "MUMBAI_BOX",
    "build_world",
    "geocode_stub",
    "install_fake_binary",
    "write_world_file",
]
