"""One-shot local verification of the scraper against real Google Maps.

This exercises the exact production code path — ``worker/scraper.py`` →
``worker/gmaps_engine.py`` → the `gosom/google-maps-scraper
<https://github.com/gosom/google-maps-scraper>`_ binary → dedupe → filters — and
prints the businesses it extracts. No Zybble app, database or Google Maps API
key is required. **Run it before deploying to Railway.**

Usage (real Google Maps)::

    python worker/smoke_test.py                          # gym in Delhi, 50 leads
    python worker/smoke_test.py "dentists" "Austin, Texas" 5
    python worker/smoke_test.py "roofers" "Dallas" 10 --radius 25000

Requirements: the engine binary on ``PATH`` (or ``GOOGLE_MAPS_SCRAPER_BIN``) and
its Playwright Chromium. The quickest way to get both, identical to Railway::

    docker build -f worker/Dockerfile -t zybble-scraper .
    docker run --rm --shm-size=2g -e ZYBBLE_APP_URL=http://localhost:3000 \\
        -e SCRAPER_WORKER_SECRET=dummy zybble-scraper \\
        python smoke_test.py "dentists" "Austin, Texas" 5

Offline mode (no browser, no network, no Google)::

    python worker/smoke_test.py --simulate "gym" "Delhi" 50

``--simulate`` runs the same code against the CLI double in
``worker/tests/fake_gms.py`` — a real subprocess speaking the upstream flag and
JSONL contract. It verifies the integration, the streaming reader, dedupe,
filters, the counters and the lead payload contract; it cannot verify that
Google still serves the markup the engine expects. Use it in CI, and the real
run before a deploy.

It prints every counter the product reports, so the numbers can be compared
with the Lead Finder UI::

    requested · discovered · unique · duplicates · filtered · errors · coverage
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from filters import LeadFilters  # noqa: E402
from gmaps_engine import EngineUnavailable, GosomEngine, find_binary, upstream_pin  # noqa: E402
from scraper import ScrapeState, engine_summary, run_scrape  # noqa: E402

# The lead payload contract enforced by POST /api/worker/jobs/:id/leads.
LEAD_LIMITS = {
    "company": 300, "category": 200, "address": 500, "city": 160, "state": 160,
    "country": 160, "phone": 100, "website": 1000, "maps_url": 2000,
    "hours": 2000, "description": 2000, "source_query": 300,
    "place_id": 500, "external_id": 500,
}
OPEN_STATUSES = {"open", "closed", "permanently_closed", "unknown"}


def check_lead_contract(places: list) -> list[str]:
    """Every field the API validates, checked before a batch can be rejected."""
    problems: list[str] = []
    for place in places:
        payload = place.json()
        if not payload.get("company"):
            problems.append("a lead has no company name")
        for key, limit in LEAD_LIMITS.items():
            value = payload.get(key)
            if isinstance(value, str) and len(value) > limit:
                problems.append(f"{payload['company'][:30]}: {key} is {len(value)} chars (max {limit})")
        if payload.get("open_status") not in OPEN_STATUSES:
            problems.append(f"{payload['company'][:30]}: open_status={payload.get('open_status')!r}")
        rating = payload.get("rating")
        if rating is not None and not 0.0 <= float(rating) <= 5.0:
            problems.append(f"{payload['company'][:30]}: rating={rating} out of range")
        latitude = payload.get("latitude")
        if latitude is not None and not -90.0 <= float(latitude) <= 90.0:
            problems.append(f"{payload['company'][:30]}: latitude={latitude} out of range")
        longitude = payload.get("longitude")
        if longitude is not None and not -180.0 <= float(longitude) <= 180.0:
            problems.append(f"{payload['company'][:30]}: longitude={longitude} out of range")
        if len(payload.get("social_profiles") or []) > 10:
            problems.append(f"{payload['company'][:30]}: too many social profiles")
    return problems


def build_engine(simulate: bool, tmpdir: str | None) -> tuple[GosomEngine, str]:
    """The real engine, or the offline CLI double that speaks the same contract."""
    if not simulate:
        engine = GosomEngine.from_env()
        try:
            binary = engine.resolve_binary()
        except EngineUnavailable as err:
            print(f"\nFAILED: {err}\n")
            print("Install it with:  docker build -f worker/Dockerfile -t zybble-scraper .")
            print("…or point GOOGLE_MAPS_SCRAPER_BIN at a local build of the pinned upstream tag.")
            raise SystemExit(2)
        return engine, f"google-maps-scraper {engine.version()} ({binary})"

    from tests.fake_gms import FakeEngine, build_world

    fake = FakeEngine(build_world(240, seed=7), tmpdir=tmpdir)
    return fake.engine, f"simulated engine double ({fake.binary})"


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify Zybble's Google Maps scraper end to end.")
    parser.add_argument("query", nargs="?", default="gym", help="Business type, e.g. gym")
    parser.add_argument("location", nargs="?", default="Delhi", help="City, region or country")
    parser.add_argument("limit", nargs="?", type=int, default=50, help="How many unique businesses to collect")
    parser.add_argument("--radius", type=int, default=25_000, help="Search radius in metres (1000-50000)")
    parser.add_argument("--timeout", type=int, default=900, help="Engine time budget in seconds")
    parser.add_argument("--max-tiles", type=int, default=36, help="Maximum viewports to sweep")
    parser.add_argument("--targets-per-run", type=int, default=None,
                        help="Viewports per engine invocation (default: SCRAPER_TARGETS_PER_RUN or 6)")
    parser.add_argument("--simulate", action="store_true",
                        help="Run against the offline engine double instead of real Google Maps")
    parser.add_argument("--json", action="store_true", help="Print the collected leads as JSON")
    args = parser.parse_args()

    pin = upstream_pin()
    tmpdir = tempfile.mkdtemp(prefix="zybble-smoke-") if args.simulate else None
    engine, engine_label = build_engine(args.simulate, tmpdir)

    mode = "SIMULATED (offline double)" if args.simulate else "LIVE Google Maps"
    print(f"Google Maps: '{args.query}' in '{args.location}' · {args.limit} leads · {args.radius} m radius")
    print(f"Mode         : {mode}")
    print(f"Engine       : {engine_label}")
    print(f"Upstream     : {pin.get('upstream', '?')} @ {pin.get('version', '?')} ({pin.get('commit', '?')[:12]})")
    print(f"Concurrency  : -c {engine.concurrency} · pool {engine.browser_pool_size} · "
          f"pages/browser {engine.pages_per_browser} · depth ≤ {engine.depth}")
    print("No Google Maps API key is used.\n")

    collected: list[dict] = []
    places: list = []

    def on_stage(stage: str, percent: float, stats, message: str) -> None:
        print(
            f"  [{stage:<15}] {int(percent):>3}%  "
            f"discovered={stats.discovered} unique={stats.unique} "
            f"dupes={stats.duplicates} filtered={stats.filtered} errors={stats.errors} "
            f"runs={stats.engine_runs} | {message}"
        )

    def on_place(place, position: int, total: int) -> None:
        places.append(place)
        collected.append(place.json())
        print(
            f"   {position:>3}. {place.company}"
            f" — {place.city or place.state or '?'}"
            f" — rating {place.rating}"
            f" — reviews {place.reviews}"
            f" — {place.website or 'no website'}"
            f" — {place.phone or 'no phone'}"
        )

    # The simulation must not depend on the network: geocode from the same
    # fixture the offline test suite uses.
    geocoder = None
    if args.simulate:
        from tests.fake_gms import geocode_stub

        geocoder = geocode_stub

    state = ScrapeState()
    try:
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
            engine=engine,
            geocoder=geocoder,
            max_tiles=args.max_tiles,
            targets_per_batch=args.targets_per_run,
        )
    finally:
        if tmpdir:
            import shutil

            shutil.rmtree(tmpdir, ignore_errors=True)

    stats = result.stats
    print("\n———— Result ————")
    print(f"  requested  : {args.limit}")
    print(f"  discovered : {stats.discovered}  (distinct businesses identified)")
    print(f"  unique     : {stats.unique}  (kept after dedupe + filters)")
    print(f"  duplicates : {stats.duplicates}")
    print(f"  filtered   : {stats.filtered}")
    print(f"  errors     : {stats.errors}")
    print(f"  coverage   : {stats.targets_done}/{stats.targets_total} searches · {stats.engine_runs} engine run(s)")
    print(f"  exhausted  : {result.exhausted}")
    if result.state.plan and result.state.plan.degraded:
        print(f"  note       : {result.state.plan.note}")
    for note in result.state.notes[-5:]:
        print(f"  note       : {note}")

    problems = check_lead_contract(places)
    if problems:
        print("\nFAILED: the lead payload would be rejected by the API:")
        for problem in problems[:10]:
            print(f"  - {problem}")
        return 1
    if places:
        print(f"  lead payload contract: OK ({len(places)} leads, all fields within API limits)")

    if args.json or args.limit <= 20:
        print("\n" + json.dumps(collected, indent=2, ensure_ascii=False))

    if not collected:
        print("\nFAILED: no businesses extracted — see the notes above.")
        return 1

    if len(collected) < args.limit and not result.exhausted:
        print(
            f"\nPARTIAL: {len(collected)}/{args.limit} collected before the time budget. "
            "In production the job resumes from the saved coverage cursor."
        )
        return 0

    label = "SIMULATION PASSED" if args.simulate else "SMOKE TEST PASSED"
    print(f"\n{label} — {len(collected)} businesses through the production code path.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
