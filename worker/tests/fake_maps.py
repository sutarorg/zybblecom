"""Offline Google Maps simulator for Zybble's scraper tests.

This module is **test-only**. It never runs in production and it never produces
leads for users: it exists so the real scraping code (the vendored
GoogleMapScraper core, ``scraper.run_scrape``, the coverage planner, the filters
and the worker pipeline) can be exercised end-to-end without a browser and
without hitting Google.

It serves realistic Google Maps HTML — the same selectors Google renders today
(h1.DUwDvf, button[data-item-id='address'], div.F7nice, span.ZDu9vd …) — through
a WebDriver-shaped fake, including:

* viewport search results that paginate as the feed is scrolled;
* businesses that legitimately appear in more than one viewport (so
  deduplication is actually exercised);
* business pages that fail to load (so error accounting is exercised);
* Google's "end of results" behaviour (the feed stops growing → stall).
"""

from __future__ import annotations

import math
import random
import re
from dataclasses import dataclass
from html import escape
from typing import Optional
from urllib.parse import parse_qs, urlparse

from bs4 import BeautifulSoup
from selenium.common.exceptions import NoSuchElementException, TimeoutException

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
    place_id: str
    company: str
    category: str = "Gym"
    address: str = "1 Main Road"
    city: str = "New Delhi"
    state: str = "Delhi"
    country: str = "India"
    phone: Optional[str] = "+91 11 4000 0000"
    website: Optional[str] = "https://example-gym.in"
    rating: Optional[float] = 4.3
    reviews: Optional[int] = 120
    hours: Optional[str] = "Monday, 6 AM to 10 PM"
    open_status: str = "open"
    lat: float = 28.6139
    lng: float = 77.2090
    broken: bool = False  # page fails to load
    website_html: Optional[str] = None


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
        businesses.append(
            FakeBusiness(
                place_id=f"0x390ce19d{index:04x}:0xa1b2c3{index:04x}",
                company=f"{prefix} {index + 1}",
                category=category,
                address=f"{index + 1}, Sector {index % 20 + 1}",
                city="New Delhi" if index % 3 else "Delhi",
                rating=round(rng.uniform(3.0, 5.0), 1),
                reviews=rng.randint(5, 900),
                phone=None if index % 7 == 0 else f"+91 11 4{index:03d} 0000",
                website=None if not has_website else f"https://{prefix.lower()}-{index + 1}.example.in",
                lat=round(lat, 6),
                lng=round(lng, 6),
                broken=(index % 23 == 22),  # ~4% of pages fail to load
                open_status="closed" if index % 11 == 0 else "open",
            )
        )
    return businesses


def _distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    return math.hypot((lat1 - lat2) * 111_320.0, (lng1 - lng2) * 111_320.0 * math.cos(math.radians(lat1)))


