"""Lead filters: individually and in combination."""

from __future__ import annotations

import unittest

from filters import (
    LeadFilters,
    evaluate_discovery,
    evaluate_enrichment,
    sort_places,
)
from scraper import Place


def place(**overrides) -> Place:
    base = dict(
        company="Iron Yard Gym",
        category="Gym",
        address="12 Main Road",
        city="New Delhi",
        state="Delhi",
        country="India",
        phone="+91 11 4000 0000",
        website="https://ironyard.example.in",
        maps_url="https://www.google.com/maps/place/Iron+Yard/data=!4m2!3m1!1s0x1:0x1",
        rating=4.4,
        reviews=210,
        hours="Monday, 6 AM to 10 PM",
        open_status="open",
        place_id="0x1:0x1",
    )
    base.update(overrides)
    return Place(**base)


class DecodeTest(unittest.TestCase):
    def test_empty_payload_means_no_filtering(self):
        filters = LeadFilters.from_dict({})
        self.assertIsNone(filters.min_rating)
        self.assertFalse(filters.enriched_only)
        self.assertEqual(filters.sort_by, "relevance")
        self.assertTrue(evaluate_discovery(place(), filters)[0])

    def test_string_booleans_and_csv_lists_are_coerced(self):
        filters = LeadFilters.from_dict(
            {"has_website": "true", "email_status": "verified,risky", "sort_by": "bogus"}
        )
        self.assertTrue(filters.has_website)
        self.assertEqual(filters.email_status, ["verified", "risky"])
        self.assertEqual(filters.sort_by, "relevance")

    def test_unknown_enum_values_are_dropped(self):
        filters = LeadFilters.from_dict({"email_status": ["verified", "made-up"], "open_status": ["open", "nope"]})
        self.assertEqual(filters.email_status, ["verified"])
        self.assertEqual(filters.open_status, ["open"])


class DiscoveryFilterTest(unittest.TestCase):
    def test_location_filters(self):
        for key, value in (("country", "India"), ("state", "Delhi"), ("city", "New Delhi")):
            with self.subTest(filter=key):
                keep, _ = evaluate_discovery(place(), LeadFilters.from_dict({key: value}))
                self.assertTrue(keep)
                keep, reason = evaluate_discovery(place(), LeadFilters.from_dict({key: "Elsewhere"}))
                self.assertFalse(keep)
                self.assertIn("Elsewhere", reason)

    def test_rating_bounds(self):
        self.assertTrue(evaluate_discovery(place(rating=4.0), LeadFilters.from_dict({"min_rating": 4}))[0])
        self.assertFalse(evaluate_discovery(place(rating=3.9), LeadFilters.from_dict({"min_rating": 4}))[0])
        self.assertTrue(evaluate_discovery(place(rating=4.9), LeadFilters.from_dict({"max_rating": 5}))[0])
        self.assertFalse(evaluate_discovery(place(rating=5.0), LeadFilters.from_dict({"max_rating": 4.8}))[0])
        keep, reason = evaluate_discovery(place(rating=None), LeadFilters.from_dict({"min_rating": 4}))
        self.assertFalse(keep)
        self.assertIn("no rating", reason)

    def test_review_bounds(self):
        self.assertTrue(evaluate_discovery(place(reviews=100), LeadFilters.from_dict({"min_reviews": 50}))[0])
        self.assertFalse(evaluate_discovery(place(reviews=10), LeadFilters.from_dict({"min_reviews": 50}))[0])
        self.assertFalse(evaluate_discovery(place(reviews=900), LeadFilters.from_dict({"max_reviews": 100}))[0])
        self.assertFalse(evaluate_discovery(place(reviews=None), LeadFilters.from_dict({"min_reviews": 5}))[0])

    def test_contact_filters(self):
        self.assertTrue(evaluate_discovery(place(), LeadFilters.from_dict({"has_website": True}))[0])
        self.assertFalse(evaluate_discovery(place(website=None), LeadFilters.from_dict({"has_website": True}))[0])
        self.assertTrue(evaluate_discovery(place(), LeadFilters.from_dict({"has_phone": True}))[0])
        self.assertFalse(evaluate_discovery(place(phone=None), LeadFilters.from_dict({"has_phone": True}))[0])
        # websites_only is the friendlier alias used by the UI.
        self.assertFalse(evaluate_discovery(place(website=None), LeadFilters.from_dict({"websites_only": True}))[0])
        self.assertTrue(evaluate_discovery(place(), LeadFilters.from_dict({"websites_only": True}))[0])

    def test_contactable_only_accepts_phone_without_website(self):
        filters = LeadFilters.from_dict({"contactable_only": True})
        self.assertTrue(evaluate_discovery(place(website=None, phone="+91 11 2222 3333"), filters)[0])
        self.assertFalse(evaluate_discovery(place(website=None, phone=None), filters)[0])

    def test_open_status(self):
        filters = LeadFilters.from_dict({"open_status": ["open"]})
        self.assertTrue(evaluate_discovery(place(open_status="open"), filters)[0])
        self.assertFalse(evaluate_discovery(place(open_status="closed"), filters)[0])

    def test_category_and_keywords(self):
        self.assertTrue(evaluate_discovery(place(), LeadFilters.from_dict({"category": "gym"}))[0])
        self.assertFalse(evaluate_discovery(place(), LeadFilters.from_dict({"category": "dentist"}))[0])
        self.assertTrue(evaluate_discovery(place(), LeadFilters.from_dict({"keywords_include": ["iron"]}))[0])
        self.assertFalse(evaluate_discovery(place(), LeadFilters.from_dict({"keywords_include": ["pilates"]}))[0])
        self.assertFalse(evaluate_discovery(place(), LeadFilters.from_dict({"keywords_exclude": ["iron"]}))[0])

    def test_combined_filters(self):
        filters = LeadFilters.from_dict(
            {
                "country": "India",
                "city": "New Delhi",
                "min_rating": 4.0,
                "min_reviews": 100,
                "has_website": True,
                "has_phone": True,
                "open_status": ["open"],
                "keywords_include": ["gym"],
            }
        )
        self.assertTrue(evaluate_discovery(place(), filters)[0])
        self.assertFalse(evaluate_discovery(place(reviews=10), filters)[0])
        self.assertFalse(evaluate_discovery(place(open_status="closed"), filters)[0])
        self.assertFalse(evaluate_discovery(place(city="Mumbai"), filters)[0])


