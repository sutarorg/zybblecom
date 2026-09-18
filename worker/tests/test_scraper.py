"""End-to-end scraping behaviour against the offline Google Maps simulator.

These tests run the real engine (``scraper.run_scrape`` → vendored
GoogleMapScraper core → coverage plan → dedupe → filters) with a WebDriver
shaped fake. Nothing here is mocked *data*: the HTML the fake serves is the
structure Google renders, and every assertion is about the engine's behaviour.
"""

from __future__ import annotations

import unittest

from filters import LeadFilters
from scraper import (
    STAGE_COLLECTING,
    STAGE_DEDUPLICATING,
    STAGE_SEARCHING,
    ChallengeError,
    Place,
    ScrapeState,
    build_search_url,
    place_key,
    run_scrape,
)
from tests.fake_maps import (
    MUMBAI_BOX,
    FakeBusiness,
    FakeDriver,
    FakeMaps,
    build_world,
    geocode_stub,
)

NO_SLEEP = lambda _seconds: None  # noqa: E731 - tests must not really sleep


def run(query="gym", location="Delhi", limit=50, radius=25_000, world=None, filters=None, state=None, driver=None, maps=None):
    maps = maps or FakeMaps(world if world is not None else build_world(240, seed=7))
    driver = driver or FakeDriver(maps)
    stages: list[tuple[str, float, str]] = []
    places: list[Place] = []

    def on_stage(stage, percent, stats, message):
        stages.append((stage, percent, message))

    def on_place(place, position, total):
        places.append(place)

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
        driver=driver,
        geocoder=geocode_stub,
        max_tiles=36,
        page_timeout=1,
        sleep=NO_SLEEP,
    )
    return result, places, stages, maps, driver


class PlaceKeyTest(unittest.TestCase):
    def test_key_prefers_place_id_then_url_then_name_and_address(self):
        with_id = Place(company="A", place_id="0x1:0x1", maps_url="https://maps.google.com/place/x")
        self.assertEqual(place_key(with_id), "pid:0x1:0x1")

        same_business_different_params = Place(
            company="A", maps_url="https://www.google.com/maps/place/A/data=x?entry=ttu", address="1 Main"
        )
        same_business_clean = Place(company="A", maps_url="https://www.google.com/maps/place/A/data=x")
        self.assertEqual(place_key(same_business_different_params), place_key(same_business_clean))

        no_url = Place(company="Iron Yard", address="12 Main Road")
        self.assertEqual(place_key(no_url), place_key(Place(company="iron  yard!", address="12 main road")))

    def test_url_builder_has_no_api_key(self):
        self.assertNotIn("key=", build_search_url("gym", "Delhi"))


class BroadCoverageTest(unittest.TestCase):
    def test_gym_in_delhi_collects_the_requested_fifty(self):
        result, places, stages, maps, _driver = run(query="gym", location="Delhi", limit=50)

        self.assertEqual(len(places), 50, "requesting 50 leads must yield 50 unique businesses")
        self.assertEqual(result.stats.unique, 50)
        self.assertGreaterEqual(result.stats.discovered, 50)
        keys = [place_key(place) for place in places]
        self.assertEqual(len(keys), len(set(keys)), "no duplicate businesses in the result")
        self.assertGreater(len(maps.search_calls), 1, "the engine must search more than one viewport")

        # Every number the UI shows must reconcile:
        #   discovered businesses = accepted + filtered
        self.assertEqual(
            result.stats.discovered,
            result.stats.unique + result.stats.filtered,
            "discovered = unique + filtered",
        )
        self.assertGreater(
            result.stats.discovered + result.stats.duplicates + result.stats.errors,
            result.stats.unique,
            "the sweep must report every sighting it processed",
        )

    def test_it_does_not_stop_at_the_first_batch(self):
        """The reported failure mode: 3 results for a big city."""
        result, places, _stages, maps, _driver = run(query="gym", location="Delhi", limit=50)
        self.assertGreaterEqual(len(places), 50)
        first_search_results = len(maps.results_for(maps.search_calls[0]))
        self.assertGreater(len(places), first_search_results,
                           "the engine must continue past the first batch of results")

    def test_deduplicates_businesses_seen_in_several_viewports(self):
        result, places, _stages, _maps, _driver = run(query="gym", location="Delhi", limit=50)
        self.assertGreater(result.stats.duplicates, 0,
                           "businesses appearing in overlapping viewports must be counted once")
        companies = [place.company for place in places]
        self.assertEqual(len(companies), len(set(companies)))

    def test_dentists_in_mumbai(self):
        world = build_world(240, seed=21, box=MUMBAI_BOX, prefix="Dental Care", category="Dentist")
        result, places, _stages, _maps, _driver = run(
            query="dentists", location="Mumbai", limit=50, world=world
        )
        self.assertEqual(len(places), 50)
        self.assertEqual(result.stats.unique, 50)

    def test_small_location_stops_when_the_source_is_exhausted(self):
        world = build_world(3, seed=3)
        result, places, _stages, maps, _driver = run(query="gym", location="Delhi", limit=50, world=world)
        self.assertEqual(len(places), 3, "only three businesses exist — report three, never invent more")
        self.assertTrue(result.state.exhausted)
        self.assertEqual(result.stats.unique, 3)

    def test_empty_location_completes_with_zero(self):
        result, places, _stages, _maps, _driver = run(query="gym", location="Delhi", limit=50, world=[])
        self.assertEqual(places, [])
        self.assertEqual(result.stats.unique, 0)
        self.assertEqual(result.stats.discovered, 0)


