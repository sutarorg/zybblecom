"""Broad, key-free search-coverage planning for Zybble's scraper.

A single Google Maps search returns one viewport's worth of results — typically
15-25 listings before Maps says "You've reached the end of the list". That is
why a search for "gym in Delhi" used to come back with a handful of businesses
from one locality.

This module turns *one* location request into a deterministic plan of Google
Maps searches that span the whole requested area:

    1. geocode the location with OpenStreetMap/Nominatim (no API key, and
       explicitly NOT the Google Geocoding API) to obtain its bounding box;
    2. tile that bounding box into cells roughly the size of the requested
       radius, ordered centre-out so the most relevant area is searched first;
    3. run several query formulations ("<query> in <location>",
       "<query> near <location>", …) across those tiles, because different
       wording surfaces different listings from the same viewport.

The plan is a plain list of :class:`SearchTarget` values, so it can be
serialised into the job payload and resumed after a crash or a Railway
redeploy without repeating work.
"""

from __future__ import annotations

import json
import math
import re
import time
from dataclasses import dataclass, field
from typing import Callable, Iterable, Optional, Sequence
from urllib.parse import quote_plus

import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "ZybbleBusinessResearch/1.0 (+https://zybble.com/about)"

EARTH_EQUATOR_M = 40_075_016.686
METERS_PER_DEGREE_LAT = 111_320.0
VIEWPORT_WIDTH_PX = 1440

# Safety rails: a plan never grows without bound, even for "India" or "USA".
DEFAULT_MAX_TILES = 36
# Viewport spacing as a fraction of the requested radius (see _cell_degrees).
CELL_FACTOR = 0.6
ABSOLUTE_MAX_TARGETS = 72
DEFAULT_QUERY_VARIANTS = (
    "{query} in {location}",
    "{query} near {location}",
    "{query} {location}",
)


class GeocodeError(RuntimeError):
    """The location could not be resolved to a bounding box."""


@dataclass(frozen=True)
class GeoBox:
    """A geocoded location: centre point plus its bounding box."""

    display_name: str
    center_lat: float
    center_lng: float
    south: float
    north: float
    west: float
    east: float

    @property
    def width_m(self) -> float:
        return max(0.0, (self.east - self.west) * METERS_PER_DEGREE_LAT * math.cos(math.radians(self.center_lat)))

    @property
    def height_m(self) -> float:
        return max(0.0, (self.north - self.south) * METERS_PER_DEGREE_LAT)

    @property
    def area_km2(self) -> float:
        return (self.width_m / 1000.0) * (self.height_m / 1000.0)


@dataclass(frozen=True)
class SearchTarget:
    """One concrete Google Maps search to execute."""

    kind: str  # "tile" | "text"
    url: str
    label: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    zoom: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "url": self.url,
            "label": self.label,
            "lat": self.lat,
            "lng": self.lng,
            "zoom": self.zoom,
        }

    @classmethod
    def from_dict(cls, raw: dict) -> "SearchTarget":
        return cls(
            kind=raw.get("kind", "tile"),
            url=raw["url"],
            label=raw.get("label", raw["url"]),
            lat=raw.get("lat"),
            lng=raw.get("lng"),
            zoom=raw.get("zoom"),
        )


@dataclass
class CoveragePlan:
    """An ordered, resumable list of searches covering the requested area."""

    location: str
    query: str
    radius_meters: int
    targets: list[SearchTarget] = field(default_factory=list)
    box: Optional[GeoBox] = None
    degraded: bool = False
    note: Optional[str] = None

    @property
    def total(self) -> int:
        return len(self.targets)

    def to_dict(self) -> dict:
        return {
            "location": self.location,
            "query": self.query,
            "radius_meters": self.radius_meters,
            "degraded": self.degraded,
            "note": self.note,
            "box": (
                {
                    "display_name": self.box.display_name,
                    "center_lat": self.box.center_lat,
                    "center_lng": self.box.center_lng,
                    "south": self.box.south,
                    "north": self.box.north,
                    "west": self.box.west,
                    "east": self.box.east,
                }
                if self.box
                else None
            ),
            "targets": [target.to_dict() for target in self.targets],
        }

    @classmethod
    def from_dict(cls, raw: dict) -> "CoveragePlan":
        box_raw = raw.get("box")
        box = GeoBox(**box_raw) if box_raw else None
        return cls(
            location=raw.get("location", ""),
            query=raw.get("query", ""),
            radius_meters=int(raw.get("radius_meters", 25_000)),
            targets=[SearchTarget.from_dict(item) for item in raw.get("targets", [])],
            box=box,
            degraded=bool(raw.get("degraded", False)),
            note=raw.get("note"),
        )


