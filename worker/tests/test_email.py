"""Email discovery: valid addresses only, never fatal, never invented."""

from __future__ import annotations

import unittest

import email_finder as ef
from email_finder import extract_social_profiles, find_email, find_site_intel, normalize_email

CONTACT_PAGE = """
<html><body>
  <p>Email us at <a href="mailto:hello@ironyard.example.in">hello@ironyard.example.in</a></p>
  <a href="https://www.facebook.com/ironyard">Facebook</a>
  <a href="https://www.instagram.com/ironyard">Instagram</a>
  <img src="/logo@2x.png">
  <script>var tracking = "noreply@ironyard.example.in";</script>
</body></html>
"""

HOMEPAGE_WITH_OBFUSCATED = """
<html><body>
  <p>Contact: sales (at) ironclad (dot) in</p>
  <a href="https://www.linkedin.com/company/ironclad">LinkedIn</a>
</body></html>
"""

NO_EMAIL_PAGE = "<html><body><p>Call us on +91 11 4000 0000</p></body></html>"

BROKEN_PAGE = """
<html><body>
  <a href="mailto:not-an-email">not-an-email</a>
  <a href="mailto:support@ironyard.png">support@ironyard.png</a>
  <p>hello@</p>
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


class SocialTest(unittest.TestCase):
    def test_social_profiles_are_collected_and_deduplicated(self):
        socials = extract_social_profiles(
            '<a href="https://www.facebook.com/a">f</a>'
            '<a href="https://www.facebook.com/a">f again</a>'
            '<a href="https://instagram.com/a">i</a>'
            '<a href="https://twitter.com/a">t</a>'
        )
        self.assertEqual(len(socials), 3)
        self.assertTrue(any("facebook.com" in url for url in socials))

    def test_non_social_links_are_ignored(self):
        self.assertEqual(extract_social_profiles('<a href="https://example.com/about">about</a>'), [])


class DiscoveryTest(unittest.TestCase):
    def setUp(self):
        self.original_fetch = ef._fetch
        self.original_mx = ef._mx

    def tearDown(self):
        ef._fetch = self.original_fetch
        ef._mx = self.original_mx

    def test_mailto_on_contact_page_is_verified(self):
        ef._fetch = lambda url: CONTACT_PAGE if url.endswith("/contact") else "<html></html>"
        ef._mx = lambda domain: True
        intel = find_site_intel("https://ironyard.example.in")
        self.assertIsNotNone(intel)
        self.assertEqual(intel.email, "hello@ironyard.example.in")
        self.assertEqual(intel.status, "verified")
        self.assertEqual(len(intel.social_profiles), 2)

    def test_obfuscated_address_is_risky_and_still_stored(self):
        ef._fetch = lambda url: HOMEPAGE_WITH_OBFUSCATED if url.endswith("/") else None
        ef._mx = lambda domain: None  # resolver uncertainty is not invalidity
        intel = find_site_intel("https://ironclad.example.in")
        self.assertIsNotNone(intel)
        self.assertEqual(intel.email, "sales@ironclad.in")
        self.assertEqual(intel.status, "risky")
        self.assertTrue(any("linkedin.com" in url for url in intel.social_profiles))

    def test_domain_without_mail_records_is_invalid(self):
        ef._fetch = lambda url: CONTACT_PAGE if url.endswith("/contact") else "<html></html>"
        ef._mx = lambda domain: False
        intel = find_site_intel("https://ironyard.example.in")
        self.assertEqual(intel.status, "invalid")

    def test_no_email_returns_none_and_never_raises(self):
        ef._fetch = lambda url: NO_EMAIL_PAGE
        ef._mx = lambda domain: True
        self.assertIsNone(find_site_intel("https://ironyard.example.in"))
        self.assertIsNone(find_email("https://ironyard.example.in"))

    def test_malformed_candidates_are_skipped_not_returned(self):
        ef._fetch = lambda url: BROKEN_PAGE if url.endswith("/contact") else "<html></html>"
        ef._mx = lambda domain: True
        # Nothing valid on the page: an unreachable/invalid address is reported
        # as "unknown" by the caller, never stored and never fatal.
        self.assertIsNone(find_email("https://ironyard.example.in"))

    def test_unreachable_site_is_not_an_error(self):
        ef._fetch = lambda url: None
        self.assertIsNone(find_site_intel("https://offline.example.in"))

    def test_garbage_site_url_is_not_an_error(self):
        self.assertIsNone(find_site_intel("not a url"))
        self.assertIsNone(find_site_intel(""))

    def test_socials_survive_a_page_without_email(self):
        ef._fetch = lambda url: (
            '<html><body><a href="https://www.instagram.com/ironyard">ig</a></body></html>'
            if url.endswith("/contact")
            else "<html></html>"
        )
        ef._mx = lambda domain: True
        intel = find_site_intel("https://ironyard.example.in")
        self.assertIsNotNone(intel)
        self.assertIsNone(intel.email)
        self.assertEqual(intel.status, "unknown")
        self.assertEqual(len(intel.social_profiles), 1)

    def test_private_and_internal_hosts_are_never_fetched(self):
        for host in ("http://localhost:8080", "http://169.254.169.254/latest", "http://10.0.0.5"):
            with self.subTest(host=host):
                self.assertFalse(ef._public_url(host))


if __name__ == "__main__":
    unittest.main()
