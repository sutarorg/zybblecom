"""One-shot local verification of the scraper against real Google Maps.

This exercises the exact production code path (worker/scraper.py) with a real
search and prints the extracted businesses — no Zybble app, database or API
key required. Run it before deploying to Railway.

Usage:
    python worker/smoke_test.py                       # dentists in Austin
    python worker/smoke_test.py "roofers" "Dallas" 10

Requirements (local machine, not Docker):
    pip install -r worker/requirements.txt
    Chrome installed. Chromedriver is resolved automatically by Selenium
    Manager; set CHROMEDRIVER_PATH if you have a specific driver binary.
"""

from __future__ import annotations

import json
import sys

from scraper import run_scrape


def main() -> int:
    query = sys.argv[1] if len(sys.argv) > 1 else "dentists"
    location = sys.argv[2] if len(sys.argv) > 2 else "Austin, Texas"
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else 5

    print(f"Searching Google Maps for '{query}' in '{location}' (limit {limit})…")

    places: list[dict] = []

    def on_links(percent: int) -> None:
        print(f"  [phase 1] collecting result links… {percent}%")

    def on_place(place, index: int, total: int) -> None:
        places.append(place.json())
        print(
            f"  [phase 2] {index}/{total}: {place.company}"
            f" — {place.city or place.state or '?'}"
            f" — rating {place.rating}"
            f" — reviews {place.reviews}"
            f" — {place.website or 'no website'}"
        )

    extracted = run_scrape(
        query=query,
        location=location,
        radius_meters=25000,
        limit=limit,
        timeout_seconds=600,
        on_links_progress=on_links,
        on_place=on_place,
    )

    print(json.dumps(places, indent=2))
    print(f"Extracted {extracted} real businesses from Google Maps.")
    if extracted == 0:
        print("FAILED: no businesses extracted — see errors above.")
        return 1
    print("SMOKE TEST PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
