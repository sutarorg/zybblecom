"""One-shot local verification of the scraper against real Google Maps.

This exercises the exact production code path (worker/scraper.py → the vendored
GoogleMapScraper core) with a real search and prints the extracted businesses —
no Zybble app, database or Google Maps API key required. Run it before
deploying to Railway.

Usage:
    python worker/smoke_test.py                          # gym in Delhi, 50 leads
    python worker/smoke_test.py "dentists" "Mumbai" 50
    python worker/smoke_test.py "roofers" "Dallas" 10 --radius 25000

Requirements (local machine, not Docker):
    pip install -r worker/requirements.txt
    Chrome installed. Chromedriver is resolved automatically by Selenium
    Manager; set CHROMEDRIVER_PATH if you have a specific driver binary.

It prints every counter the product reports, so the numbers can be compared
with the Lead Finder UI:
    requested · discovered · unique · duplicates · filtered · errors · coverage
"""

from __future__ import annotations

import argparse
import json
import sys

from filters import LeadFilters
from scraper import ScrapeState, run_scrape


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify Zybble's Google Maps scraper against live Maps.")
    parser.add_argument("query", nargs="?", default="gym", help="Business type, e.g. gym")
    parser.add_argument("location", nargs="?", default="Delhi", help="City, region or country")
    parser.add_argument("limit", nargs="?", type=int, default=50, help="How many unique businesses to collect")
    parser.add_argument("--radius", type=int, default=25_000, help="Search radius in metres (1000-50000)")
    parser.add_argument("--timeout", type=int, default=900, help="Browser time budget in seconds")
    parser.add_argument("--max-tiles", type=int, default=36, help="Maximum viewports to sweep")
    args = parser.parse_args()

    print(f"Google Maps: '{args.query}' in '{args.location}' · {args.limit} leads · {args.radius} m radius")
    print("Discovery engine: GoogleMapScraper (vendored) — no Google Maps API key\n")

    collected: list[dict] = []

    def on_stage(stage: str, percent: float, stats, message: str) -> None:
        print(
            f"  [{stage:<15}] {int(percent):>3}%  "
            f"discovered={stats.discovered} unique={stats.unique} "
            f"dupes={stats.duplicates} filtered={stats.filtered} errors={stats.errors} "
            f"| {message}"
        )

    def on_place(place, position: int, total: int) -> None:
        collected.append(place.json())
        print(
            f"   {position:>3}. {place.company}"
            f" — {place.city or place.state or '?'}"
            f" — rating {place.rating}"
            f" — reviews {place.reviews}"
            f" — {place.website or 'no website'}"
            f" — {place.phone or 'no phone'}"
        )

    state = ScrapeState()
    result = run_scrape(
        query=args.query,
        location=args.location,
        radius_meters=args.radius,
        limit=args.limit,
        timeout_seconds=args.timeout,
        filters=LeadFilters(),
        state=state,
        on_stage=on_stage,
        on_place=on_place,
        max_tiles=args.max_tiles,
    )

    stats = result.stats
    print("\n———— Result ————")
    print(f"  requested  : {args.limit}")
    print(f"  discovered : {stats.discovered}  (distinct businesses identified)")
    print(f"  unique     : {stats.unique}  (kept after dedupe + filters)")
    print(f"  duplicates : {stats.duplicates}")
    print(f"  filtered   : {stats.filtered}")
    print(f"  errors     : {stats.errors}")
    print(f"  coverage   : {stats.targets_done}/{stats.targets_total} searches")
    print(f"  exhausted  : {result.exhausted}")
    if result.state.plan and result.state.plan.degraded:
        print(f"  note       : {result.state.plan.note}")

    if args.limit <= 20:
        print("\n" + json.dumps(collected, indent=2, ensure_ascii=False))

    if not collected:
        print("\nFAILED: no businesses extracted — see the errors above.")
        return 1

    if len(collected) < args.limit and not result.exhausted:
        print(
            f"\nPARTIAL: {len(collected)}/{args.limit} collected before the time budget. "
            "In production the job resumes from the saved coverage cursor."
        )
        return 0

    print(f"\nSMOKE TEST PASSED — {len(collected)} real businesses from Google Maps.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
