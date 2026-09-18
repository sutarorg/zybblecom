"""Full worker pipeline: claim → discover → dedupe → enrich → emails → complete.

The Zybble API is replaced by an in-memory double with the same method surface
as ``worker.WorkerApi``, and `gosom/google-maps-scraper` by the offline CLI
double in :mod:`tests.fake_gms`. Everything between them — job orchestration,
coverage planning, the real subprocess/JSONL transport, streaming, dedupe,
filters, enrichment, email discovery and progress reporting — is production code.
"""

from __future__ import annotations

import os
import sys
import unittest

os.environ.setdefault("ZYBBLE_APP_URL", "https://zybble.test")
os.environ.setdefault("SCRAPER_WORKER_SECRET", "test-secret")
os.environ.setdefault("SCRAPER_BATCH_SIZE", "5")

from email_finder import SiteIntel  # noqa: E402
from filters import LeadFilters, evaluate_discovery  # noqa: E402
from scraper import JobTimeout, ScrapeState, place_key  # noqa: E402
import worker as worker_module  # noqa: E402
from tests.fake_gms import MUMBAI_BOX, FakeEngine, build_world, geocode_stub  # noqa: E402


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
        self.intel_calls: list[dict] = []
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
            row["email_status"] = "unknown"
            row["email_source_url"] = None
            self.saved_leads.append(row)
            accepted += 1
        return {
            "ok": True,
            "collected": len(self.saved_leads),
            "accepted": accepted,
            "duplicates": duplicates,
            "filtered": filtered,
        }

    def enrich(self, job):
        self.enrich_calls += 1
        return {"enriched": len(self.saved_leads)}

    def pending_emails(self, job):
        return [lead for lead in self.saved_leads if lead.get("email_status") in (None, "unknown")
                and lead.get("email") is None]

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
        self.original_log = worker_module.log
        self.fakes: list[FakeEngine] = []
        self.log_lines: list[dict] = []

        def quiet_log(level, message, **fields):
            # Keep the suite readable; errors are still printed on teardown.
            self.log_lines.append({"level": level, "message": message, **fields})

        worker_module.log = quiet_log

    def tearDown(self):
        worker_module.run_scrape = self.original_run_scrape
        worker_module.find_site_intel = self.original_intel
        worker_module.log = self.original_log
        for record in self.log_lines:
            if record.get("level") in ("error", "warning"):
                print(f"  [worker:{record['level']}] {record.get('message')} "
                      f"{ {k: v for k, v in record.items() if k not in ('level', 'message')} }",
                      file=sys.stderr)
        for fake in self.fakes:
            fake.cleanup()

    def engine_for(self, world) -> FakeEngine:
        fake = FakeEngine(world)
        self.fakes.append(fake)
        return fake

    def run_job(self, job, world=None, intel=None, after=None, targets_per_batch=6, engine=None):
        """Run the real ``process_job`` against the engine simulator + fake API."""
        simulator = engine or self.engine_for(world if world is not None else build_world(240, seed=7))

        def patched(**kwargs):
            # The worker builds an engine from the environment and caps the plan
            # by MAX_TILES; the test injects the simulator instead.
            kwargs.pop("engine", None)
            kwargs.pop("max_tiles", None)
            result = self.original_run_scrape(
                engine=simulator.engine,
                geocoder=geocode_stub,
                sleep=lambda _seconds: None,
                targets_per_batch=targets_per_batch,
                max_tiles=36,
                **kwargs,
            )
            return after(result) if after else result

        worker_module.run_scrape = patched

        def default_intel(website, engine_candidates=None):
            return None

        def recording_intel(website, engine_candidates=None):
            api_holder["intel"].append({"website": website, "engine_candidates": engine_candidates})
            return (intel or default_intel)(website, engine_candidates=engine_candidates)

        api_holder = {"intel": []}
        worker_module.find_site_intel = recording_intel

        api = FakeApi(job)
        api_holder["intel"] = api.intel_calls
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
        self.assertGreaterEqual(counts.get("errors", -1), 0)

    def test_progress_never_moves_backwards(self):
        api = self.run_job(make_job(quantity=50))
        percents = [call["progress"] for call in api.progress_calls]
        self.assertEqual(percents, sorted(percents), "the progress bar must only ever move forward")
        self.assertLessEqual(max(percents), 99, "the worker never claims 100% — the API closes the job")
        self.assertEqual(api.job["progress"], 100)

    def test_every_saved_lead_satisfies_the_api_contract(self):
        api = self.run_job(make_job(quantity=25))
        self.assertTrue(api.saved_leads)
        required = {
            "company", "category", "address", "city", "state", "country", "phone", "website",
            "maps_url", "rating", "reviews", "hours", "open_status", "place_id", "external_id",
            "latitude", "longitude", "social_profiles", "source_query", "description",
            "email", "email_status", "email_source_url",
        }
        for lead in api.saved_leads:
            self.assertTrue(required.issubset(lead.keys()), f"missing {required - lead.keys()}")
            self.assertTrue(lead["company"])
            self.assertIn(lead["open_status"], {"open", "closed", "permanently_closed", "unknown"})
            self.assertTrue(str(lead["maps_url"]).startswith("https://www.google.com/maps/"))
            if lead["latitude"] is not None:
                self.assertTrue(-90 <= lead["latitude"] <= 90)
            if lead["longitude"] is not None:
                self.assertTrue(-180 <= lead["longitude"] <= 180)

    def test_dentists_mumbai_end_to_end(self):
        world = build_world(240, seed=31, box=MUMBAI_BOX, prefix="Dental Care", category="Dentist")
        api = self.run_job(make_job(query="dentists", location="Mumbai", quantity=50), world=world)
        self.assertTrue(api.completed)
        self.assertEqual(len(api.saved_leads), 50)

    def test_emails_are_discovered_stored_and_counted(self):
        def intel(website, engine_candidates=None):
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

        def intel(_website, engine_candidates=None):
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
        api = self.run_job(make_job(quantity=10), world=world, intel=lambda _w, **_k: None)
        self.assertTrue(api.completed)
        self.assertTrue(api.saved_leads)
        for lead in api.saved_leads:
            self.assertIsNone(lead["website"])
            self.assertEqual(lead["email_status"], "unknown")
        self.assertEqual(api.intel_calls, [], "a business without a website is never looked up")

    def test_one_website_that_explodes_does_not_stop_email_discovery(self):
        calls = {"n": 0}

        def intel(website, engine_candidates=None):
            calls["n"] += 1
            if calls["n"] == 1:
                raise RuntimeError("boom")
            return SiteIntel(email="hi@ironyard.in", status="risky", source_url=f"{website}/contact")

        api = self.run_job(make_job(quantity=10), intel=intel)
        self.assertTrue(api.completed)
        self.assertGreater(sum(1 for lead in api.saved_leads if lead.get("email")), 0)

    def test_engine_email_candidates_are_handed_to_the_site_scan(self):
        """With -email on, the engine's addresses must reach the verifier."""
        world = build_world(20, seed=23)
        for index, business in enumerate(world):
            if business.website:
                business.emails = [f"contact{index}@{business.website.split('//')[-1].split('/')[0]}"]
        fake = self.engine_for(world)
        fake.engine.extract_email = True

        seen: list[dict] = []

        def intel(website, engine_candidates=None):
            seen.append({"website": website, "engine_candidates": engine_candidates})
            return None

        api = self.run_job(make_job(quantity=10), intel=intel, engine=fake)
        self.assertTrue(api.completed)
        self.assertTrue(seen)
        self.assertTrue(
            any(call["engine_candidates"] for call in seen),
            "engine-read addresses are passed through, keyed by website host",
        )

    def test_filters_are_applied_to_the_saved_leads(self):
        api = self.run_job(make_job(quantity=25, filters={"min_rating": 4.7, "has_website": True}))
        self.assertTrue(api.completed)
        self.assertTrue(api.saved_leads)
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
            raise JobTimeout("scrape exceeded its job time budget")

        worker_module.run_scrape = timed_out
        api = FakeApi(make_job(quantity=50))
        worker_module.WorkerApi.create = classmethod(lambda cls: api)
        worker_module.process_job(make_job(quantity=50))

        self.assertTrue(api.resumed)
        self.assertEqual(api.failed, [])
        self.assertEqual(api.job["status"], "queued")

    def test_a_google_challenge_requeues_the_job_with_its_cursor(self):
        fake = self.engine_for(build_world(60, seed=29))
        fake = FakeEngine(build_world(60, seed=29), mode="challenge")
        self.fakes.append(fake)
        api = self.run_job(make_job(quantity=50), engine=fake)
        self.assertFalse(api.completed)
        self.assertEqual(api.failed, [], "a Google challenge is a pause, not a dead job")
        self.assertTrue(api.resumed, "the worker must retry with a fresh browser session")
        self.assertEqual(api.job["status"], "queued")
        self.assertTrue(api.states, "the cursor is saved so the retry resumes instead of restarting")

    def test_the_heartbeat_reports_the_engine_build(self):
        """/api/ready shows which pinned engine a running worker uses."""
        label = worker_module.engine_label(
            {"available": True, "engine_version": "v1.18.0", "engine_commit": "2b8616d0ccf7d3c578b42a7440e3c13bb22e5083"}
        )
        self.assertEqual(label, "google-maps-scraper v1.18.0+2b8616d")
        self.assertEqual(worker_module.engine_label({"available": True}), "google-maps-scraper")
        self.assertIn("unavailable", worker_module.engine_label({"available": False}))

    def test_a_missing_engine_is_logged_with_its_reason(self):
        """The operator sees *why* the job failed, not just that it did."""
        logs: list[dict] = []
        original = worker_module.log
        worker_module.log = lambda level, message, **fields: logs.append(
            {"level": level, "message": message, **fields}
        )
        try:
            api = FakeApi(make_job(quantity=5))
            worker_module.WorkerApi.create = classmethod(lambda cls: api)
            worker_module.run_scrape = lambda **_kwargs: (_ for _ in ()).throw(
                worker_module.EngineUnavailable("google-maps-scraper is not installed")
            )
            worker_module.process_job(make_job(quantity=5))
        finally:
            worker_module.log = original
        record = next(item for item in logs if item["message"] == "scraping engine unavailable")
        self.assertEqual(record["level"], "error")
        self.assertIn("not installed", record["error"])
        self.assertEqual(api.job["status"], "failed")

    def test_a_missing_engine_is_not_retried_forever(self):
        api = FakeApi(make_job(quantity=10))
        worker_module.WorkerApi.create = classmethod(lambda cls: api)
        worker_module.run_scrape = lambda **_kwargs: (_ for _ in ()).throw(
            worker_module.EngineUnavailable("google-maps-scraper is not installed")
        )
        worker_module.process_job(make_job(quantity=10))
        self.assertTrue(api.failed)
        _error, retryable = api.failed[0]
        self.assertFalse(retryable, "a missing binary cannot fix itself by retrying")
        self.assertEqual(api.job["status"], "failed")


if __name__ == "__main__":
    unittest.main()
