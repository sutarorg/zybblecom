"""Zybble scraper worker — production queue consumer.

Runs the Google Maps discovery engine (``scraper.run_scrape``, powered by the
open-source `gosom/google-maps-scraper <https://github.com/gosom/google-maps-scraper>`_
binary — see ``worker/gmaps_engine.py``) and streams what it finds into Zybble's
Supabase pipeline through the authenticated ``/api/worker/*`` control plane.

Responsibilities
----------------
1. claim a job (atomic lease, one job per lease token);
2. sweep the whole requested area — one batch of Google Maps viewports per
   engine invocation — until the requested number of *unique, filtered*
   businesses is collected or the coverage plan is exhausted;
3. deduplicate (place id → Maps URL → name+address) and apply the user's
   filters while scraping, persisting crash-safe batches;
4. enrich the stored rows and resolve each business's public social profiles
   (emails arrive with the leads themselves — straight from the scraping
   engine, validated before they are stored);
5. report every counter the UI shows, then complete the job.

Resilience
----------
* Every engine invocation is bounded by a time budget and runs in its own
  process group, so a stuck browser is always killed and can never be orphaned.
  Hitting the budget is **not** a failure: the coverage cursor is saved and the
  job resumes on the next claim.
* One unreadable business, one unreachable website and one malformed email
  address can never fail a job — they increment warnings and the sweep continues.
* The worker holds no Supabase credentials; all storage goes through the app.
"""

from __future__ import annotations

import json
import os
import signal
import socket
import threading
import time
import traceback
from concurrent.futures import Future, ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Any, Optional

import requests

from filters import LeadFilters
from gmaps_engine import EngineError, EngineUnavailable, GosomEngine
from scraper import (
    ChallengeError,
    JobTimeout,
    Place,
    ScrapeState,
    engine_summary,
    run_scrape,
)
from site_enrichment import find_social_profiles

APP_URL = os.environ["ZYBBLE_APP_URL"].rstrip("/")
WORKER_SECRET = os.environ["SCRAPER_WORKER_SECRET"]
CONCURRENCY = max(1, min(4, int(os.environ.get("SCRAPER_CONCURRENCY", "2"))))
POLL_SECONDS = max(2.0, float(os.environ.get("SCRAPER_POLL_SECONDS", "5")))
# Time budget for the browser phase of ONE claim. The job resumes afterwards,
# so this is a slice length, not a hard cap on the search.
JOB_TIMEOUT = max(300, int(os.environ.get("SCRAPER_JOB_TIMEOUT_SECONDS", "1200")))
#: Time budget for the website-enrichment sweep (public social profiles).
#: Emails no longer need it: they arrive with the engine's lead batches.
ENRICH_BUDGET = max(60, int(os.environ.get("SCRAPER_EMAIL_BUDGET_SECONDS", "600")))
BATCH_SIZE = max(1, min(25, int(os.environ.get("SCRAPER_BATCH_SIZE", "10"))))
MAX_TILES = max(1, min(72, int(os.environ.get("SCRAPER_MAX_TILES", "36"))))
MAX_ATTEMPTS = max(1, min(12, int(os.environ.get("SCRAPER_MAX_ATTEMPTS", "6"))))
TARGETS_PER_RUN = max(1, min(24, int(os.environ.get("SCRAPER_TARGETS_PER_RUN", "6"))))
INSTANCE_ID = os.environ.get("HOSTNAME") or socket.gethostname()

stopping = threading.Event()


def log(level: str, message: str, **fields) -> None:
    print(
        json.dumps(
            {"level": level, "message": message, "service": "zybble-scraper",
             "instance": INSTANCE_ID, "ts": time.time(), **fields},
            default=str,
        ),
        flush=True,
    )


class ApiError(RuntimeError):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


