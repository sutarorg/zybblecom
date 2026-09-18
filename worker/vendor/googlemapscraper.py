"""Vendored core of SoCloseSociety/GoogleMapScraper (MIT License).

Upstream repository : https://github.com/SoCloseSociety/GoogleMapScraper
Upstream copyright  : Copyright (c) 2022-2026 SoClose Community (soclose.com)
Upstream license    : MIT — see LICENSE-GoogleMapScraper.txt beside this file.

Zybble's Google Maps discovery engine is built on this upstream two-phase
algorithm. Zybble runs the same navigation against real Google Maps — no
Google Maps API key, no Places API, no Geocoding API:

    Phase 1  collect_links(driver, url)    smart-scroll the results feed and
             collect every unique /maps/place/ URL that can be reached.
    Phase 2  extract_details(driver, link) visit one place URL and read the
             public business panel — name, address, website, phone, hours.

Deliberately NOT vendored
-------------------------
Upstream's argparse CLI (``main.py``), its pandas CSV writer and its
``webdriver_manager`` bootstrap. Zybble owns the browser lifecycle (system
chromium + chromedriver in the Railway image), streams results straight into
its own Supabase pipeline and never writes CSV files.

Zybble modifications to the two vendored functions (all documented inline):
  * the WebDriver is injected instead of created inside the functions, so the
    caller owns lifecycle, headless flags, timeouts and guaranteed cleanup;
  * loops accept ``max_links`` / ``deadline`` / ``on_progress`` so a scrape is
    bounded and reports progress (upstream ran unbounded until it stalled);
  * every field lookup is defensive — a missing panel yields ``None`` instead
    of raising, so one unusual listing cannot abort a batch;
  * ``canonical_place_url`` collapses the tracking parameters Google appends to
    result links, which is what makes cross-tile deduplication possible.

Everything else — scroll-the-feed strategy, stall detection and the
aria-label / data-item-id panel parsing — is upstream's algorithm.
"""

from __future__ import annotations

import random
import re
import time
from typing import Callable, Optional
from urllib.parse import urlsplit, urlunsplit

from bs4 import BeautifulSoup
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

# ——— Upstream constants (unchanged) ———
DEFAULT_DELAY = (2, 4)  # random delay range between requests (seconds)
PAGE_LOAD_TIMEOUT = 15  # max wait for page elements (seconds)
SCROLL_PAUSE = 1.5  # pause between scrolls (seconds)
MAX_SCROLL_STALLS = 15  # stop scrolling after N stalls with no new links

# ——— Zybble additions ———
FEED_SELECTOR = 'div[role="feed"]'
PLACE_LINK_MARKER = "/maps/place/"

# Google appends tracking/entry parameters to feed links; the same business can
# appear under several of them across tiles and query variants.
_TRACKING_PARAMS = ("entry=", "g_ep=", "utm_", "sa=", "ved=", "source=", "hl=", "authuser=")


def canonical_place_url(href: str) -> str:
    """Collapse Google's tracking noise so one business has one stable URL.

    The ``data=`` payload (which carries the place id) is preserved because it
    is the strongest identifier Google exposes in a search result link.
    """
    raw = (href or "").strip()
    if not raw:
        return ""
    try:
        parts = urlsplit(raw)
    except ValueError:
        return raw
    path = parts.path
    query = parts.query
    if query:
        kept = [
            segment
            for segment in query.split("&")
            if segment and not segment.startswith(_TRACKING_PARAMS)
        ]
        query = "&".join(kept)
    if parts.scheme and parts.netloc:
        return urlunsplit((parts.scheme, parts.netloc, path, query, ""))
    return urlunsplit(("", "", path, query, ""))


def random_delay(bounds: tuple[float, float] = DEFAULT_DELAY) -> None:
    """Sleep a random duration within *bounds* (upstream behaviour)."""
    time.sleep(random.uniform(*bounds))


def _feed_visible(driver, timeout: int = PAGE_LOAD_TIMEOUT):
    """Wait for the results feed; return the element or None."""
    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, FEED_SELECTOR))
        )
    except (TimeoutException, WebDriverException):
        return None
    try:
        return driver.find_element(By.CSS_SELECTOR, FEED_SELECTOR)
    except (WebDriverException, Exception):  # noqa: BLE001 - defensive, Selenium raises many types
        return None


