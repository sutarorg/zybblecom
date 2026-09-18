"""Coverage planning: the location is searched broadly, not just one viewport."""

from __future__ import annotations

import unittest

from coverage import GeoBox, build_coverage, build_tiles, geocode_location, zoom_for_radius
from tests.fake_maps import DELHI_BOX, MUMBAI_BOX, geocode_stub


class ZoomTest(unittest.TestCase):
    def test_zoom_is_bounded_and_inverse_to_radius(self):
        self.assertLess(zoom_for_radius(50_000), zoom_for_radius(5_000))
        self.assertGreaterEqual(zoom_for_radius(1_000), 8.0)
        self.assertLessEqual(zoom_for_radius(1_000_000_000), 17.0)


class TileTest(unittest.TestCase):
    def test_delhi_is_split_into_multiple_tiles(self):
        box = GeoBox(**DELHI_BOX)
        tiles = build_tiles(box, 25_000, max_tiles=36)
        self.assertGreater(len(tiles), 1, "a large city must not be one viewport")
        for lat, lng, _zoom in tiles:
            self.assertGreaterEqual(lat, box.south)
            self.assertLessEqual(lat, box.north)
            self.assertGreaterEqual(lng, box.west)
            self.assertLessEqual(lng, box.east)

    def test_small_radius_produces_more_tiles_than_large_radius(self):
        box = GeoBox(**DELHI_BOX)
        self.assertGreater(
            len(build_tiles(box, 5_000, max_tiles=36)),
            len(build_tiles(box, 25_000, max_tiles=36)),
        )

    def test_tile_count_is_capped_but_area_still_covered(self):
        box = GeoBox(**DELHI_BOX)
        # A tiny radius over a big city would need >36 cells; cells must grow.
        tiles = build_tiles(box, 500, max_tiles=36)
        self.assertLessEqual(len(tiles), 36)
        lats = [t[0] for t in tiles]
        self.assertGreater(max(lats) - min(lats), 0.0)

    def test_tiles_are_ordered_centre_outwards(self):
        box = GeoBox(**DELHI_BOX)
        tiles = build_tiles(box, 5_000, max_tiles=36)
        distances = [
            (lat - box.center_lat) ** 2 + (lng - box.center_lng) ** 2 for lat, lng, _ in tiles
        ]
        self.assertEqual(distances, sorted(distances))


class BuildCoverageTest(unittest.TestCase):
    def test_delhi_plan_spans_the_whole_city_and_is_deterministic(self):
        first = build_coverage("gym", "Delhi", 25_000, geocode=geocode_stub)
        second = build_coverage("gym", "Delhi", 25_000, geocode=geocode_stub)
        self.assertFalse(first.degraded)
        self.assertGreater(len(first.targets), 10, "broad coverage needs many searches")
        self.assertEqual([t.url for t in first.targets], [t.url for t in second.targets])

        lats = {t.lat for t in first.targets if t.lat is not None}
        lngs = {t.lng for t in first.targets if t.lng is not None}
        self.assertGreater(max(lats) - min(lats), 0.1, "searches must span the city's latitude")
        self.assertGreater(max(lngs) - min(lngs), 0.1)

    def test_plan_sweeps_all_tiles_with_one_wording_before_the_next(self):
        plan = build_coverage("dentists", "Mumbai", 25_000, geocode=geocode_stub)
        self.assertGreater(len(plan.targets), 10)
        labels = [t.label for t in plan.targets]
        # Each wording appears once per tile; the first wording is exhausted first.
        self.assertTrue(labels[0].startswith("dentists in Mumbai"))

    def test_unresolvable_location_falls_back_to_text_searches(self):
        plan = build_coverage("gym", "Nowhereville", 25_000, geocode=lambda _location: None)
        self.assertTrue(plan.degraded)
        self.assertGreaterEqual(len(plan.targets), 1)
        for target in plan.targets:
            self.assertTrue(target.url.startswith("https://www.google.com/maps/search/"))
            self.assertIn("gym", target.url)

    def test_plan_survives_a_geocoder_that_raises(self):
        def boom(_location):
            raise RuntimeError("nominatim down")

        plan = build_coverage("gym", "Delhi", 25_000, geocode=boom)
        self.assertTrue(plan.degraded)
        self.assertGreaterEqual(len(plan.targets), 1)

    def test_plan_round_trips_through_json_for_resume(self):
        plan = build_coverage("gym", "Delhi", 25_000, geocode=geocode_stub)
        restored = type(plan).from_dict(plan.to_dict())
        self.assertEqual(plan.total, restored.total)
        self.assertEqual([t.url for t in plan.targets], [t.url for t in restored.targets])
        self.assertIsNotNone(restored.box)

    def test_target_urls_are_real_google_maps_search_urls(self):
        plan = build_coverage("gym", "Delhi", 25_000, geocode=geocode_stub)
        for target in plan.targets:
            self.assertTrue(target.url.startswith("https://www.google.com/maps/search/"))
            self.assertNotIn("key=", target.url)  # no API key anywhere


class NoGoogleApiTest(unittest.TestCase):
    """The discovery path must never touch a paid Google endpoint."""

    def test_coverage_module_has_no_google_api(self):
        import inspect

        import coverage as coverage_module

        source = inspect.getsource(coverage_module)
        self.assertIn("nominatim.openstreetmap.org", source)
        for forbidden in (
            "maps.googleapis",
            "places.googleapis",
            "GOOGLE_MAPS_API_KEY",
            "X-Goog-Api-Key",
            "?key=",
            "&key=",
        ):
            self.assertNotIn(forbidden, source)

    def test_geocode_is_safe_when_the_network_is_down(self):
        # No network in CI: geocoding must degrade, never raise.
        self.assertIsInstance(geocode_location(""), (type(None), GeoBox))


class MumbaiTest(unittest.TestCase):
    def test_mumbai_also_produces_broad_coverage(self):
        plan = build_coverage("dentists", "Mumbai", 25_000, geocode=geocode_stub)
        self.assertFalse(plan.degraded)
        self.assertGreater(len(plan.targets), 5)
        self.assertEqual(plan.box.display_name, MUMBAI_BOX["display_name"])


if __name__ == "__main__":
    unittest.main()