@dataclass
class WorkerApi:
    session: requests.Session

    @classmethod
    def create(cls) -> "WorkerApi":
        session = requests.Session()
        session.headers.update(
            {
                "Authorization": f"Bearer {WORKER_SECRET}",
                "Content-Type": "application/json",
                "User-Agent": "ZybbleScraperWorker/1.0",
            }
        )
        return cls(session)

    def call(
        self,
        method: str,
        path: str,
        body: Optional[dict] = None,
        lease: Optional[str] = None,
        timeout: int = 30,
    ) -> dict:
        headers = {"X-Job-Lease": lease} if lease else None
        try:
            response = self.session.request(
                method,
                f"{APP_URL}/api{path}",
                json=body,
                headers=headers,
                timeout=timeout,
            )
        except requests.RequestException as err:
            raise ApiError(503, f"Zybble API unavailable: {err}") from err
        try:
            payload = response.json() if response.content else {}
        except ValueError:
            payload = {}
        if not response.ok:
            raise ApiError(response.status_code, payload.get("error", response.text[:240]))
        return payload

    # ——— control plane ———

    def heartbeat(self, status: str = "healthy", **details) -> None:
        self.call(
            "POST",
            "/worker/heartbeat",
            {"instance_id": INSTANCE_ID, "status": status, "details": details},
        )

    def claim(self) -> Optional[dict]:
        payload = self.call("POST", "/worker/claim", {"instance_id": INSTANCE_ID})
        return payload.get("job")

    def progress(
        self,
        job: dict,
        status: str,
        progress: float,
        message: Optional[str] = None,
        counts: Optional[dict] = None,
    ) -> None:
        body: dict[str, Any] = {"status": status, "progress": max(1, min(99, int(progress)))}
        if message:
            body["message"] = message[:280]
        if counts:
            body["counts"] = counts
        self.call("POST", f"/worker/jobs/{job['id']}/progress", body, job["lease_token"])

    def save_state(self, job: dict, state: ScrapeState) -> None:
        self.call(
            "POST",
            f"/worker/jobs/{job['id']}/state",
            {"state": state.to_dict()},
            job["lease_token"],
            timeout=45,
        )

    def leads(self, job: dict, places: list[Place]) -> dict:
        return self.call(
            "POST",
            f"/worker/jobs/{job['id']}/leads",
            {"leads": [place.json() for place in places]},
            job["lease_token"],
            timeout=60,
        )

    def enrich(self, job: dict) -> dict:
        return self.call("POST", f"/worker/jobs/{job['id']}/enrich", {}, job["lease_token"], timeout=45)

    def pending_enrichment(self, job: dict) -> list[dict]:
        """Leads whose public social profiles have not been resolved yet."""
        payload = self.call(
            "GET",
            f"/worker/jobs/{job['id']}/pending-enrichment",
            lease=job["lease_token"],
        )
        return payload.get("leads", [])

    def enrichment(self, job: dict, lead_id: str, **fields) -> None:
        self.call(
            "POST",
            f"/worker/jobs/{job['id']}/leads/{lead_id}/enrichment",
            fields,
            job["lease_token"],
        )

    def resume(self, job: dict, message: str) -> dict:
        return self.call(
            "POST",
            f"/worker/jobs/{job['id']}/resume",
            {"message": message[:280], "max_attempts": MAX_ATTEMPTS},
            job["lease_token"],
        )

    def complete(self, job: dict) -> dict:
        return self.call("POST", f"/worker/jobs/{job['id']}/complete", {}, job["lease_token"], timeout=45)

    def fail(self, job: dict, error: str, retryable: bool) -> dict:
        return self.call(
            "POST",
            f"/worker/jobs/{job['id']}/fail",
            {"error": error[:280], "retryable": retryable, "max_attempts": MAX_ATTEMPTS},
            job["lease_token"],
        )


class ProgressReporter:
    """Rate-limits progress calls so the API is not flooded per business."""

    def __init__(self, api: WorkerApi, job: dict, min_interval: float = 2.0):
        self.api = api
        self.job = job
        self.min_interval = min_interval
        self._last = 0.0
        self._last_stage: Optional[str] = None

    def report(self, stage: str, percent: float, message: Optional[str] = None, counts: Optional[dict] = None, force: bool = False) -> None:
        now = time.monotonic()
        stage_changed = stage != self._last_stage
        if not force and not stage_changed and now - self._last < self.min_interval:
            return
        self._last = now
        self._last_stage = stage
        try:
            self.api.progress(self.job, stage, percent, message, counts)
        except Exception as err:  # noqa: BLE001 - progress is best-effort
            log("warning", "progress update failed", job=self.job["id"], error=str(err))