# ————————————————————————————————————————————————————————————
# Geocoding (OpenStreetMap / Nominatim — no Google, no API key)
# ————————————————————————————————————————————————————————————

_GEOCODE_CACHE: dict[str, Optional[GeoBox]] = {}
_GEOCODE_CACHE_TTL = 3_600.0
_GEOCODE_CACHE_AT: dict[str, float] = {}


def geocode_location(location: str, timeout: float = 8.0) -> Optional[GeoBox]:
    """Resolve a free-text location to a bounding box using Nominatim.

    Cached in-process (one hour) so a plan with 36 tiles never hammers the
    public endpoint. Returns ``None`` when the location cannot be resolved —
    callers fall back to a text-only search rather than failing the job.
    """
    key = location.strip().lower()
    if not key:
        return None
    now = time.monotonic()
    if key in _GEOCODE_CACHE and now - _GEOCODE_CACHE_AT.get(key, 0.0) < _GEOCODE_CACHE_TTL:
        return _GEOCODE_CACHE[key]

    box = _geocode_nominatim(location, timeout)
    _GEOCODE_CACHE[key] = box
    _GEOCODE_CACHE_AT[key] = now
    return box


def _geocode_nominatim(location: str, timeout: float) -> Optional[GeoBox]:
    try:
        response = requests.get(
            NOMINATIM_URL,
            params={
                "q": location,
                "format": "jsonv2",
                "limit": 1,
                "addressdetails": 0,
            },
            headers={"User-Agent": USER_AGENT, "Accept-Language": "en"},
            timeout=timeout,
        )
        if not response.ok:
            return None
        payload = response.json()
    except (requests.RequestException, ValueError):
        return None

    if not isinstance(payload, list) or not payload:
        return None

    entry = payload[0]
    try:
        lat = float(entry["lat"])
        lng = float(entry["lon"])
        bounding = entry.get("boundingbox")
        if bounding and len(bounding) == 4:
            south, north, west, east = (float(value) for value in bounding)
        else:
            # Point result (a city node, for example): synthesise a small box so
            # tiling still produces a sensible spread of viewports.
            south, north, west, east = lat - 0.05, lat + 0.05, lng - 0.05, lng + 0.05
    except (KeyError, TypeError, ValueError):
        return None

    if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
        return None

    return GeoBox(
        display_name=str(entry.get("display_name") or location),
        center_lat=lat,
        center_lng=lng,
        south=min(south, north),
        north=max(south, north),
        west=min(west, east),
        east=max(west, east),
    )


# ————————————————————————————————————————————————————————————
# Tiling
# ————————————————————————————————————————————————————————————


def zoom_for_radius(radius_meters: int) -> float:
    """Web Mercator zoom that frames ~2x the requested radius at 1440px.

    Ignoring cos(latitude) only makes the true viewport narrower than the
    target, never wider, so results stay centred on the tile.
    """
    target_width_m = max(2_000.0, float(radius_meters) * 2)
    zoom = math.log2((EARTH_EQUATOR_M / 256) * VIEWPORT_WIDTH_PX / target_width_m)
    return max(8.0, min(17.0, zoom))


def _cell_degrees(lat: float, radius_meters: int) -> tuple[float, float]:
    """(dlat, dlon) spacing between two search viewports.

    Google Maps returns roughly 15-25 listings per viewport almost regardless
    of how wide it is, so viewports are spaced *closer together* than the
    requested radius: many overlapping neighbourhood searches surface far more
    unique businesses than a few large ones.
    """
    span_m = max(2_000.0, float(radius_meters) * CELL_FACTOR)
    dlat = span_m / METERS_PER_DEGREE_LAT
    cos_lat = max(0.15, abs(math.cos(math.radians(lat))))
    dlon = span_m / (METERS_PER_DEGREE_LAT * cos_lat)
    return dlat, dlon


