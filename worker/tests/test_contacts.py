"""Contact validation: engine-sourced emails only, never guessed, never fatal.

Emails in Zybble come from exactly one place — the pinned
``gosom/google-maps-scraper`` engine (``-email``) — and are held to strict
syntax plus DNS MX rules before anything is stored. This module tests that
contract, the multi-phone/multi-email handling, and the SSRF-guarded social
profile enrichment (which never looks for an address).
"""

from __future__ import annotations

import unittest

import engine_contacts as contacts
import site_enrichment as site
from engine_contacts import (
    normalize_email,
    normalize_phone,
    normalize_phones,
    verify_engine_emails,
)
from site_enrichment import extract_social_profiles, find_social_profiles

CONTACT_PAGE = """
<html><body>
  <p>Email us at <a href="mailto:hello@ironyard.example.in">hello@ironyard.example.in</a></p>
  <a href="https://www.facebook.com/ironyard">Facebook</a>
  <a href="https://www.instagram.com/ironyard">Instagram</a>
  <img src="/logo@2x.png">
  <script>var tracking = "noreply@ironyard.example.in";</script>
</body></html>
"""

SOCIAL_ONLY_PAGE = """
<html><body>
  <a href="https://www.linkedin.com/company/ironclad">LinkedIn</a>
  <a href="https://www.linkedin.com/company/ironclad">LinkedIn again</a>
  <a href="https://twitter.com/ironclad">Twitter</a>
</body></html>
"""


class NormalizeTest(unittest.TestCase):
    def test_valid_addresses_are_cleaned(self):
        self.assertEqual(normalize_email("  Hello@IronYard.IN "), "hello@ironyard.in")
        self.assertEqual(normalize_email("mailto:info@shop.co.uk"), "info@shop.co.uk")
        self.assertEqual(normalize_email("<sales@ironyard.in>"), "sales@ironyard.in")
        self.assertEqual(normalize_email("first.last+tag@sub.domain.co"), "first.last+tag@sub.domain.co")

    def test_invalid_addresses_are_rejected(self):
        for bad in (
            None,
            "",
            "not-an-email",
            "hello@",
            "@example.com",
            "a@@b.com",
            "a..b@example.com",
            ".a@example.com",
            "a.@example.com",
            "a@example.",
            "a@-example.com",
            "a@example.c",
            "noreply@example.com",
            "webmaster@example.com",
            "someone@example.com",
            "avatar@company.png",
            "style@site.css",
            "x" * 250 + "@example.com",
        ):
            with self.subTest(address=bad):
                self.assertIsNone(normalize_email(bad), f"{bad!r} must be rejected")

    def test_nothing_is_ever_invented(self):
        self.assertIsNone(normalize_email("unknown"))
        self.assertIsNone(normalize_email("no email available"))


class PhoneTest(unittest.TestCase):
    def test_a_number_is_cleaned_and_kept(self):
        self.assertEqual(normalize_phone(" +91 11 4000 0000 "), "+91 11 4000 0000")
        self.assertEqual(normalize_phone("(212) 555-0100"), "(212) 555-0100")
        self.assertEqual(normalize_phone("+1 415 555 2671 ext. 12"), "+1 415 555 2671 ext. 12")

    def test_non_numbers_are_rejected(self):
        for bad in (None, "", "call us", "hello@ironyard.in", "https://ironyard.in", "12345"):
            with self.subTest(value=bad):
                self.assertIsNone(normalize_phone(bad))

    def test_several_numbers_survive_as_a_list(self):
        phones = normalize_phones("+91 11 4000 0000, +91 11 4000 0001", ["+1 212 555 0100"])
        self.assertEqual(
            phones,
            ["+91 11 4000 0000", "+91 11 4000 0001", "+1 212 555 0100"],
        )

    def test_duplicates_and_junk_are_dropped_and_the_list_is_capped(self):
        phones = normalize_phones("+1 212 555 0100; +1 212 555 0100; nope; +1 212 555 0101; +1 212 555 0102; +1 212 555 0103")
        self.assertEqual(len(phones), 3)
        self.assertEqual(phones[0], "+1 212 555 0100")
        self.assertNotIn("nope", phones)


