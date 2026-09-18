"""End-to-end discovery behaviour against the offline engine simulator.

These tests run the **real** engine path — ``scraper.run_scrape`` → coverage plan
→ ``gmaps_engine.GosomEngine`` → subprocess → streamed JSONL → dedupe → filters —
with the CLI double from ``tests/fake_gms.py`` standing in for
`gosom/google-maps-scraper`. Nothing here is mocked *data*: the JSON the double
emits is the upstream ``gmaps.Entry`` shape, and every assertion is about
Zybble's behaviour.
"""

from __future__ import annotations

import unittest

from filters import LeadFilters
from gmaps_engine import EngineFailure, EngineTarget, EngineUnavailable, GosomEngine
from scraper import (
    STAGE_COLLECTING,
    STAGE_DEDUPLICATING,
    STAGE_SEARCHING,
    ChallengeError,
    JobTimeout,
    Place,
    ScrapeState,
    build_search_url,
    collect_percent,
    depth_for,
    entry_to_place,
    format_hours,
    map_open_status,
    place_key,
    run_scrape,
    site_key,
    split_address,
    targets_per_run,
)
from tests.fake_gms import (
    MUMBAI_BOX,
    FakeBusiness,
    FakeEngine,
    build_world,
    geocode_stub,
)


def run(
    query="gym",
    location="Delhi",
    limit=50,
    radius=25_000,
    world=None,
    filters=None,
    state=None,
    fake=None,
    mode="ok",
    targets_per_batch=None,
    should_stop=None,
    engine=None,
    **env,
):
    """Run the real sweep against the simulator and capture every callback."""
    fake = fake or FakeEngine(
        world if world is not None else build_world(240, seed=7), mode=mode, **env
    )
    stages: list[tuple[str, float, str]] = []
    places: list[Place] = []
    saved: list[dict] = []

    def on_stage(stage, percent, stats, message):
        stages.append((stage, percent, message))

    def on_place(place, position, total):
        places.append(place)
        saved.append(place.json())

    result = run_scrape(
        query=query,
        location=location,
        radius_meters=radius,
        limit=limit,
        timeout_seconds=600,
        filters=filters or LeadFilters(),
        state=state,
        on_stage=on_stage,
        on_place=on_place,
        engine=engine or fake.engine,
        geocoder=geocode_stub,
        max_tiles=36,
        targets_per_batch=targets_per_batch,
        should_stop=should_stop,
    )
    return result, places, stages, fake, saved


class PlaceKeyTest(unittest.TestCase):
    def test_key_prefers_place_id_then_url_then_name_and_address(self):
        with_id = Place(company="A", place_id="ChIJxyz", maps_url="https://maps.google.com/place/x")
        self.assertEqual(place_key(with_id), "pid:ChIJxyz")

        same_business_different_params = Place(
            company="A", maps_url="https://www.google.com/maps/place/A/data=x?entry=ttu&hl=en", address="1 Main"
        )
        same_business_clean = Place(company="A", maps_url="https://www.google.com/maps/place/A/data=x")
        self.assertEqual(place_key(same_business_different_params), place_key(same_business_clean))

        no_url = Place(company="Iron Yard", address="12 Main Road")
        self.assertEqual(place_key(no_url), place_key(Place(company="iron  yard!", address="12 main road")))

    def test_url_builder_has_no_api_key(self):
        self.assertNotIn("key=", build_search_url("gym", "Delhi"))