class FakeMaps:
    """Serves Google-Maps-shaped HTML for a deterministic set of businesses."""

    def __init__(
        self,
        businesses: list[FakeBusiness],
        page_size: int = 10,
        overlap_m: float = 50_000.0,
        max_results: int = 20,
    ):
        """``overlap_m`` is the viewport reach and ``max_results`` Google's
        practical ~20-listing feed cap — both mirrored from real behaviour."""
        self.businesses = businesses
        self.page_size = page_size
        self.overlap_m = overlap_m
        self.max_results = max_results
        self.by_id = {b.place_id: b for b in businesses}
        self.search_calls: list[str] = []
        self.place_visits: list[str] = []

    # ——— routing ———

    def _tile_center(self, url: str) -> Optional[tuple[float, float]]:
        match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", urlparse(url).path or url)
        if not match:
            return None
        return float(match.group(1)), float(match.group(2))

    def results_for(self, url: str) -> list[str]:
        """Place ids returned by one viewport search, nearest first."""
        self.search_calls.append(url)
        center = self._tile_center(url)
        if center is None:
            return [b.place_id for b in self.businesses]
        lat, lng = center
        seen = [
            (b.place_id, _distance_m(lat, lng, b.lat, b.lng))
            for b in self.businesses
            if _distance_m(lat, lng, b.lat, b.lng) <= self.overlap_m
        ]
        seen.sort(key=lambda item: item[1])
        return [place_id for place_id, _ in seen[: self.max_results]]

    def business_for_url(self, url: str) -> Optional[FakeBusiness]:
        match = re.search(r"!1s(0x[0-9a-f]+:0x[0-9a-f]+)", url)
        if match:
            return self.by_id.get(match.group(1))
        for business in self.businesses:
            if business.company and quote_safe(business.company) in url:
                return business
        return None

    # ——— HTML ———

    def place_link(self, business: FakeBusiness) -> str:
        slug = quote_safe(business.company).replace(" ", "+")
        return (
            f"https://www.google.com/maps/place/{slug}/data=!4m2!3m1!1s{business.place_id}"
            f"?entry=ttu&g_ep=CAESBzI1LjMyLjE"
        )

    def feed_html(self, place_ids: list[str]) -> str:
        cards = []
        for place_id in place_ids:
            business = self.by_id[place_id]
            cards.append(
                f'<a class="hfpxzc" href="{escape(self.place_link(business))}">'
                f'<div class="qBF1Pd">{escape(business.company)}</div></a>'
            )
        if not cards:
            cards.append('<div class="PbZDve">No results found</div>')
        return (
            '<html><body><div role="feed" aria-label="Results for gym in Delhi">'
            + "".join(cards)
            + "</div></body></html>"
        )

    def place_html(self, business: FakeBusiness) -> str:
        self.place_visits.append(business.place_id)
        address = ", ".join(
            part
            for part in (
                business.address,
                business.city,
                f"{business.state} 1100{(len(business.company) % 9) + 1}",
                business.country,
            )
            if part
        )
        phone_block = (
            f'<button data-item-id="phone:tel:{re.sub(r"[^0-9]", "", business.phone)}" '
            f'aria-label="Phone: {escape(business.phone)}">{escape(business.phone)}</button>'
            if business.phone
            else ""
        )
        website_block = (
            f'<a data-item-id="authority" aria-label="Website: {escape(business.website)}" '
            f'href="{escape(business.website)}">{escape(business.website)}</a>'
            if business.website
            else ""
        )
        rating_block = (
            f'<div class="F7nice"><span aria-hidden="true">{business.rating}</span>'
            f'<span class="RDApEe">{business.reviews} reviews</span></div>'
            if business.rating is not None
            else ""
        )
        reviews_block = (
            f'<button jsaction="pane.reviewChart.moreReviews" aria-label="{business.reviews} reviews">'
            f"{business.reviews} reviews</button>"
            if business.reviews is not None
            else ""
        )
        status_label = {
            "open": "Open ⋅ Closes 10 PM",
            "closed": "Closed ⋅ Opens 6 AM",
            "permanently_closed": "Permanently closed",
        }.get(business.open_status, "")
        status_block = f'<span class="ZDu9vd">{status_label}</span>' if status_label else ""
        hours_block = (
            f'<button data-item-id="oh" aria-label="Hours: {escape(business.hours)}">{escape(business.hours)}</button>'
            if business.hours
            else ""
        )
        return (
            "<html><body>"
            f'<div aria-label="Information for {escape(business.company)}">'
            f'<h1 class="DUwDvf fontHeadlineLarge">{escape(business.company)}</h1>'
            f'<button data-item-id="address" aria-label="Address: {escape(address)}">{escape(address)}</button>'
            f"{phone_block}{website_block}"
            f'<button class="DkEaL" jsaction="pane.rating.category">{escape(business.category)}</button>'
            "</div>"
            f'<div aria-label="Opening hours information. {escape(business.hours or "")}"></div>'
            f"{hours_block}{status_block}{rating_block}{reviews_block}"
            "</body></html>"
        )


def quote_safe(text: str) -> str:
    return re.sub(r"[^\w\s-]", "", text or "").strip().replace(" ", "-")


# ————————————————————————————————————————————————————————————
# WebDriver-shaped fake
# ————————————————————————————————————————————————————————————