class EnrichmentFilterTest(unittest.TestCase):
    def lead(self, **overrides) -> dict:
        base = {"email": "hello@ironyard.example.in", "email_status": "verified", "social_profiles": []}
        base.update(overrides)
        return base

    def test_has_email(self):
        self.assertTrue(evaluate_enrichment(self.lead(), LeadFilters.from_dict({"has_email": True}))[0])
        self.assertFalse(evaluate_enrichment(self.lead(email=None, email_status="unknown"),
                                             LeadFilters.from_dict({"has_email": True}))[0])

    def test_email_status(self):
        filters = LeadFilters.from_dict({"email_status": ["verified"]})
        self.assertTrue(evaluate_enrichment(self.lead(), filters)[0])
        self.assertFalse(evaluate_enrichment(self.lead(email_status="risky"), filters)[0])

    def test_has_social(self):
        filters = LeadFilters.from_dict({"has_social": True})
        self.assertTrue(evaluate_enrichment(self.lead(social_profiles=["https://facebook.com/x"]), filters)[0])
        self.assertFalse(evaluate_enrichment(self.lead(), filters)[0])

    def test_enriched_only(self):
        filters = LeadFilters.from_dict({"enriched_only": True})
        self.assertTrue(evaluate_enrichment(self.lead(email_status="unknown"), filters)[0])
        self.assertFalse(evaluate_enrichment(self.lead(email_status=None), filters)[0])

    def test_no_enrichment_filters_keeps_everything(self):
        self.assertTrue(evaluate_enrichment(self.lead(email=None, email_status=None), LeadFilters.from_dict({}))[0])


class SortTest(unittest.TestCase):
    def setUp(self):
        self.places = [
            place(company="A", rating=3.5, reviews=500),
            place(company="B", rating=4.9, reviews=10),
            place(company="C", rating=4.2, reviews=250),
        ]

    def test_sort_by_rating(self):
        self.assertEqual([p.company for p in sort_places(self.places, "rating")], ["B", "C", "A"])

    def test_sort_by_reviews(self):
        self.assertEqual([p.company for p in sort_places(self.places, "reviews")], ["A", "C", "B"])

    def test_sort_by_newest(self):
        self.assertEqual([p.company for p in sort_places(self.places, "newest")], ["C", "B", "A"])

    def test_relevance_keeps_maps_order(self):
        self.assertEqual([p.company for p in sort_places(self.places, "relevance")], ["A", "B", "C"])


if __name__ == "__main__":
    unittest.main()