class EntryMappingTest(unittest.TestCase):
    """Upstream `gmaps.Entry` JSON → Zybble's lead record."""

    def entry(self, **overrides) -> dict:
        base = FakeBusiness(
            place_id="0x390ce19d0000:0xa1b2c30000",
            google_place_id="ChIJD1234567890abcdefg",
            company="Iron Yard Gym",
            category="Gym",
            address="12 Main Road",
            borough="Connaught Place",
            city="New Delhi",
            state="Delhi",
            postal_code="110001",
            country="India",
            phone="+91 11 4000 0000",
            website="https://ironyard.example.in",
            rating=4.6,
            reviews=312,
            open_status="open",
            description="Strength training in the heart of Delhi.",
            lat=28.6139,
            lng=77.2090,
        )
        entry = base.entry(input_id="t3")
        entry.update(overrides)
        return entry

    def test_all_public_fields_are_mapped(self):
        place = entry_to_place(self.entry(), source_query="gym in Delhi · area 2/16")
        assert place is not None
        self.assertEqual(place.company, "Iron Yard Gym")
        self.assertEqual(place.category, "Gym")
        self.assertEqual(place.phone, "+91 11 4000 0000")
        self.assertEqual(place.website, "https://ironyard.example.in")
        self.assertEqual(place.rating, 4.6)
        self.assertEqual(place.reviews, 312)
        self.assertEqual(place.open_status, "open")
        self.assertEqual(place.country, "India")
        self.assertEqual(place.state, "Delhi")
        self.assertEqual(place.city, "New Delhi")
        self.assertIn("Main Road", place.address)
        self.assertEqual(place.latitude, 28.6139)
        self.assertEqual(place.longitude, 77.2090)
        self.assertEqual(place.source_query, "gym in Delhi · area 2/16")
        self.assertIn("Strength training", place.description or "")
        self.assertIn("/maps/place/", place.maps_url)

    def test_place_id_and_external_id_come_from_google(self):
        place = entry_to_place(self.entry())
        assert place is not None
        self.assertEqual(place.place_id, "ChIJD1234567890abcdefg")
        self.assertEqual(place.external_id, "0x390ce19d0000:0xa1b2c30000")
        self.assertEqual(place_key(place), f"pid:{place.place_id}")

    def test_a_missing_place_id_falls_back_to_the_cid(self):
        place = entry_to_place(self.entry(place_id="", cid="0x1:0x2"))
        assert place is not None
        self.assertEqual(place.place_id, "0x1:0x2")

    def test_the_legacy_misspelled_longitude_key_is_still_read(self):
        entry = self.entry()
        del entry["longitude"]
        place = entry_to_place(entry)
        assert place is not None
        self.assertEqual(place.longitude, 77.209)

    def test_coordinates_are_recovered_from_the_maps_url(self):
        entry = self.entry(latitude=0, longitude=0, longtitude=0,
                           link="https://www.google.com/maps/place/Iron+Yard/@28.613900,77.209000,17z/data=!4m2")
        place = entry_to_place(entry)
        assert place is not None
        self.assertEqual(place.latitude, 28.6139)
        self.assertEqual(place.longitude, 77.209)

    def test_absent_values_stay_absent(self):
        place = entry_to_place(self.entry(review_rating=0, review_count=0, web_site="", phone="",
                                          status="", description="", open_hours={}))
        assert place is not None
        self.assertIsNone(place.rating)
        self.assertIsNone(place.reviews)
        self.assertIsNone(place.website)
        self.assertIsNone(place.phone)
        self.assertIsNone(place.description)
        self.assertIsNone(place.hours)
        self.assertEqual(place.open_status, "unknown")

    def test_out_of_range_coordinates_are_dropped_not_sent(self):
        place = entry_to_place(self.entry(latitude=999.0, longitude=-1000.0,
                                          link="https://www.google.com/maps/place/x"))
        assert place is not None
        self.assertIsNone(place.latitude)
        self.assertIsNone(place.longitude)

    def test_long_google_text_is_clipped_to_the_api_limits(self):
        """Every value must fit the column limits the API enforces."""
        from scraper import (
            LIMIT_ADDRESS,
            LIMIT_CATEGORY,
            LIMIT_CITY,
            LIMIT_COMPANY,
            LIMIT_COUNTRY,
            LIMIT_DESCRIPTION,
            LIMIT_PHONE,
            LIMIT_STATE,
        )

        place = entry_to_place(self.entry(
            title="t" * 900,
            description="d" * 5000,
            category="c" * 400,
            phone="1" * 300,
            complete_address={
                "street": "a" * 900,
                "city": "i" * 400,
                "state": "s" * 400,
                "country": "o" * 400,
                "postal_code": "1" * 50,
            },
        ))
        assert place is not None
        self.assertEqual(len(place.company), LIMIT_COMPANY)
        self.assertLessEqual(len(place.description or ""), LIMIT_DESCRIPTION)
        self.assertLessEqual(len(place.address), LIMIT_ADDRESS)
        self.assertLessEqual(len(place.category), LIMIT_CATEGORY)
        self.assertLessEqual(len(place.phone or ""), LIMIT_PHONE)
        self.assertLessEqual(len(place.city), LIMIT_CITY)
        self.assertLessEqual(len(place.state), LIMIT_STATE)
        self.assertLessEqual(len(place.country), LIMIT_COUNTRY)

    def test_a_nameless_entry_is_never_turned_into_a_lead(self):
        self.assertIsNone(entry_to_place(self.entry(title="")))
        self.assertIsNone(entry_to_place(self.entry(title="   ")))
        self.assertIsNone(entry_to_place({}))
        self.assertIsNone(entry_to_place("not-an-entry"))  # type: ignore[arg-type]

    def test_the_payload_is_exactly_the_api_contract(self):
        """No engine-only field may leak into POST /api/worker/jobs/:id/leads."""
        place = entry_to_place(self.entry(emails=["hello@ironyard.example.in"]))
        assert place is not None
        self.assertEqual(place.email_candidates, ["hello@ironyard.example.in"])
        self.assertEqual(
            set(place.json()),
            {
                "company", "category", "address", "city", "state", "country", "phone",
                "website", "maps_url", "rating", "reviews", "hours", "open_status",
                "place_id", "external_id", "latitude", "longitude", "social_profiles",
                "source_query", "description",
            },
        )

    def test_opening_status_is_mapped_onto_the_four_allowed_values(self):
        cases = {
            "Open ⋅ Closes 10 PM": "open",
            "Open 24 hours": "open",
            "Closed ⋅ Opens 6 AM": "closed",
            "Temporarily closed": "closed",
            "Permanently closed": "permanently_closed",
            "": "unknown",
            "Something Google invented": "unknown",
        }
        for raw, expected in cases.items():
            self.assertEqual(map_open_status(raw), expected, raw)
        for value in cases.values():
            self.assertIn(value, {"open", "closed", "permanently_closed", "unknown"})

    def test_hours_are_rendered_in_a_stable_week_order(self):
        rendered = format_hours({"Sunday": ["Closed"], "Monday": ["6 AM–10 PM"], "Tuesday": ["6 AM–10 PM", "4 PM–9 PM"]})
        assert rendered is not None
        self.assertTrue(rendered.startswith("Monday: "))
        self.assertLess(rendered.index("Tuesday"), rendered.index("Sunday"))
        self.assertIn("6 AM–10 PM, 4 PM–9 PM", rendered)
        self.assertIsNone(format_hours({}))
        self.assertIsNone(format_hours(None))
        self.assertIsNone(format_hours("not-a-map"))

    def test_an_address_without_parts_is_still_split(self):
        entry = self.entry(complete_address={}, address="12 Main Road, New Delhi, Delhi 110001, India")
        place = entry_to_place(entry)
        assert place is not None
        self.assertEqual(place.address, "12 Main Road")
        self.assertEqual(place.city, "New Delhi")
        self.assertEqual(place.state, "Delhi")
        self.assertEqual(place.country, "India")
        self.assertEqual(split_address("1 Main, Pune, Maharashtra 411001, India"),
                         ("1 Main", "Pune", "Maharashtra", "India"))

    def test_email_candidates_are_normalised_and_capped(self):
        place = entry_to_place(self.entry(emails=["A@Iron.example.in", "a@iron.example.in", "not-an-email"]
                                          + [f"x{i}@example.in" for i in range(10)]))
        assert place is not None
        self.assertEqual(len(place.email_candidates), 5)
        self.assertEqual(place.email_candidates[0], "a@iron.example.in")
        self.assertNotIn("not-an-email", place.email_candidates)

    def test_site_key_is_a_host(self):
        self.assertEqual(site_key("https://Ironyard.example.in/contact?x=1"), "ironyard.example.in")
        self.assertEqual(site_key("ironyard.example.in"), "ironyard.example.in")