def process_job(job: dict) -> None:
    api = WorkerApi.create()
    job_id = job["id"]
    quantity = max(1, int(job.get("quantity", 1)))
    filters = LeadFilters.from_dict(job.get("filters") or {})
    state = ScrapeState.from_dict(job.get("coverage_state") or {})
    saved = int(job.get("collected", 0) or 0)

    log(
        "info",
        "job started",
        job=job_id,
        query=job["query"],
        location=job["location"],
        quantity=quantity,
        radius=job.get("radius_meters"),
        resume_index=state.target_index,
        already_collected=saved,
    )

    reporter = ProgressReporter(api, job)
    pending_batch: list[Place] = []
    counters = {
        "discovered": int(state.stats.discovered or 0),
        "unique": int(state.stats.unique or 0),
        "duplicates": int(state.stats.duplicates or 0),
        "filtered": int(state.stats.filtered or 0),
        "errors": int(state.stats.errors or 0),
        "saved": saved,
        "email_found": int(job.get("email_found_count", 0) or 0),
    }

    def flush() -> None:
        nonlocal pending_batch
        if not pending_batch:
            return
        try:
            result = api.leads(job, pending_batch)
            counters["saved"] = int(result.get("collected", counters["saved"]))
            counters["duplicates"] += int(result.get("duplicates", 0) or 0)
            counters["filtered"] += int(result.get("filtered", 0) or 0)
            if result.get("email_found") is not None:
                counters["email_found"] = int(result["email_found"] or 0)
        except ApiError as err:
            # A rejected batch must not lose the rest of the sweep.
            counters["errors"] += 1
            log("error", "lead batch rejected", job=job_id, status=err.status, error=str(err))
        finally:
            pending_batch = []

    try:
        api.progress(job, "searching", 3, "Planning search coverage…")

        def on_stage(stage: str, percent: float, stats, message: str) -> None:
            counters["discovered"] = stats.discovered
            counters["unique"] = stats.unique
            counters["duplicates"] = stats.duplicates
            counters["filtered"] = stats.filtered
            counters["errors"] = stats.errors
            reporter.report(
                stage,
                percent,
                message,
                counts={
                    **counters,
                    "targets_total": stats.targets_total,
                    "targets_done": stats.targets_done,
                },
            )

        def on_place(place: Place, position: int, total: int) -> None:
            pending_batch.append(place)
            if len(pending_batch) >= BATCH_SIZE:
                flush()
                reporter.report("collecting", 30 + int((position / max(1, total)) * 38),
                                f"Discovering businesses · {counters['saved']}/{quantity} saved",
                                counts=counters)

        def on_state(new_state: ScrapeState) -> None:
            # Crash-safe: the cursor is persisted after every search target.
            try:
                api.save_state(job, new_state)
            except Exception as err:  # noqa: BLE001
                log("warning", "coverage state not persisted", job=job_id, error=str(err))

        budget = max(120, JOB_TIMEOUT)
        result = run_scrape(
            query=job["query"],
            location=job["location"],
            radius_meters=int(job.get("radius_meters", 25_000) or 25_000),
            limit=quantity,
            timeout_seconds=budget,
            filters=filters,
            state=state,
            on_stage=on_stage,
            on_place=on_place,
            on_state=on_state,
            engine=GosomEngine.from_env(),
            max_tiles=MAX_TILES,
            should_stop=stopping.is_set,
        )
        flush()
        state = result.state

        if not result.exhausted and counters["saved"] < quantity:
            # Time budget reached mid-sweep: save and hand the job back to the
            # queue. This is a normal continuation, not a failure.
            api.save_state(job, state)
            api.resume(
                job,
                f"{counters['saved']}/{quantity} collected — continuing across more of {job['location']}…",
            )
            log("info", "job paused for continuation", job=job_id, collected=counters["saved"],
                targets_done=state.target_index, targets_total=state.stats.targets_total)
            return

        # ——— Deduplicating ———
        reporter.report("deduplicating", 70, f"Checked {counters['discovered']} businesses · {counters['duplicates']} duplicates", counts=counters, force=True)

        # ——— Enriching ———
        reporter.report("enriching", 76, "Normalising business records…", counts=counters, force=True)
        try:
            api.enrich(job)
        except ApiError as err:
            log("warning", "enrichment step failed", job=job_id, error=str(err))
            counters["errors"] += 1

        # ——— Final contact stage ———
        # Emails are already here: they arrive from the google-maps-scraper
        # engine with each lead batch (validated + MX-checked in scraper.py),
        # so this stage never crawls a website looking for addresses. It only
        # enriches the public social profiles the business links to, and it
        # keeps the existing "finding_emails" stage name so every counter and
        # the UI stepper stay exactly as they are.
        reporter.report("finding_emails", 78, "Confirming published contact details…", counts=counters, force=True)
        enrich_deadline = time.monotonic() + ENRICH_BUDGET
        pending = api.pending_enrichment(job)
        total_pending = len(pending)
        found = 0

        if total_pending:
            max_workers = min(8, max(2, total_pending)) if total_pending > 4 else total_pending
            socials_by_id: dict[str, Any] = {}

            def _safe_socials(website: str):
                if not website:
                    return []
                try:
                    return find_social_profiles(website)
                except Exception as err:  # noqa: BLE001
                    log("warning", "social profile lookup failed", job=job_id, error=str(err))
                    return []

            # Fetch in parallel (IO-bound HTTP), then push serially: the
            # worker's requests.Session is not thread-safe.
            with ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="enrich") as pool:
                future_to_id = {
                    pool.submit(_safe_socials, lead.get("website") or ""): lead["id"]
                    for lead in pending
                }
                for future in as_completed(future_to_id):
                    if stopping.is_set():
                        for fut in future_to_id:
                            fut.cancel()
                        raise JobTimeout("Worker received a shutdown signal; the job will resume")
                    if time.monotonic() > enrich_deadline:
                        for fut in future_to_id:
                            fut.cancel()
                        state.note("Social profile enrichment reached its time budget; remaining leads stay unenriched.")
                        try:
                            api.save_state(job, state)
                        except Exception:
                            pass
                        break
                    lead_id = future_to_id[future]
                    try:
                        socials_by_id[lead_id] = future.result()
                    except Exception as err:  # noqa: BLE001
                        log("warning", "social profile lookup failed", job=job_id, lead=lead_id, error=str(err))
                        counters["errors"] += 1
                        socials_by_id[lead_id] = []

            for index, lead in enumerate(pending):
                if stopping.is_set():
                    raise JobTimeout("Worker received a shutdown signal; the job will resume")
                if time.monotonic() > enrich_deadline and lead["id"] not in socials_by_id:
                    break

                socials = list(socials_by_id.get(lead["id"]) or [])
                if socials:
                    found += 1
                try:
                    api.enrichment(job, lead["id"], social_profiles=socials)
                except ApiError as err:
                    log("warning", "enrichment update rejected", job=job_id, lead=lead["id"], error=str(err))
                    counters["errors"] += 1

                reporter.report(
                    "finding_emails",
                    78 + min(20, int(((index + 1) / max(1, total_pending)) * 20)),
                    f"Confirmed {counters['email_found']} published emails · {found} social profiles",
                    counts=counters,
                )

        # Final, un-rate-limited update so the last counters are always exact.
        reporter.report(
            "finding_emails",
            98,
            f"Enriched {total_pending} businesses · {counters['email_found']} published email addresses",
            counts=counters,
            force=True,
        )
        result_payload = api.complete(job)
        log(
            "info",
            "job completed",
            job=job_id,
            collected=result_payload.get("collected"),
            refunded=result_payload.get("refunded"),
            counts=result_payload.get("counts"),
        )
    except ApiError as err:
        # 409 means the lease expired and another worker owns the job; do not
        # overwrite its state. Network/5xx failures are retryable.
        if err.status == 409:
            log("warning", "job lease lost", job=job_id, error=str(err))
            return
        log("error", "worker API error", job=job_id, status=err.status, error=str(err))
        try:
            api.fail(job, str(err), err.status >= 500)
        except Exception:  # noqa: BLE001
            pass
    except JobTimeout as err:
        try:
            api.save_state(job, state)
            api.resume(job, f"{counters['saved']}/{quantity} collected — continuing the search…")
            log("warning", "job time budget reached; resuming", job=job_id, error=str(err))
        except Exception:  # noqa: BLE001
            try:
                api.fail(job, str(err), True)
            except Exception:  # noqa: BLE001
                pass
    except EngineUnavailable as err:
        # The pinned engine binary is missing or not executable: that is a
        # broken deployment, not a bad search. Fail loudly, do not retry.
        log("error", "scraping engine unavailable", job=job_id, error=str(err))
        try:
            api.fail(job, str(err), False)
        except Exception:  # noqa: BLE001
            pass
    except (ChallengeError, EngineError) as err:
        # Google served a challenge, or the engine/browser died mid-sweep:
        # retry with a clean session from the saved cursor instead of failing.
        log("warning", "google maps challenge or engine failure", job=job_id, error=str(err),
            kind=err.__class__.__name__)
        try:
            api.save_state(job, state)
            api.resume(job, "Retrying with a fresh browser session…")
        except Exception:  # noqa: BLE001
            pass
    except Exception as err:  # noqa: BLE001 - a worker must never die on one job
        # Any engine failure is transient (browser, network, upstream) →
        # retryable. Everything else is a code bug → not retryable.
        retryable = isinstance(err, EngineError)
        log("error", "job failed", job=job_id, retryable=retryable, error=str(err))
        traceback.print_exc()
        try:
            api.fail(job, str(err), retryable)
        except Exception as api_err:  # noqa: BLE001
            log("error", "could not report failure", job=job_id, error=str(api_err))
    finally:
        api.session.close()