class FilterTest(unittest.TestCase):
    def test_min_rating_filter(self):
        filters = LeadFilters.from_dict({"min_rating": 4.7})
        result, places, _stages, _maps, _driver = run(limit=50, filters=filters)
        self.assertTrue(places)
        for place in places:
            self.assertIsNotNone(place.rating)
            self.assertGreaterEqual(place.rating, 4.7)
        self.assertGreater(result.stats.filtered, 0)

    def test_has_website_filter(self):
        filters = LeadFilters.from_dict({"has_website": True})
        result, places, _stages, _maps, _driver = run(limit=50, filters=filters)
        self.assertTrue(places)
        for place in places:
            self.assertIsNotNone(place.website)
        self.assertGreater(result.stats.filtered, 0)

    def test_keyword_filter(self):
        filters = LeadFilters.from_dict({"keywords_include": ["Business 1"]})
        _result, places, _stages, _maps, _driver = run(limit=50, filters=filters)
        self.assertTrue(places)
        for place in places:
            self.assertIn("business 1", place.company.lower())

    def test_combined_filters(self):
        filters = LeadFilters.from_dict(
            {"min_rating": 4.0, "has_website": True, "has_phone": True, "open_status": ["open"], "country": "India"}
        )
        _result, places, _stages, _maps, _driver = run(limit=25, filters=filters)
        self.assertEqual(len(places), 25)
        for place in places:
            self.assertGreaterEqual(place.rating or 0, 4.0)
            self.assertIsNotNone(place.website)
            self.assertIsNotNone(place.phone)
            self.assertEqual(place.open_status, "open")
            self.assertEqual(place.country.lower(), "india")

    def test_filters_do_not_discard_the_whole_area(self):
        """Filters narrow results; they must not collapse a broad search."""
        filters = LeadFilters.from_dict({"min_rating": 3.0})
        _result, places, _stages, _maps, _driver = run(limit=50, filters=filters)
        self.assertEqual(len(places), 50, "a permissive filter still fills the requested quantity")


class ResilienceTest(unittest.TestCase):
    def test_unreadable_businesses_are_counted_not_fatal(self):
        world = build_world(120, seed=5)
        _result, places, _stages, _maps, _driver = run(limit=50, world=world)
        self.assertEqual(len(places), 50)
        # build_world marks ~4% of pages broken; the sweep must survive them.
        self.assertTrue(any(b.broken for b in world))

    def test_one_broken_page_is_reported_as_an_error(self):
        world = [
            FakeBusiness(place_id="0xaaaa:0x1", company="Broken Gym", broken=True),
            FakeBusiness(place_id="0xbbbb:0x2", company="Working Gym"),
        ]
        maps = FakeMaps(world)
        result, places, _stages, _maps, _driver = run(limit=10, world=world, maps=maps)
        self.assertEqual([p.company for p in places], ["Working Gym"])
        self.assertGreaterEqual(result.stats.errors, 1)

    def test_google_challenge_is_raised_as_a_resumable_error(self):
        class ChallengeDriver(FakeDriver):
            def get(self, url):  # noqa: D102 - Google served a challenge page
                super().get(url)
                self._html = "<html><body>Our systems have detected unusual traffic from your network.</body></html>"

        maps = FakeMaps(build_world(50, seed=9))
        with self.assertRaises(ChallengeError):
            run(limit=10, maps=maps, driver=ChallengeDriver(maps))