class BroadCoverageTest(unittest.TestCase):
    def test_gym_in_delhi_collects_the_requested_fifty(self):
        result, places, stages, fake, _saved = run(query="gym", location="Delhi", limit=50)

        self.assertEqual(len(places), 50, "requesting 50 leads must yield 50 unique businesses")
        self.assertEqual(result.stats.unique, 50)
        self.assertGreaterEqual(result.stats.discovered, 50)
        keys = [place_key(place) for place in places]
        self.assertEqual(len(keys), len(set(keys)), "no duplicate businesses in the result")
        self.assertGreater(len(fake.searches()), 1, "the engine must search more than one viewport")

        # Every number the UI shows must reconcile.
        self.assertEqual(
            result.stats.discovered,
            result.stats.unique + result.stats.filtered,
            "discovered = unique + filtered",
        )
        self.assertGreaterEqual(
            result.stats.discovered + result.stats.duplicates + result.stats.errors,
            result.stats.unique,
            "the sweep must account for every sighting it processed",
        )
        fake.cleanup()

    def test_it_does_not_stop_at_the_first_viewport(self):
        """The reported failure mode: 3 results for a big city."""
        result, places, _stages, fake, _saved = run(query="gym", location="Delhi", limit=50)
        self.assertGreaterEqual(len(places), 50)
        searches = fake.searches()
        self.assertGreater(len(searches), 1)
        first_viewport = len(fake.maps.results_for(searches[0]["url"], searches[0]["depth"]))
        self.assertGreater(len(places), min(first_viewport, len(places) - 1),
                           "the sweep must continue past what one viewport can give")
        fake.cleanup()

    def test_the_engine_deduplicates_within_one_run(self):
        fake = FakeEngine(build_world(120, seed=7))
        result, places, _stages, _fake, _saved = run(limit=50, fake=fake, targets_per_batch=6)
        companies = [place.company for place in places]
        self.assertEqual(len(companies), len(set(companies)))
        self.assertEqual(result.stats.unique, len(places))
        fake.cleanup()

    def test_deduplicates_businesses_seen_in_several_engine_runs(self):
        # One viewport per engine run, shallow scroll: several runs are needed,
        # so overlapping viewports are Zybble's job to deduplicate.
        fake = FakeEngine(build_world(240, seed=7))
        fake.engine.depth = 1  # 20 results per viewport
        result, places, _stages, _fake, _saved = run(query="gym", location="Delhi", limit=50,
                                                     fake=fake, targets_per_batch=1)
        self.assertGreater(result.stats.duplicates, 0,
                           "businesses appearing in overlapping viewports must be counted once")
        self.assertGreater(len(fake.searches()), 1)
        companies = [place.company for place in places]
        self.assertEqual(len(companies), len(set(companies)))
        fake.cleanup()

    def test_dentists_in_mumbai(self):
        world = build_world(240, seed=21, box=MUMBAI_BOX, prefix="Dental Care", category="Dentist")
        result, places, _stages, fake, _saved = run(query="dentists", location="Mumbai", limit=50, world=world)
        self.assertEqual(len(places), 50)
        self.assertEqual(result.stats.unique, 50)
        fake.cleanup()

    def test_small_location_stops_when_the_source_is_exhausted(self):
        world = build_world(3, seed=3)
        result, places, _stages, fake, _saved = run(query="gym", location="Delhi", limit=50, world=world)
        self.assertEqual(len(places), 3, "only three businesses exist — report three, never invent more")
        self.assertTrue(result.state.exhausted)
        self.assertEqual(result.stats.unique, 3)
        self.assertTrue(result.exhausted)
        fake.cleanup()

    def test_empty_location_completes_with_zero(self):
        result, places, _stages, fake, _saved = run(query="gym", location="Delhi", limit=50, world=[])
        self.assertEqual(places, [])
        self.assertEqual(result.stats.unique, 0)
        self.assertEqual(result.stats.discovered, 0)
        self.assertTrue(result.exhausted)
        fake.cleanup()

    def test_a_location_that_cannot_be_geocoded_falls_back_to_text_searches(self):
        fake = FakeEngine(build_world(20, seed=4))
        result, places, _stages, _fake, _saved = run(location="Nowhere", limit=10, fake=fake)
        self.assertTrue(result.state.plan.degraded)
        self.assertTrue(any("could not be geocoded" in note for note in result.state.notes))
        self.assertTrue(places)
        for search in fake.searches():
            self.assertIn("/maps/search/", search["url"])
        fake.cleanup()