def build_tiles(box: GeoBox, radius_meters: int, max_tiles: int = DEFAULT_MAX_TILES) -> list[tuple[float, float, float]]:
    """Split a bounding box into (lat, lng, zoom) tiles, ordered centre-out.

    The tile count is capped: if the area needs more cells than ``max_tiles``,
    cells are grown (never dropped) so no part of the location is skipped.
    """
    dlat, dlon = _cell_degrees(box.center_lat, radius_meters)

    def cell_count(scale: float) -> int:
        cols = max(1, math.ceil((box.east - box.west) / (dlon * scale)))
        rows = max(1, math.ceil((box.north - box.south) / (dlat * scale)))
        return cols * rows

    scale = 1.0
    while cell_count(scale) > max_tiles:
        scale *= 1.5
        if scale > 12:  # pathological bbox (a whole continent) — stop growing
            break

    step_lat = dlat * scale
    step_lng = dlon * scale
    cols = max(1, math.ceil((box.east - box.west) / step_lng))
    rows = max(1, math.ceil((box.north - box.south) / step_lat))

    # Evenly spaced cell centres across the whole box: every part of the
    # requested area is covered exactly once, with no cells falling outside it.
    lat_step = (box.north - box.south) / rows
    lng_step = (box.east - box.west) / cols

    tiles: list[tuple[float, float, float]] = []
    for row in range(rows):
        for col in range(cols):
            lat = box.south + (row + 0.5) * lat_step
            lng = box.west + (col + 0.5) * lng_step
            lat = min(max(lat, box.south), box.north)
            lng = min(max(lng, box.west), box.east)
            tiles.append((round(lat, 6), round(lng, 6), round(zoom_for_radius(radius_meters), 2)))

    if not tiles:  # bbox was degenerate — always search the centre at least once
        tiles.append((box.center_lat, box.center_lng, zoom_for_radius(radius_meters)))

    tiles.sort(
        key=lambda tile: (tile[0] - box.center_lat) ** 2 + (tile[1] - box.center_lng) ** 2
    )
    return tiles


def search_url(query_text: str, lat: Optional[float] = None, lng: Optional[float] = None, zoom: Optional[float] = None) -> str:
    """Build the Google Maps search URL the vendored scraper will open."""
    encoded = quote_plus(query_text)
    if lat is None or lng is None:
        return f"https://www.google.com/maps/search/{encoded}"
    return f"https://www.google.com/maps/search/{encoded}/@{lat:.6f},{lng:.6f},{(zoom or 13.0):.2f}z"


def build_coverage(
    query: str,
    location: str,
    radius_meters: int,
    max_tiles: int = DEFAULT_MAX_TILES,
    query_variants: Sequence[str] = DEFAULT_QUERY_VARIANTS,
    geocode: Optional[Callable[[str], Optional[GeoBox]]] = None,
    max_targets: int = ABSOLUTE_MAX_TARGETS,
) -> CoveragePlan:
    """Plan the searches that cover the whole requested area.

    Falls back to a plain text search (``degraded=True``) when Nominatim cannot
    resolve the location — the job still runs against real Google Maps, it just
    loses the geographic spread.
    """
    resolve = geocode or geocode_location
    box: Optional[GeoBox] = None
    try:
        box = resolve(location)
    except Exception:  # noqa: BLE001 - geocoding must never break planning
        box = None

    plan = CoveragePlan(
        location=location,
        query=query,
        radius_meters=radius_meters,
        box=box,
    )

    if box is None:
        plan.degraded = True
        plan.note = (
            "Location could not be geocoded for area tiling; searching Google Maps "
            "with the location text and relying on result pagination."
        )
        plan.targets = [
            SearchTarget(
                kind="text",
                url=search_url(variant.format(query=query, location=location)),
                label=f'"{variant.format(query=query, location=location)}"',
            )
            for variant in query_variants
        ]
        return plan

    tiles = build_tiles(box, radius_meters, max_tiles)
    zoom = zoom_for_radius(radius_meters)
    targets: list[SearchTarget] = []

    # Variant-major ordering: finish one full sweep of the area before trying
    # the next wording, so partial results are already area-representative.
    for variant in query_variants:
        text = variant.format(query=query, location=location)
        for index, (lat, lng, tile_zoom) in enumerate(tiles):
            targets.append(
                SearchTarget(
                    kind="tile",
                    url=search_url(text, lat, lng, tile_zoom or zoom),
                    label=f"{text} · area {index + 1}/{len(tiles)}",
                    lat=lat,
                    lng=lng,
                    zoom=tile_zoom or zoom,
                )
            )
        if len(targets) >= max_targets:
            break

    plan.targets = targets[:max_targets]
    if not plan.targets:  # defensive: never return an empty plan
        plan.targets = [
            SearchTarget(
                kind="text",
                url=search_url(f"{query} in {location}"),
                label=f'"{query} in {location}"',
            )
        ]
    return plan


def plan_from_state(state: dict) -> Optional[CoveragePlan]:
    """Rebuild a plan previously serialised into a job payload."""
    raw = state.get("plan") if isinstance(state, dict) else None
    if not raw:
        return None
    try:
        return CoveragePlan.from_dict(raw)
    except (TypeError, ValueError, KeyError):
        return None


def dumps(plan: CoveragePlan) -> str:
    return json.dumps(plan.to_dict(), default=str)


def loads(raw: str) -> Optional[CoveragePlan]:
    try:
        return CoveragePlan.from_dict(json.loads(raw))
    except (TypeError, ValueError):
        return None


def normalise_location_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def iter_batches(targets: Iterable[SearchTarget], size: int) -> Iterable[list[SearchTarget]]:
    batch: list[SearchTarget] = []
    for target in targets:
        batch.append(target)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch
