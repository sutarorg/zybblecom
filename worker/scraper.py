"""
Zybble scraping worker — Google Maps extraction engine.

Adapted from SoCloseSociety/GoogleMapScraper (MIT License)
https://github.com/SoCloseSociety/GoogleMapScraper

Same two-phase architecture as upstream:
  Phase 1 — scroll the results feed, collect /maps/place/ links
  Phase 2 — visit each place, extract public business details

Preserved upstream traits: headless mode, smart scrolling with
stall detection, randomized delays, crash-safe incremental yield.
"""

from __future__ import annotations

import random
import re
import time
from dataclasses import dataclass, field
from typing import Callable, Iterator, Optional
from urllib.parse import quote_plus

from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

# Upstream-tunable constants
DEFAULT_DELAY = (1.2, 2.6)     # randomized polite delay between loads
PAGE_LOAD_TIMEOUT = 15         # max seconds waiting for elements
SCROLL_PAUSE = 1.4             # pause between feed scrolls
MAX_SCROLL_STALLS = 6          # stop after N scrolls with no new links

MAPS_SEARCH_URL = "https://www.google.com/maps/search/{query}"


@dataclass
class Place:
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    category: Optional[str] = None
    rating: Optional[float] = None
    reviews: Optional[int] = None
    hours: Optional[str] = None
    maps_url: Optional[str] = field(default=None)


def _sleep() -> None:
    time.sleep(random.uniform(*DEFAULT_DELAY))


def _build_driver() -> webdriver.Chrome:
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1380,980")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_argument("--lang=en-US")
    opts.add_argument(
        "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    )
    # Chromium + driver are installed system-wide in the Docker image.
    service = Service("/usr/bin/chromedriver")
    driver = webdriver.Chrome(service=service, options=opts)
    driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT + 10)
    return driver


def collect_place_links(driver: webdriver.Chrome, query: str, limit: int) -> list[str]:
    """Phase 1 (upstream `main.py` flow): scroll feed, harvest place links."""
    url = MAPS_SEARCH_URL.format(query=quote_plus(query))
    driver.get(url)
    _sleep()

    try:
        feed = WebDriverWait(driver, PAGE_LOAD_TIMEOUT).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div[role='feed']"))
        )
    except TimeoutException:
        return []

    links: dict[str, None] = {}
    stalls = 0
    while stalls < MAX_SCROLL_STALLS and len(links) < limit * 3:
        for a in driver.find_elements(By.CSS_SELECTOR, "a[href*='/maps/place/']"):
            href = a.get_attribute("href")
            if href:
                links[href] = None
        before = len(links)

        driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", feed)
        time.sleep(SCROLL_PAUSE + random.uniform(0, 0.6))
        for a in driver.find_elements(By.CSS_SELECTOR, "a[href*='/maps/place/']"):
            href = a.get_attribute("href")
            if href:
                links[href] = None

        if len(links) == before:
            stalls += 1
        else:
            stalls = 0

    return list(links.keys())[:limit]


def _safe_text(driver: webdriver.Chrome, css: str) -> Optional[str]:
    try:
        el = driver.find_element(By.CSS_SELECTOR, css)
        text = (el.text or "").strip()
        return text or None
    except Exception:
        return None


def _safe_attr(driver: webdriver.Chrome, css: str, attr: str) -> Optional[str]:
    try:
        el = driver.find_element(By.CSS_SELECTOR, css)
        value = el.get_attribute(attr)
        return value.strip() if value else None
    except Exception:
        return None


def parse_place_page(driver: webdriver.Chrome, link: str) -> Optional[Place]:
    """Phase 2 (upstream detail extraction): visit a place, parse fields."""
    try:
        driver.get(link)
    except WebDriverException:
        return None
    try:
        WebDriverWait(driver, PAGE_LOAD_TIMEOUT).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "h1"))
        )
    except TimeoutException:
        return None

    name = _safe_text(driver, "h1")
    if not name:
        return None

    address = _safe_attr(driver, "button[data-item-id='address']", "aria-label")
    if address:
        address = re.sub(r"^Address:\s*", "", address)

    phone = _safe_attr(driver, "button[data-item-id^='phone']", "aria-label")
    if phone:
        phone = re.sub(r"^Phone:\s*", "", phone)

    website = _safe_attr(driver, "a[data-item-id='authority']", "href")

    category = _safe_text(driver, "button[jsaction*='category']")

    rating: Optional[float] = None
    reviews: Optional[int] = None
    aria = _safe_attr(driver, "span[role='img'][aria-label*='star']", "aria-label")
    if aria:
        m = re.search(r"([\d.]+)\s*star", aria)
        if m:
            try:
                rating = float(m.group(1))
            except ValueError:
                rating = None
    rating_label = _safe_text(driver, "div.F7nice span[aria-hidden='true']")
    if not rating and rating_label:
        try:
            rating = float(rating_label.replace(",", "."))
        except ValueError:
            pass
    reviews_label = _safe_attr(driver, "button[jsaction*='reviewChart']", "aria-label")
    if not reviews_label:
        reviews_label = _safe_text(driver, "span[aria-label$='reviews'], span[aria-label$='review']")
    if reviews_label:
        m = re.search(r"([\d,]+)\s*review", reviews_label)
        if m:
            try:
                reviews = int(m.group(1).replace(",", ""))
            except ValueError:
                reviews = None

    hours = None
    hours_aria = _safe_attr(driver, "button[data-item-id^='oh']", "aria-label")
    if hours_aria:
        # aria-label contains a compact schedule, e.g. "Hours: Monday 9am–6pm; ..."
        hours = re.sub(r"\s+", " ", hours_aria.replace("Hours:", "")).strip("; ").strip()
        if len(hours) > 220:
            hours = hours[:220] + "…"

    return Place(
        name=name,
        address=address,
        phone=phone,
        website=website,
        category=category,
        rating=rating,
        reviews=reviews,
        hours=hours,
        maps_url=link.split("?")[0],
    )


def scrape_places(
    query: str,
    limit: int,
    on_place: Callable[[Place], None],
) -> int:
    """
    Full upstream pipeline for one search query.
    `on_place` is called incrementally after every extraction —
    making the run crash-safe exactly like upstream's append-to-CSV.
    Returns the number of places successfully extracted.
    """
    driver = _build_driver()
    extracted = 0
    try:
        links = collect_place_links(driver, query, limit)
        for link in links:
            _sleep()
            place = parse_place_page(driver, link)
            if place is None:
                continue
            try:
                on_place(place)
                extracted += 1
            except Exception:
                # Caller-side persistence failure must not kill the scrape.
                continue
            if extracted >= limit:
                break
    finally:
        try:
            driver.quit()
        except Exception:
            pass
    return extracted