class BatchingTest(unittest.TestCase):
    def test_targets_are_handed_to_the_engine_in_batches(self):
        fake = FakeEngine(build_world(240, seed=7))
        result, _places, _stages, _fake, _saved = run(limit=200, fake=fake, targets_per_batch=3)
        plan_total = result.state.plan.total
        self.assertGreater(plan_total, 3)
        self.assertGreaterEqual(result.stats.engine_runs, 2, "a big request needs several engine runs")
        # Every search the engine ran came from the coverage plan.
        planned = {target.url for target in result.state.plan.targets}
        for search in fake.searches():
            self.assertIn(search["url"], planned)
        fake.cleanup()

    def test_the_sweep_stops_as_soon_as_the_quantity_is_reached(self):
        fake = FakeEngine(build_world(240, seed=7))
        result, places, _stages, _fake, _saved = run(limit=10, fake=fake, targets_per_batch=6)
        self.assertEqual(len(places), 10)
        self.assertEqual(result.stats.engine_runs, 1)
        self.assertLess(len(fake.searches()), result.state.plan.total,
                        "viewports whose results would be discarded are never scraped")
        fake.cleanup()

    def test_scroll_depth_is_derived_from_what_is_still_missing(self):
        self.assertEqual(depth_for(remaining=12, batch_size=6, maximum=10), 1)
        self.assertEqual(depth_for(remaining=50, batch_size=6, maximum=10), 2)
        self.assertEqual(depth_for(remaining=200, batch_size=1, maximum=10), 10, "capped by the configured maximum")
        self.assertEqual(depth_for(remaining=1, batch_size=1, maximum=40), 1)
        self.assertGreaterEqual(depth_for(0, 0, 5), 1)

    def test_the_depth_sent_to_the_engine_matches_the_request(self):
        fake = FakeEngine(build_world(240, seed=7))
        run(limit=50, fake=fake, targets_per_batch=6)
        searches = fake.searches()
        self.assertTrue(searches)
        self.assertEqual(searches[0]["depth"], depth_for(50, 6, fake.engine.depth))
        fake.cleanup()

    def test_targets_per_run_is_configurable_and_clamped(self):
        self.assertEqual(targets_per_run(6), 6)
        self.assertEqual(targets_per_run(0), 1)
        self.assertEqual(targets_per_run(999), 24)
        self.assertEqual(targets_per_run(None), 6)
        import os
        from unittest import mock

        with mock.patch.dict(os.environ, {"SCRAPER_TARGETS_PER_RUN": "4"}):
            self.assertEqual(targets_per_run(), 4)
        with mock.patch.dict(os.environ, {"SCRAPER_TARGETS_PER_RUN": "lots"}):
            self.assertEqual(targets_per_run(), 6)