class ResumeTest(unittest.TestCase):
    def test_second_pass_continues_and_never_repeats_a_business(self):
        first, first_places, _stages, maps, driver = run(limit=20)
        self.assertEqual(len(first_places), 20)

        state = ScrapeState.from_dict(first.state.to_dict())
        second, second_places, _stages, _maps, _driver = run(limit=50, state=state, maps=maps, driver=driver)

        self.assertEqual(len(second_places), 30, "resume must collect the remaining 30, not restart")
        self.assertEqual(second.stats.unique, 50)
        first_keys = {place_key(p) for p in first_places}
        second_keys = {place_key(p) for p in second_places}
        self.assertFalse(first_keys & second_keys, "a resumed search must not return the same business twice")

    def test_state_round_trips_through_json(self):
        result, _places, _stages, _maps, _driver = run(limit=20)
        restored = ScrapeState.from_dict(result.state.to_dict())
        self.assertEqual(restored.target_index, result.state.target_index)
        self.assertEqual(set(restored.seen_keys), set(result.state.seen_keys))
        self.assertEqual(restored.stats.unique, result.stats.unique)

    def test_a_finished_job_does_not_repeat_work(self):
        world = build_world(40, seed=13)
        first, _places, _stages, maps, driver = run(limit=50, world=world)
        self.assertTrue(first.state.exhausted)
        state = ScrapeState.from_dict(first.state.to_dict())
        second, second_places, _stages, _maps, _driver = run(limit=50, state=state, maps=maps, driver=driver)
        self.assertEqual(second_places, [])
        self.assertTrue(second.exhausted)


class ProgressTest(unittest.TestCase):
    def test_stage_sequence_and_monotonic_progress(self):
        _result, _places, stages, _maps, _driver = run(limit=50)
        names = [stage for stage, _percent, _message in stages]
        self.assertIn(STAGE_SEARCHING, names)
        self.assertIn(STAGE_COLLECTING, names)
        self.assertIn(STAGE_DEDUPLICATING, names)
        self.assertEqual(names[-1], STAGE_DEDUPLICATING)

        percents = [percent for _stage, percent, _message in stages]
        self.assertGreater(percents[0], 0)
        self.assertLessEqual(max(percents), 99)
        self.assertGreater(max(percents), 40, "progress must move well past the searching stage")


class ExtractionTest(unittest.TestCase):
    def test_all_public_fields_are_extracted_from_the_panel(self):
        world = [
            FakeBusiness(
                place_id="0x390ce19d0000:0xa1b2c30000",
                company="Iron Yard Gym",
                category="Gym",
                address="12 Main Road",
                city="New Delhi",
                state="Delhi",
                country="India",
                phone="+91 11 4000 0000",
                website="https://ironyard.example.in",
                rating=4.6,
                reviews=312,
                hours="Monday, 6 AM to 10 PM",
                open_status="open",
            )
        ]
        maps = FakeMaps(world)
        _result, places, _stages, _maps, _driver = run(limit=1, world=world, maps=maps)
        self.assertEqual(len(places), 1)
        place = places[0]
        self.assertEqual(place.company, "Iron Yard Gym")
        self.assertEqual(place.category, "Gym")
        self.assertEqual(place.phone, "+91 11 4000 0000")
        self.assertEqual(place.website, "https://ironyard.example.in")
        self.assertEqual(place.rating, 4.6)
        self.assertEqual(place.reviews, 312)
        self.assertEqual(place.open_status, "open")
        self.assertEqual(place.country, "India")
        self.assertEqual(place.state, "Delhi")
        self.assertIn("Main Road", place.address)
        self.assertEqual(place.place_id, "0x390ce19d0000:0xa1b2c30000")

    def test_permanently_closed_businesses_are_flagged(self):
        world = [
            FakeBusiness(place_id="0xcccc:0x3", company="Closed Gym", open_status="permanently_closed"),
            FakeBusiness(place_id="0xdddd:0x4", company="Open Gym", open_status="open"),
        ]
        _result, places, _stages, _maps, _driver = run(limit=10, world=world)
        statuses = {p.company: p.open_status for p in places}
        self.assertEqual(statuses.get("Closed Gym"), "permanently_closed")
        self.assertEqual(statuses.get("Open Gym"), "open")


if __name__ == "__main__":
    unittest.main()
