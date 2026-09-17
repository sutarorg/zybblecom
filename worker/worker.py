"""Zybble Selenium provider — production queue consumer.

Multiple job threads are safe: the app API atomically claims provider='worker'
rows with a unique, expiring lease. The worker holds no Supabase credentials;
all storage goes through authenticated /api/worker endpoints.
"""

from __future__ import annotations

import json
import os
import signal
import socket
import threading
import time
import traceback
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import dataclass
from typing import Optional

import requests
from selenium.common.exceptions import WebDriverException

from email_finder import find_email
from scraper import JobTimeout, Place, SelectorChangedError, run_scrape

APP_URL = os.environ["ZYBBLE_APP_URL"].rstrip("/")
WORKER_SECRET = os.environ["SCRAPER_WORKER_SECRET"]
CONCURRENCY = max(1, min(4, int(os.environ.get("SCRAPER_CONCURRENCY", "2"))))
POLL_SECONDS = max(2.0, float(os.environ.get("SCRAPER_POLL_SECONDS", "5")))
JOB_TIMEOUT = max(300, int(os.environ.get("SCRAPER_JOB_TIMEOUT_SECONDS", "1200")))
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
        progress: int,
        collected: Optional[int] = None,
        message: Optional[str] = None,
    ) -> None:
        body = {"status": status, "progress": max(1, min(99, int(progress)))}
        if collected is not None:
            body["collected"] = collected
        if message:
            body["message"] = message[:280]
        self.call("POST", f"/worker/jobs/{job['id']}/progress", body, job["lease_token"])

    def leads(self, job: dict, places: list[Place]) -> dict:
        return self.call(
            "POST",
            f"/worker/jobs/{job['id']}/leads",
            {"leads": [place.json() for place in places]},
            job["lease_token"],
            timeout=45,
        )

    def email(self, job: dict, lead_id: str, found) -> None:
        self.call(
            "POST",
            f"/worker/jobs/{job['id']}/leads/{lead_id}/email",
            {
                "email": found.email if found else None,
                "email_status": found.status if found else "unknown",
                "email_source_url": found.source_url if found else None,
            },
            job["lease_token"],
        )

    def pending_emails(self, job: dict) -> list[dict]:
        payload = self.call(
            "GET",
            f"/worker/jobs/{job['id']}/pending-emails",
            lease=job["lease_token"],
        )
        return payload.get("leads", [])

    def complete(self, job: dict) -> dict:
        return self.call("POST", f"/worker/jobs/{job['id']}/complete", {}, job["lease_token"])

    def fail(self, job: dict, error: str, retryable: bool) -> dict:
        return self.call(
            "POST",
            f"/worker/jobs/{job['id']}/fail",
            {"error": error[:280], "retryable": retryable},
            job["lease_token"],
        )


def process_job(job: dict) -> None:
    api = WorkerApi.create()
    job_id = job["id"]
    pending_batch: list[Place] = []
    collected = int(job.get("collected", 0))
    log("info", "job started", job=job_id, query=job["query"], location=job["location"])

    def flush() -> None:
        nonlocal pending_batch, collected
        if not pending_batch:
            return
        result = api.leads(job, pending_batch)
        collected = int(result.get("collected", collected))
        pending_batch = []

    def link_progress(value: int) -> None:
        api.progress(job, "searching", value, collected)

    def place_found(place: Place, position: int, total: int) -> None:
        nonlocal pending_batch
        pending_batch.append(place)
        if len(pending_batch) >= 5 or position == total:
            flush()
        api.progress(
            job,
            "collecting",
            30 + int((position / max(1, total)) * 30),
            collected,
        )

    try:
        api.progress(job, "searching", 3, collected)
        run_scrape(
            query=job["query"],
            location=job["location"],
            radius_meters=int(job["radius_meters"]),
            limit=max(1, int(job["quantity"]) - collected),
            timeout_seconds=JOB_TIMEOUT,
            on_links_progress=link_progress,
            on_place=place_found,
        )
        flush()

        api.progress(job, "enriching", 65, collected)
        api.progress(job, "finding_emails", 70, collected)

        # Ask the server for every still-unenriched lead in this job. This
        # includes crash-safe batches stored by a previous browser session.
        pending = api.pending_emails(job)
        total = len(pending)
        for index, lead in enumerate(pending):
            if stopping.is_set():
                raise JobTimeout("Worker received shutdown signal; job will retry")
            found = None
            if lead.get("website"):
                try:
                    found = find_email(lead["website"])
                except Exception as err:
                    log("warning", "email discovery failed", job=job_id, lead=lead["id"], error=str(err))
            api.email(job, lead["id"], found)
            api.progress(
                job,
                "finding_emails",
                min(99, 70 + int(((index + 1) / max(1, total)) * 29)),
                collected,
            )

        result = api.complete(job)
        log(
            "info",
            "job completed",
            job=job_id,
            collected=result.get("collected"),
            refunded=result.get("refunded"),
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
        except Exception:
            pass
    except Exception as err:
        retryable = isinstance(err, (JobTimeout, SelectorChangedError, WebDriverException, RuntimeError))
        log("error", "job failed", job=job_id, retryable=retryable, error=str(err))
        traceback.print_exc()
        try:
            api.fail(job, str(err), retryable)
        except Exception as api_err:
            log("error", "could not report failure", job=job_id, error=str(api_err))
    finally:
        api.session.close()


def handle_signal(_signum, _frame) -> None:
    log("info", "shutdown requested")
    stopping.set()


def main() -> None:
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)
    api = WorkerApi.create()
    log("info", "worker online", concurrency=CONCURRENCY, app=APP_URL)

    with ThreadPoolExecutor(max_workers=CONCURRENCY, thread_name_prefix="scrape") as pool:
        active: set[Future] = set()
        last_heartbeat = 0.0
        while not stopping.is_set():
            active = {future for future in active if not future.done()}
            if time.time() - last_heartbeat >= 20:
                try:
                    api.heartbeat("healthy", active_jobs=len(active), capacity=CONCURRENCY)
                except Exception as err:
                    log("warning", "heartbeat failed", error=str(err))
                last_heartbeat = time.time()

            while len(active) < CONCURRENCY and not stopping.is_set():
                try:
                    job = api.claim()
                except Exception as err:
                    log("error", "claim failed", error=str(err))
                    break
                if not job:
                    break
                active.add(pool.submit(process_job, job))

            stopping.wait(POLL_SECONDS)

        log("info", "waiting for active browsers", active_jobs=len(active))
        # Executor waits; each job notices stopping during email work, while
        # Selenium itself remains bounded by its page/job timeout.

    api.session.close()
    log("info", "worker stopped")


if __name__ == "__main__":
    main()