class FilterTest(unittest.TestCase):
    def test_min_rating_filter(self):
        filters = LeadFilters.from_dict({"min_rating": 4.7})
        result, places, _stages, fake, _saved = run(limit=50, filters=filters)
        self.assertTrue(places)
        for place in places:
            self.assertIsNotNone(place.rating)
            self.assertGreaterEqual(place.rating, 4.7)
        self.assertGreater(result.stats.filtered, 0)
        fake.cleanup()

    def test_has_website_filter(self):
        filters = LeadFilters.from_dict({"has_website": True})
        result, places, _stages, fake, _saved = run(limit=50, filters=filters)
        self.assertTrue(places)
        for place in places:
            self.assertIsNotNone(place.website)
        self.assertGreater(result.stats.filtered, 0)
        fake.cleanup()

    def test_keyword_filter(self):
        filters = LeadFilters.from_dict({"keywords_include": ["Business 1"]})
        _result, places, _stages, fake, _saved = run(limit=50, filters=filters)
        self.assertTrue(places)
        for place in places:
            self.assertIn("business 1", place.company.lower())
        fake.cleanup()

    def test_combined_filters(self):
        filters = LeadFilters.from_dict(
            {"min_rating": 4.0, "has_website": True, "has_phone": True, "open_status": ["open"], "country": "India"}
        )
        _result, places, _stages, fake, _saved = run(limit=25, filters=filters)
        self.assertEqual(len(places), 25)
        for place in places:
            self.assertGreaterEqual(place.rating or 0, 4.0)
            self.assertIsNotNone(place.website)
            self.assertIsNotNone(place.phone)
            self.assertEqual(place.open_status, "open")
            self.assertEqual(place.country.lower(), "india")
        fake.cleanup()

    def test_filters_do_not_discard_the_whole_area(self):
        """Filters narrow results; they must not collapse a broad search."""
        filters = LeadFilters.from_dict({"min_rating": 3.0})
        _result, places, _stages, fake, _saved = run(limit=50, filters=filters)
        self.assertEqual(len(places), 50, "a permissive filter still fills the requested quantity")
        fake.cleanup()

    def test_filtered_businesses_are_not_reconsidered(self):
        filters = LeadFilters.from_dict({"min_rating": 4.9})
        result, _places, _stages, fake, _saved = run(limit=10, filters=filters, targets_per_batch=1)
        self.assertTrue(result.state.filtered_keys, "rejected businesses are remembered across viewports")
        fake.cleanup()