class EngineEmailTest(unittest.TestCase):
    """Addresses the engine read on a business website are the only source."""

    def setUp(self):
        self.original_mx = contacts._resolve_mx
        self.original_cache = dict(contacts._MX_CACHE)

    def tearDown(self):
        contacts._resolve_mx = self.original_mx
        contacts._MX_CACHE.clear()
        contacts._MX_CACHE.update(self.original_cache)

    def verify(self, candidates, mx=True):
        contacts._MX_CACHE.clear()
        contacts._resolve_mx = lambda domain: mx
        return verify_engine_emails(candidates)

    def test_malformed_and_role_addresses_never_survive(self):
        pairs = self.verify(
            ["not-an-email", "noreply@x.example.in", "hello@", "a@b", "sales@x.example.in"]
        )
        self.assertEqual([address for address, _ in pairs], ["sales@x.example.in"])

    def test_every_valid_address_is_kept_not_just_the_first(self):
        pairs = self.verify(["one@x.example.in", "two@x.example.in", "three@x.example.in"])
        self.assertEqual(
            [address for address, _ in pairs],
            ["one@x.example.in", "two@x.example.in", "three@x.example.in"],
        )

    def test_duplicates_are_collapsed_and_the_list_is_capped(self):
        pairs = self.verify(["a@x.example.in", "A@X.example.in"] + [f"x{i}@example.in" for i in range(10)])
        self.assertEqual(len(pairs), 5)
        self.assertEqual(pairs[0][0], "a@x.example.in")

    def test_statuses_reflect_dns_not_optimism(self):
        contacts._MX_CACHE.clear()
        contacts._resolve_mx = lambda domain: domain.endswith("example.in")
        pairs = verify_engine_emails(["hello@ironyard.example.in", "hello@nope.test"])
        self.assertEqual(pairs[0], ("hello@ironyard.example.in", "verified"))
        self.assertEqual(pairs[1], ("hello@nope.test", "invalid"))

    def test_resolver_uncertainty_is_risky_never_invalid(self):
        contacts._MX_CACHE.clear()
        contacts._resolve_mx = lambda domain: None
        self.assertEqual(verify_engine_emails(["hello@x.example.in"]), [("hello@x.example.in", "risky")])

    def test_nothing_in_means_nothing_out(self):
        self.assertEqual(self.verify(None), [])
        self.assertEqual(self.verify([]), [])
        self.assertEqual(self.verify(""), [])
        self.assertEqual(self.verify(123), [])

    def test_a_single_string_candidate_is_accepted(self):
        self.assertEqual(self.verify("hello@x.example.in")[0][0], "hello@x.example.in")


class SocialTest(unittest.TestCase):
    def test_social_profiles_are_collected_and_deduplicated(self):
        socials = extract_social_profiles(SOCIAL_ONLY_PAGE)
        self.assertEqual(len(socials), 2)
        self.assertTrue(any("linkedin.com" in url for url in socials))

    def test_non_social_links_are_ignored(self):
        self.assertEqual(extract_social_profiles('<a href="https://example.com/about">about</a>'), [])

    def test_a_page_with_an_address_yields_no_address(self):
        """The social scan has no concept of an email — that is the whole point."""
        socials = extract_social_profiles(CONTACT_PAGE)
        self.assertTrue(socials)
        self.assertNotIn("hello@ironyard.example.in", socials)


class SocialDiscoveryTest(unittest.TestCase):
    def setUp(self):
        self.original_fetch = site._fetch

    def tearDown(self):
        site._fetch = self.original_fetch

    def test_socials_are_found_on_the_contact_page(self):
        site._fetch = lambda url: SOCIAL_ONLY_PAGE if url.endswith("/contact") else "<html></html>"
        self.assertEqual(len(find_social_profiles("https://ironclad.example.in")), 2)

    def test_unreachable_site_and_garbage_url_are_not_errors(self):
        site._fetch = lambda url: None
        self.assertEqual(find_social_profiles("https://offline.example.in"), [])
        self.assertEqual(find_social_profiles("not a url"), [])
        self.assertEqual(find_social_profiles(""), [])

    def test_private_and_internal_hosts_are_never_fetched(self):
        for host in ("http://localhost:8080", "http://169.254.169.254/latest", "http://10.0.0.5"):
            with self.subTest(host=host):
                self.assertFalse(site._public_url(host))


if __name__ == "__main__":
    unittest.main()