def collect_links(
    driver,
    url: str,
    max_links: Optional[int] = None,
    deadline: Optional[float] = None,
    on_progress: Optional[Callable[[int], None]] = None,
    pause: float = SCROLL_PAUSE,
    max_stalls: int = MAX_SCROLL_STALLS,
    wait_timeout: int = PAGE_LOAD_TIMEOUT,
    sleep: Callable[[float], None] = time.sleep,
) -> list[str]:
    """Phase 1 (upstream algorithm) — scroll the feed and collect place URLs.

    Stops when the feed stalls (``max_stalls`` consecutive scrolls with no new
    link, i.e. Google says "You've reached the end of the list"), when
    ``max_links`` is reached, or when ``deadline`` (``time.monotonic``) passes.
    """
    driver.get(url + "&hl=en")
    feed = _feed_visible(driver, wait_timeout)
    if feed is None:
        return []

    links: set[str] = set()
    stall_count = 0

    while True:
        if deadline is not None and time.monotonic() >= deadline:
            break

        prev_count = len(links)

        # Parse the current page source (upstream strategy: BeautifulSoup).
        soup = BeautifulSoup(driver.page_source, "html.parser")
        for anchor in soup.find_all("a", href=True):
            href = anchor["href"]
            if PLACE_LINK_MARKER in href:
                canonical = canonical_place_url(href)
                if canonical:
                    links.add(canonical)
                if max_links and len(links) >= max_links:
                    break

        if on_progress:
            on_progress(len(links))

        if max_links and len(links) >= max_links:
            break

        if len(links) == prev_count:
            stall_count += 1
            if stall_count >= max_stalls:
                break
        else:
            stall_count = 0

        try:
            driver.execute_script(
                "arguments[0].scrollTop = arguments[0].scrollHeight", feed
            )
        except (WebDriverException, Exception):  # noqa: BLE001 - stale element / detached feed
            feed = _feed_visible(driver, wait_timeout)
            if feed is None:
                break
        sleep(pause)

    return sorted(links)


def extract_details(
    driver,
    link: str,
    wait_timeout: int = PAGE_LOAD_TIMEOUT,
) -> dict:
    """Phase 2 (upstream algorithm) — read the public business panel.

    Returns a dict with keys ``name``, ``address``, ``website``, ``phone`` and
    ``schedule``. Any field Google does not expose is ``None``; a page that
    never renders its heading returns an empty dict, exactly like upstream.
    """
    driver.get(link + "&hl=en")
    try:
        WebDriverWait(driver, wait_timeout).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "h1"))
        )
    except (TimeoutException, WebDriverException):
        return {}

    soup = BeautifulSoup(driver.page_source, "html.parser")

    data = {
        "name": None,
        "address": None,
        "website": None,
        "phone": None,
        "schedule": None,
    }

    heading = soup.find("h1")
    if heading:
        data["name"] = heading.get_text(strip=True) or None

    # Information panel: upstream walks every labelled container.
    for div in soup.find_all("div", attrs={"aria-label": True}):
        label = div["aria-label"]

        if "Information for" in label:
            button = div.find("button", attrs={"data-item-id": "address"})
            if button:
                data["address"] = button.get_text(strip=True) or None

            anchor = div.find("a", attrs={"data-item-id": "authority"})
            if anchor and anchor.get("href"):
                data["website"] = anchor["href"]

            for button in div.find_all("button", attrs={"aria-label": True}):
                if "Phone" in button["aria-label"]:
                    data["phone"] = button.get_text(strip=True) or None
                    break

        elif "opening hours" in label.lower() or "open hours" in label.lower():
            parts = label.split(".")
            if parts and len(parts[0]) > 0:
                data["schedule"] = parts[0].replace(",", " -> ")

    return data


def looks_like_challenge(page_source: str) -> bool:
    """True when Google served a bot/traffic challenge instead of results."""
    text = (page_source or "").lower()
    return "unusual traffic" in text or "not a robot" in text


PLACE_ID_RE = re.compile(r"!1s(0x[0-9a-f]+:0x[0-9a-f]+|[^!?&]+)")


def place_id_from_url(url: str) -> Optional[str]:
    """Extract the stable place id Google embeds in a Maps URL (best effort)."""
    if not url:
        return None
    match = PLACE_ID_RE.search(url)
    return match.group(1) if match else None


__all__ = [
    "DEFAULT_DELAY",
    "MAX_SCROLL_STALLS",
    "PAGE_LOAD_TIMEOUT",
    "PLACE_LINK_MARKER",
    "SCROLL_PAUSE",
    "canonical_place_url",
    "collect_links",
    "extract_details",
    "looks_like_challenge",
    "place_id_from_url",
    "random_delay",
]