class ResilienceTest(unittest.TestCase):
    def test_unreadable_businesses_are_skipped_not_fatal(self):
        world = build_world(120, seed=5)
        self.assertTrue(any(business.broken for business in world))
        result, places, _stages, fake, _saved = run(limit=50, world=world)
        self.assertEqual(len(places), 50, "place pages the engine cannot read never stop the sweep")
        self.assertTrue(all(not any(p.company == b.company for b in world if b.broken) for p in places))
        self.assertEqual(result.stats.unique, 50)
        fake.cleanup()

    def test_malformed_results_are_counted_as_errors(self):
        fake = FakeEngine(build_world(20, seed=4), FAKE_GMS_MALFORMED=1, FAKE_GMS_EMPTY_TITLE=1)
        result, places, _stages, _fake, _saved = run(limit=200, fake=fake, targets_per_batch=1)
        self.assertGreaterEqual(result.stats.errors, 2, "torn lines and nameless results are counted")
        self.assertTrue(places, "usable results still arrive")
        self.assertTrue(all(place.company for place in places))
        self.assertEqual(result.stats.unique, len(places))
        fake.cleanup()

    def test_google_challenge_is_raised_as_a_resumable_error(self):
        fake = FakeEngine(build_world(50, seed=9), mode="challenge")
        with self.assertRaises(ChallengeError):
            run(limit=10, fake=fake)
        fake.cleanup()

    def test_a_dying_engine_is_reported_as_a_retryable_failure(self):
        fake = FakeEngine(build_world(50, seed=9), mode="crash")
        with self.assertRaises(EngineFailure) as caught:
            run(limit=10, fake=fake, targets_per_batch=1)
        self.assertIn("exit code", str(caught.exception))
        fake.cleanup()

    def test_one_failed_batch_is_retried_not_abandoned(self):
        """A crash after results were streamed keeps them and resumes the sweep."""
        fake = FakeEngine(build_world(120, seed=9), mode="partial")
        with self.assertRaises(EngineFailure):
            run(limit=200, fake=fake, targets_per_batch=1)
        fake.cleanup()

    def test_a_missing_engine_binary_fails_loudly(self):
        engine = GosomEngine(binary="/definitely/not/here")
        with self.assertRaises(EngineUnavailable):
            run_scrape(query="gym", location="Delhi", radius_meters=25_000, limit=10,
                       timeout_seconds=60, engine=engine, geocoder=geocode_stub)

    def test_a_shutdown_signal_pauses_the_sweep_instead_of_failing_it(self):
        """A Railway redeploy mid-job must pause the sweep, not lose its work."""
        fake = FakeEngine(build_world(240, seed=7), delay=0.02)
        delivered: list[Place] = []
        saved_states: list[dict] = []

        def should_stop() -> bool:
            return len(delivered) >= 1

        with self.assertRaises(JobTimeout) as caught:
            run_scrape(
                query="gym", location="Delhi", radius_meters=25_000, limit=50, timeout_seconds=600,
                filters=LeadFilters(), state=ScrapeState(), engine=fake.engine, geocoder=geocode_stub,
                on_place=lambda place, _p, _t: delivered.append(place),
                on_state=lambda state: saved_states.append(state.to_dict()),
                should_stop=should_stop, targets_per_batch=6, max_tiles=36,
            )
        self.assertIn("shutdown", str(caught.exception).lower())
        self.assertGreaterEqual(len(delivered), 1, "leads found before the signal were already streamed out")
        self.assertLessEqual(len(delivered), 4, "the sweep stops at the next safe point")
        self.assertTrue(saved_states, "the cursor is persisted before pausing")
        cursor = saved_states[-1]
        self.assertEqual(cursor["target_index"], 0, "an unfinished batch is re-run, never skipped")
        self.assertGreaterEqual(cursor["stats"]["unique"], len(delivered))
        self.assertTrue(cursor["seen_keys"], "what was already found is remembered")
        fake.cleanup()


