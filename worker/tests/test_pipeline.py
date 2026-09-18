"""Full worker pipeline: claim → discover → dedupe → enrich → emails → complete.

The API is replaced by an in-memory double with the same method surface as
``worker.WorkerApi``, and the browser by :class:`tests.fake_maps.FakeDriver`.
The job orchestration code under test is the real production code path.
"""

from __future__ import annotations

import os
import unittest

os.environ.setdefault("ZYBBLE_APP_URL", "https://zybble.test")
os.environ.setdefault("SCRAPER_WORKER_SECRET", "test-secret")
os.environ.setdefault("SCRAPER_BATCH_SIZE", "5")

from email_finder import SiteIntel  # noqa: E402
from filters import LeadFilters, evaluate_discovery  # noqa: E402
from scraper import JobTimeout, ScrapeState, place_key  # noqa: E402
import worker as worker_module  # noqa: E402
from tests.fake_maps import FakeDriver, FakeMaps, build_world, geocode_stub  # noqa: E402


class FakeApi:
    """In-memory stand-in for the Zybble worker control plane."""

    def __init__(self, job: dict):
        self.job = dict(job)
        self.saved_leads: list[dict] = []
        self.progress_calls: list[dict] = []
        self.states: list[dict] = []
        self.completed = False
        self.failed: list[tuple[str, bool]] = []
        self.resumed: list[str] = []
        self.enrich_calls = 0
        self._seen: set[str] = set()
        self._next_id = 1

    class _Session:
        def close(self):
            return None

    @property
    def session(self):
        return self._Session()

    # ——— endpoints ———

    def progress(self, job, status, progress, message=None, counts=None):
        self.progress_calls.append(
            {"status": status, "progress": progress, "message": message, "counts": dict(counts or {})}
        )
        self.job["status"] = status
        self.job["progress"] = progress
        if counts:
            self.job.setdefault("counts", {}).update(counts)
        return {"ok": True}

    def save_state(self, job, state: ScrapeState):
        self.states.append(state.to_dict())
        self.job["coverage_state"] = state.to_dict()
        return {"ok": True}

    def leads(self, job, places):
        accepted = 0
        duplicates = 0
        filtered = 0
        filters = LeadFilters.from_dict(self.job.get("filters") or {})
        for place in places:
            key = place_key(place)
            if key in self._seen:
                duplicates += 1
                continue
            keep, _reason = evaluate_discovery(place, filters)
            if not keep:
                filtered += 1
                continue
            self._seen.add(key)
            row = place.json()
            row["id"] = f"lead-{self._next_id}"
            self._next_id += 1
            row["email"] = None
            row["email_status"] = None
            self.saved_leads.append(row)
            accepted += 1
        return {"collected": len(self.saved_leads), "accepted": accepted, "duplicates": duplicates, "filtered": filtered}

    def enrich(self, job):
        self.enrich_calls += 1
        return {"enriched": len(self.saved_leads)}

    def pending_emails(self, job):
        return [lead for lead in self.saved_leads if lead.get("email_status") is None]

    def email(self, job, lead_id, **fields):
        for lead in self.saved_leads:
            if lead["id"] == lead_id:
                lead["email"] = fields.get("email")
                lead["email_status"] = fields.get("email_status")
                lead["email_source_url"] = fields.get("email_source_url")
                lead["social_profiles"] = fields.get("social_profiles") or []
                return {"ok": True}
        raise AssertionError(f"unknown lead {lead_id}")

    def resume(self, job, message):
        self.resumed.append(message)
        self.job["status"] = "queued"
        return {"ok": True, "retry": True}

    def complete(self, job):
        self.completed = True
        self.job["status"] = "complete"
        self.job["progress"] = 100
        self.job["collected"] = len(self.saved_leads)
        return {"collected": len(self.saved_leads), "refunded": max(0, self.job["quantity"] - len(self.saved_leads))}

    def fail(self, job, error, retryable, max_attempts=None):
        self.failed.append((error, retryable))
        self.job["status"] = "queued" if retryable else "failed"
        return {"ok": True, "retry": retryable}

    # ——— helpers ———

    def stages(self) -> list[str]:
        return [call["status"] for call in self.progress_calls]

    def companies(self) -> list[str]:
        return [lead["company"] for lead in self.saved_leads]


