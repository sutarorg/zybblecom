"""Google Maps extraction engine adapted for Zybble.

Adapted from SoCloseSociety/GoogleMapScraper (MIT):
https://github.com/SoCloseSociety/GoogleMapScraper

The upstream two-phase design is preserved:
  1. smart-scroll the results feed and collect unique /maps/place/ URLs
  2. visit each URL and extract public business details

Zybble additions: radius-aware viewport, multiple selector fallbacks, consent
handling, deadline checks, progress callbacks, bounded resource use, and
guaranteed browser cleanup.
"""

from __future__ import annotations

import math
import random
import re
import time
from dataclasses import asdict, dataclass
from typing import Callable, Optional
from urllib.parse import quote_plus

import requests
from selenium import webdriver
from selenium.common.exceptions import StaleElementReferenceException, TimeoutException, WebDriverException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

PAGE_TIMEOUT = 18
SCROLL_PAUSE = 1.2
MAX_STALLS = 8


class SelectorChangedError(RuntimeError):
    """The page loaded but no known Google Maps results layout was found."""


class JobTimeout(RuntimeError):
    pass


@dataclass
class Place:
    external_id: Optional[str]
    company: str
    category: str
    address: str
    city: str
    state: str
    country: str
    phone: Optional[str]
    website: Optional[str]
    maps_url: str
    rating: Optional[float]
    reviews: Optional[int]
    hours: Optional[str]
    description: Optional[str] = None

    def json(self) -> dict:
        return asdict(self)


def _driver() -> webdriver.Chrome:
    options = Options()
    for arg in (
        "--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
        "--disable-gpu", "--window-size=1440,1000", "--lang=en-US",
        "--disable-blink-features=AutomationControlled",
        "--disable-background-networking", "--disable-extensions",
    ):
        options.add_argument(arg)
    options.add_argument(
        "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    )
    driver = webdriver.Chrome(service=Service("/usr/bin/chromedriver"), options=options)
    driver.set_page_load_timeout(PAGE_TIMEOUT + 10)
    return driver


def _check(deadline: float) -> None:
    if time.monotonic() >= deadline:
        raise JobTimeout("The scrape exceeded its job timeout and will be retried")


def _sleep(low: float = 0.7, high: float = 1.7) -> None:
    time.sleep(random.uniform(low, high))


def _geocode(location: str) -> Optional[tuple[float, float]]:
    """No-key geocoding for the viewport. Search still runs in Google Maps."""
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": location, "format": "jsonv2", "limit": 1},
            headers={"User-Agent": "ZybbleBusinessResearch/1.0 (+https://zybble.com/about)"},
            timeout=8,
        )
        data = response.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except (requests.RequestException, ValueError, KeyError, IndexError):
        pass
    return None


def _zoom(radius_meters: int) -> float:
    # At 1440px, this frames roughly 2× the requested radius.
    return max(8.0, min(17.0, math.log2(40_075_000 / max(2_000, radius_meters * 2))))


def _dismiss_consent(driver: webdriver.Chrome) -> None:
    for selector in (
        "button[aria-label*='Accept all']", "button[aria-label*='Reject all']",
        "form[action*='consent'] button", "button[jsname='b3VHJd']",
    ):
        try:
            button = driver.find_element(By.CSS_SELECTOR, selector)
            button.click()
            _sleep(0.3, 0.7)
            return
        except Exception:
            continue


def search_url(query: str, location: str, radius_meters: int) -> str:
    text = quote_plus(f"{query} in {location}")
    center = _geocode(location)
    if center:
        lat, lng = center
        return f"https://www.google.com/maps/search/{text}/@{lat:.6f},{lng:.6f},{_zoom(radius_meters):.2f}z"
    return f"https://www.google.com/maps/search/{text}"


def collect_links(
    driver: webdriver.Chrome,
    query: str,
    location: str,
    radius_meters: int,
    limit: int,
    deadline: float,
    progress: Callable[[int], None],
) -> list[str]:
    driver.get(search_url(query, location, radius_meters))
    _dismiss_consent(driver)
    _sleep(1.0, 2.0)

    feed = None
    for selector in ("div[role='feed']", "div[aria-label*='Results for']", "div[aria-label*='Results']"):
        try:
            feed = WebDriverWait(driver, 6).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, selector))
            )
            break
        except TimeoutException:
            continue

    # A single-result search sometimes opens a place directly.
    if feed is None and "/maps/place/" in driver.current_url:
        return [driver.current_url]
    if feed is None:
        page = driver.page_source.lower()
        if "unusual traffic" in page or "not a robot" in page:
            raise RuntimeError("Google Maps presented a traffic challenge; retrying with a clean session")
        raise SelectorChangedError(
            "Google Maps results layout was not recognized. All selector fallbacks failed; update scraper.py selectors."
        )

    links: dict[str, None] = {}
    stalls = 0
    while stalls < MAX_STALLS and len(links) < limit:
        _check(deadline)
        before = len(links)
        for selector in ("a[href*='/maps/place/']", "a.hfpxzc", "a[jsaction*='place']"):
            try:
                for anchor in driver.find_elements(By.CSS_SELECTOR, selector):
                    href = anchor.get_attribute("href")
                    if href and "/maps/place/" in href:
                        links[href.split("&entry=")[0]] = None
                        if len(links) >= limit:
                            break
            except StaleElementReferenceException:
                continue
        progress(min(28, 5 + int((len(links) / max(1, limit)) * 23)))
        if len(links) >= limit:
            break
        try:
            driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", feed)
        except StaleElementReferenceException:
            feed = driver.find_element(By.CSS_SELECTOR, "div[role='feed']")
        _sleep(SCROLL_PAUSE, SCROLL_PAUSE + 0.7)
        stalls = stalls + 1 if len(links) == before else 0
    return list(links)[:limit]