_SELECTOR_RE = re.compile(r"^([a-zA-Z0-9]*)((?:[.#][\w-]+)*)((?:\[[^\]]+\])*)$")
_ATTR_RE = re.compile(r"^\[\s*([\w-]+)\s*(?:([*^$~]?=)\s*[\"']?([^\"'\]]*)[\"']?)?\s*\]$")


def _selector_to_filter(selector: str):
    """Translate the handful of CSS selectors Selenium is asked for."""
    match = _SELECTOR_RE.match(selector.strip())
    if not match:
        return None
    tag = match.group(1) or None
    classes = [part[1:] for part in re.findall(r"\.([\w-]+)", match.group(2) or "")]
    attrs = []
    for raw in re.findall(r"\[[^\]]+\]", match.group(3) or ""):
        attr_match = _ATTR_RE.match(raw)
        if not attr_match:
            continue
        name, op, value = attr_match.group(1), attr_match.group(2) or "=", attr_match.group(3) or ""
        attrs.append((name, op, value))
    return {"tag": tag, "classes": classes, "attrs": attrs}


def _matches(node, spec: dict) -> bool:
    if spec["tag"] and getattr(node, "name", None) != spec["tag"]:
        return False
    node_classes = set(node.get("class") or [])
    for class_name in spec["classes"]:
        if class_name not in node_classes:
            return False
    for name, op, value in spec["attrs"]:
        actual = node.get(name)
        if actual is None:
            return False
        actual = " ".join(actual) if isinstance(actual, list) else str(actual)
        if op == "=" and actual != value:
            return False
        if op == "*=" and value not in actual:
            return False
        if op == "^=" and not actual.startswith(value):
            return False
        if op == "$=" and not actual.endswith(value):
            return False
        if op == "~=" and value not in actual.split():
            return False
    return True


class FakeElement:
    def __init__(self, node):
        self._node = node

    @property
    def text(self) -> str:
        return self._node.get_text(" ", strip=True)

    def get_attribute(self, name: str) -> Optional[str]:
        value = self._node.get(name)
        if value is None:
            return None
        if isinstance(value, list):
            return " ".join(value)
        return str(value)

    def click(self) -> None:
        return None


class FakeDriver:
    """A Selenium-shaped driver backed by :class:`FakeMaps`."""

    def __init__(self, maps: FakeMaps, page_size: int = 10, fail_urls: Optional[set[str]] = None):
        self.maps = maps
        self.page_size = page_size
        self.fail_urls = fail_urls or set()
        self.current_url = "about:blank"
        self.scrolls = 0
        self.gets = 0
        self.quit_called = False
        self.timeouts: list[float] = []
        self._html = ""
        self._links: list[str] = []
        self._shown = 0

    # ——— navigation ———

    def get(self, url: str) -> None:
        self.gets += 1
        self.current_url = url
        if "/maps/search/" in url:
            self._links = self.maps.results_for(url)
            self._shown = 0
            self._html = self.maps.feed_html(self._links[: self.page_size])
            return
        business = self.maps.business_for_url(url)
        if business is None or business.broken or url in self.fail_urls:
            raise TimeoutException(f"page did not load: {url[:80]}")
        self._html = self.maps.place_html(business)

    @property
    def page_source(self) -> str:
        return self._html

    def execute_script(self, _script: str, *args) -> None:
        self.scrolls += 1
        self._shown += self.page_size
        self._html = self.maps.feed_html(self._links[: self._shown + self.page_size])

    # ——— element lookup ———

    def find_elements(self, by: str, value: str):
        spec = _selector_to_filter(value)
        if spec is None:
            return []
        soup = BeautifulSoup(self._html or "<html></html>", "html.parser")
        return [FakeElement(node) for node in soup.find_all(True) if _matches(node, spec)]

    def find_element(self, by: str, value: str):
        elements = self.find_elements(by, value)
        if not elements:
            raise NoSuchElementException(f"no such element: {value}")
        return elements[0]

    # ——— lifecycle ———

    def set_page_load_timeout(self, seconds: float) -> None:
        self.timeouts.append(seconds)

    def quit(self) -> None:
        self.quit_called = True

    # ——— test helpers ———

    def parse_qs(self, url: str) -> dict:
        return parse_qs(urlparse(url).query)