class ResumeTest(unittest.TestCase):
    def test_second_pass_continues_and_never_repeats_a_business(self):
        fake = FakeEngine(build_world(240, seed=7))
        first, first_places, _stages, _fake, _saved = run(limit=20, fake=fake, targets_per_batch=2)
        self.assertEqual(len(first_places), 20)

        state = ScrapeState.from_dict(first.state.to_dict())
        self.assertGreater(state.target_index, 0, "the cursor advanced past the viewports already swept")
        second, second_places, _stages, _fake, _saved = run(limit=50, state=state, fake=fake,
                                                            targets_per_batch=2)

        self.assertEqual(len(second_places), 30, "resume must collect the remaining 30, not restart")
        self.assertEqual(second.stats.unique, 50)
        first_keys = {place_key(p) for p in first_places}
        second_keys = {place_key(p) for p in second_places}
        self.assertFalse(first_keys & second_keys, "a resumed search must not return the same business twice")
        fake.cleanup()

    def test_state_round_trips_through_json(self):
        fake = FakeEngine(build_world(240, seed=7))
        result, _places, _stages, _fake, _saved = run(limit=20, fake=fake, targets_per_batch=2)
        restored = ScrapeState.from_dict(result.state.to_dict())
        self.assertEqual(restored.target_index, result.state.target_index)
        self.assertEqual(set(restored.seen_keys), set(result.state.seen_keys))
        self.assertEqual(restored.stats.unique, result.stats.unique)
        self.assertEqual(restored.stats.engine_runs, result.stats.engine_runs)
        self.assertEqual(restored.plan.total, result.state.plan.total)
        fake.cleanup()

    def test_a_finished_job_does_not_repeat_work(self):
        fake = FakeEngine(build_world(40, seed=13))
        first, _places, _stages, _fake, _saved = run(limit=50, world=None, fake=fake)
        self.assertTrue(first.state.exhausted)
        state = ScrapeState.from_dict(first.state.to_dict())
        second, second_places, _stages, _fake, _saved = run(limit=50, state=state, fake=fake)
        self.assertEqual(second_places, [])
        self.assertTrue(second.exhausted)
        fake.cleanup()

    def test_a_batch_that_hit_the_deadline_is_re_run_from_its_start(self):
        fake = FakeEngine(build_world(240, seed=7))
        state = ScrapeState()
        with self.assertRaises(JobTimeout):
            run_scrape(
                query="gym", location="Delhi", radius_meters=25_000, limit=500, timeout_seconds=600,
                filters=LeadFilters(), state=state, engine=fake.engine, geocoder=geocode_stub,
                targets_per_batch=3, should_stop=lambda: True,
            )
        self.assertEqual(state.target_index, 0, "an unfinished batch is never marked done")
        fake.cleanup()