def _text(driver: webdriver.Chrome, selectors: tuple[str, ...]) -> Optional[str]:
    for selector in selectors:
        try:
            value = driver.find_element(By.CSS_SELECTOR, selector).text.strip()
            if value:
                return value
        except Exception:
            pass
    return None


def _attr(driver: webdriver.Chrome, selectors: tuple[str, ...], attr: str) -> Optional[str]:
    for selector in selectors:
        try:
            value = driver.find_element(By.CSS_SELECTOR, selector).get_attribute(attr)
            if value and value.strip():
                return value.strip()
        except Exception:
            pass
    return None


def _address_parts(full: str) -> tuple[str, str, str, str]:
    parts = [item.strip() for item in full.split(",") if item.strip()]
    street = parts[0] if parts else ""
    city = parts[1] if len(parts) > 1 else ""
    state = re.sub(r"\s+\d[\d -]*$", "", parts[2]).strip() if len(parts) > 2 else ""
    country = parts[-1] if len(parts) > 3 else ""
    return street, city, state, country


def extract_place(driver: webdriver.Chrome, url: str, deadline: float) -> Optional[Place]:
    _check(deadline)
    try:
        driver.get(url)
        WebDriverWait(driver, PAGE_TIMEOUT).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "h1, [role='main']"))
        )
    except (TimeoutException, WebDriverException):
        return None

    company = _text(driver, ("h1.DUwDvf", "h1.fontHeadlineLarge", "h1"))
    if not company:
        return None

    address = _attr(
        driver,
        ("button[data-item-id='address']", "button[aria-label^='Address:']"),
        "aria-label",
    )
    address = re.sub(r"^Address:\s*", "", address or "")
    street, city, state, country = _address_parts(address)

    phone = _attr(
        driver,
        ("button[data-item-id^='phone']", "button[aria-label^='Phone:']"),
        "aria-label",
    )
    phone = re.sub(r"^Phone:\s*", "", phone or "") or None
    website = _attr(
        driver,
        ("a[data-item-id='authority']", "a[aria-label^='Website:']"),
        "href",
    )
    category = _text(
        driver,
        ("button[jsaction*='category']", "button.DkEaL", "div.fontBodyMedium button"),
    ) or ""

    rating = None
    rating_text = _text(driver, ("div.F7nice span[aria-hidden='true']", "span.ceNzKf"))
    if rating_text:
        match = re.search(r"([0-5](?:[.,]\d)?)", rating_text)
        if match:
            try:
                rating = float(match.group(1).replace(",", "."))
            except ValueError:
                pass

    reviews = None
    reviews_label = _attr(
        driver,
        ("button[jsaction*='reviewChart']", "button[aria-label*='reviews']"),
        "aria-label",
    )
    if reviews_label:
        match = re.search(r"([\d,]+)\s+reviews?", reviews_label)
        if match:
            reviews = int(match.group(1).replace(",", ""))

    hours = _attr(
        driver,
        ("button[data-item-id^='oh']", "button[aria-label^='Hours:']"),
        "aria-label",
    )
    if hours:
        hours = re.sub(r"^Hours:\s*", "", re.sub(r"\s+", " ", hours))[:2000]

    place_id = None
    match = re.search(r"!1s([^!]+)", driver.current_url)
    if match:
        place_id = match.group(1)

    return Place(
        external_id=place_id,
        company=company,
        category=category,
        address=street,
        city=city,
        state=state,
        country=country,
        phone=phone,
        website=website,
        maps_url=driver.current_url.split("?authuser=")[0],
        rating=rating,
        reviews=reviews,
        hours=hours,
    )


def run_scrape(
    query: str,
    location: str,
    radius_meters: int,
    limit: int,
    timeout_seconds: int,
    on_links_progress: Callable[[int], None],
    on_place: Callable[[Place, int, int], None],
) -> int:
    """Run one bounded browser session. Chrome is always quit in finally."""
    deadline = time.monotonic() + timeout_seconds
    driver = _driver()
    extracted = 0
    try:
        links = collect_links(
            driver, query, location, radius_meters, limit, deadline, on_links_progress
        )
        if not links:
            return 0
        for index, link in enumerate(links):
            _check(deadline)
            _sleep()
            place = extract_place(driver, link, deadline)
            if place:
                extracted += 1
                on_place(place, index + 1, len(links))
        return extracted
    finally:
        try:
            driver.quit()
        except Exception:
            pass