def make_job(**overrides) -> dict:
    job = {
        "id": "job-1",
        "query": "gym",
        "location": "Delhi",
        "quantity": 50,
        "radius_meters": 25_000,
        "status": "queued",
        "progress": 0,
        "collected": 0,
        "worker_attempts": 1,
        "lease_token": "11111111-1111-1111-1111-111111111111",
        "filters": {},
        "coverage_state": {},
    }
    job.update(overrides)
    return job


class PipelineTest(unittest.TestCase):
    def setUp(self):
        self.original_run_scrape = worker_module.run_scrape
        self.original_intel = worker_module.find_site_intel

    def tearDown(self):
        worker_module.run_scrape = self.original_run_scrape
        worker_module.find_site_intel = self.original_intel

    def run_job(self, job, world=None, intel=None, after=None):
        """Run the real ``process_job`` against fake Maps + an in-memory API."""
        maps = FakeMaps(world if world is not None else build_world(240, seed=7))
        driver = FakeDriver(maps)

        def patched(**kwargs):
            result = self.original_run_scrape(
                driver=driver,
                geocoder=geocode_stub,
                sleep=lambda _seconds: None,
                page_timeout=1,
                **kwargs,
            )
            return after(result) if after else result

        worker_module.run_scrape = patched
        worker_module.find_site_intel = intel or (lambda website: None)

        api = FakeApi(job)
        worker_module.WorkerApi.create = classmethod(lambda cls: api)
        worker_module.process_job(job)
        return api

    def test_gym_delhi_fifty_leads_end_to_end(self):
        api = self.run_job(make_job(quantity=50))

        self.assertTrue(api.completed, "the job must reach completion")
        self.assertEqual(len(api.saved_leads), 50, "50 requested leads must be saved")
        self.assertEqual(len(set(api.companies())), 50, "no duplicates in the saved leads")
        self.assertEqual(api.job["status"], "complete")
        self.assertEqual(api.job["progress"], 100)

        stages = api.stages()
        for stage in ("searching", "collecting", "deduplicating", "enriching", "finding_emails"):
            self.assertIn(stage, stages, f"stage {stage} must be reported")

        counts = api.job.get("counts", {})
        self.assertEqual(counts.get("unique"), 50)
        self.assertEqual(counts.get("saved"), 50)
        self.assertGreaterEqual(counts.get("discovered", 0), 50)

    def test_dentists_mumbai_end_to_end(self):
        from tests.fake_maps import MUMBAI_BOX

        world = build_world(240, seed=31, box=MUMBAI_BOX, prefix="Dental Care", category="Dentist")
        api = self.run_job(make_job(query="dentists", location="Mumbai", quantity=50), world=world)
        self.assertTrue(api.completed)
        self.assertEqual(len(api.saved_leads), 50)

    def test_emails_are_discovered_stored_and_counted(self):
        def intel(website):
            return SiteIntel(
                email=f"hello@{website.split('//')[-1].split('/')[0]}",
                status="verified",
                source_url=f"{website}/contact",
                social_profiles=["https://facebook.com/x", "https://instagram.com/x"],
            )

        api = self.run_job(make_job(quantity=20), intel=intel)
        mailable = [lead for lead in api.saved_leads if lead.get("website")]
        with_email = [lead for lead in api.saved_leads if lead.get("email")]
        self.assertTrue(mailable)
        self.assertEqual(len(with_email), len(mailable), "every business with a website gets an address")
        for lead in with_email:
            self.assertEqual(lead["email_status"], "verified")
            self.assertTrue(lead["email_source_url"].endswith("/contact"))
            self.assertEqual(len(lead["social_profiles"]), 2)
        self.assertEqual(api.job["counts"]["email_found"], len(mailable))

    def test_invalid_email_never_fails_the_job(self):
        """The reported 'Invalid email address' failure mode."""

        def intel(_website):
            return SiteIntel(email="not-an-email", status="verified", source_url="https://x/contact")

        api = self.run_job(make_job(quantity=10), intel=intel)
        self.assertTrue(api.completed, "a malformed address must not fail the search")
        self.assertEqual(api.failed, [])
        self.assertEqual(len(api.saved_leads), 10, "the business is kept even when its email is unusable")
        for lead in api.saved_leads:
            self.assertIsNone(lead["email"])
            self.assertEqual(lead["email_status"], "unknown")
        self.assertEqual(api.job["counts"]["email_found"], 0)

    def test_no_website_means_unknown_not_failure(self):
        world = build_world(30, seed=17)
        for business in world:
            business.website = None
        api = self.run_job(make_job(quantity=10), world=world, intel=lambda _w: None)
        self.assertTrue(api.completed)
        self.assertTrue(api.leads)
        for lead in api.saved_leads:
            self.assertIsNone(lead["website"])
            self.assertEqual(lead["email_status"], "unknown")

    def test_one_website_that_explodes_does_not_stop_email_discovery(self):
        calls = {"n": 0}

        def intel(website):
            calls["n"] += 1
            if calls["n"] == 1:
                raise RuntimeError("boom")
            return SiteIntel(email="hi@ironyard.in", status="risky", source_url=f"{website}/contact")

        api = self.run_job(make_job(quantity=10), intel=intel)
        self.assertTrue(api.completed)
        self.assertGreater(sum(1 for lead in api.saved_leads if lead.get("email")), 0)

    def test_filters_are_applied_to_the_saved_leads(self):
        api = self.run_job(make_job(quantity=25, filters={"min_rating": 4.7, "has_website": True}))
        self.assertTrue(api.completed)
        self.assertTrue(api.leads)
        for lead in api.saved_leads:
            self.assertGreaterEqual(lead["rating"], 4.7)
            self.assertIsNotNone(lead["website"])

    def test_small_source_completes_with_what_exists(self):
        api = self.run_job(make_job(quantity=50), world=build_world(3, seed=3))
        self.assertTrue(api.completed)
        self.assertEqual(len(api.saved_leads), 3, "never invent leads to fill the request")
        self.assertEqual(api.job["counts"]["unique"], 3)

    def test_unfinished_sweep_resumes_instead_of_failing(self):
        def unfinished(result):
            # Simulates hitting the time budget with coverage left to search.
            result.exhausted = False
            return result

        # A small source: 30 businesses exist but 50 were requested, so the
        # sweep finishes with fewer results and coverage left to search.
        api = self.run_job(make_job(quantity=50), world=build_world(30, seed=8), after=unfinished)
        self.assertTrue(api.resumed, "an unfinished sweep must resume, not fail")
        self.assertEqual(api.job["status"], "queued")
        self.assertEqual(api.failed, [])
        self.assertTrue(api.states, "the coverage cursor is persisted before handing the job back")

    def test_a_scrape_timeout_is_resumable_not_fatal(self):
        def timed_out(**kwargs):
            self.original_run_scrape(
                driver=FakeDriver(FakeMaps(build_world(240, seed=7))),
                geocoder=geocode_stub,
                sleep=lambda _seconds: None,
                page_timeout=1,
                **kwargs,
            )
            raise JobTimeout("scrape exceeded its job time budget")

        worker_module.run_scrape = timed_out
        api = FakeApi(make_job(quantity=50))
        worker_module.WorkerApi.create = classmethod(lambda cls: api)
        worker_module.process_job(make_job(quantity=50))

        self.assertTrue(api.resumed)
        self.assertEqual(api.failed, [])
        self.assertEqual(api.job["status"], "queued")


if __name__ == "__main__":
    unittest.main()