class ProgressTest(unittest.TestCase):
    def test_stage_sequence_and_monotonic_progress(self):
        _result, _places, stages, fake, _saved = run(limit=50)
        names = [stage for stage, _percent, _message in stages]
        self.assertIn(STAGE_SEARCHING, names)
        self.assertIn(STAGE_COLLECTING, names)
        self.assertIn(STAGE_DEDUPLICATING, names)
        self.assertEqual(names[-1], STAGE_DEDUPLICATING)

        percents = [percent for _stage, percent, _message in stages]
        self.assertGreater(percents[0], 0)
        self.assertLessEqual(max(percents), 99)
        self.assertGreater(max(percents), 40, "progress must move well past the searching stage")
        self.assertEqual(percents, sorted(percents), "progress must never move backwards")
        fake.cleanup()

    def test_progress_messages_report_the_running_counters(self):
        _result, _places, stages, fake, _saved = run(limit=10)
        collecting = [message for stage, _p, message in stages if stage == STAGE_COLLECTING]
        self.assertTrue(collecting)
        self.assertIn("10/10", collecting[-1])
        fake.cleanup()

    def test_percent_helper_tracks_leads_and_coverage(self):
        self.assertEqual(collect_percent(0, 50, 0, 10), 4.0)
        self.assertEqual(collect_percent(50, 50, 0, 10), 68.0)
        self.assertEqual(collect_percent(0, 50, 10, 10), 68.0)
        self.assertLess(collect_percent(10, 50, 0, 10), collect_percent(20, 50, 0, 10))
        self.assertLessEqual(collect_percent(500, 50, 500, 10), 68.0)


class EngineTargetTest(unittest.TestCase):
    def test_coverage_targets_are_adapted_without_losing_their_label(self):
        from coverage import SearchTarget

        target = SearchTarget(kind="tile", url="https://www.google.com/maps/search/gym", label="gym · area 1/4",
                              lat=1.0, lng=2.0, zoom=12.0)
        adapted = EngineTarget.from_search_target(target, "t7")
        self.assertEqual(adapted.id, "t7")
        self.assertEqual(adapted.url, target.url)
        self.assertEqual(adapted.label, target.label)

    def test_the_label_reaches_the_lead_as_its_source_query(self):
        fake = FakeEngine(build_world(10, seed=19))
        _result, places, _stages, _fake, saved = run(limit=5, fake=fake)
        self.assertTrue(places)
        for place in places:
            self.assertTrue(place.source_query, "every lead records the search that found it")
        self.assertEqual(saved[0]["source_query"], places[0].source_query)
        fake.cleanup()


if __name__ == "__main__":
    unittest.main()