def handle_signal(_signum, _frame) -> None:
    log("info", "shutdown requested")
    stopping.set()


def engine_label(summary: dict) -> str:
    """One-line engine identity, published in every heartbeat.

    ``/api/ready`` surfaces it, so an operator can see which pinned engine build
    a running worker actually uses without opening Railway logs.
    """
    if not summary.get("available"):
        return "google-maps-scraper (unavailable)"
    version = str(summary.get("engine_version") or "").strip()
    commit = str(summary.get("engine_commit") or "").strip()[:7]
    if version and commit:
        return f"google-maps-scraper {version}+{commit}"
    return f"google-maps-scraper {version}".strip()


def main() -> None:
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)
    api = WorkerApi.create()
    summary = engine_summary()
    log("info", "worker online", concurrency=CONCURRENCY, app=APP_URL, max_tiles=MAX_TILES,
        job_timeout=JOB_TIMEOUT, max_attempts=MAX_ATTEMPTS, targets_per_run=TARGETS_PER_RUN,
        engine=summary)
    if not summary.get("available"):
        # A missing engine binary is a broken deployment. Log it loudly at boot;
        # every job will fail fast with the same actionable message.
        log("error", "scraping engine unavailable", error=summary.get("error"))

    with ThreadPoolExecutor(max_workers=CONCURRENCY, thread_name_prefix="scrape") as pool:
        active: set[Future] = set()
        last_heartbeat = 0.0
        while not stopping.is_set():
            active = {future for future in active if not future.done()}
            if time.time() - last_heartbeat >= 20:
                try:
                    api.heartbeat("healthy", active_jobs=len(active), capacity=CONCURRENCY,
                                  engine=engine_label(summary))
                except Exception as err:  # noqa: BLE001
                    log("warning", "heartbeat failed", error=str(err))
                last_heartbeat = time.time()

            while len(active) < CONCURRENCY and not stopping.is_set():
                try:
                    job = api.claim()
                except Exception as err:  # noqa: BLE001
                    log("error", "claim failed", error=str(err))
                    break
                if not job:
                    break
                active.add(pool.submit(process_job, job))

            stopping.wait(POLL_SECONDS)

        log("info", "waiting for active engine runs", active_jobs=len(active))

    api.session.close()
    log("info", "worker stopped")


if __name__ == "__main__":
    main()
