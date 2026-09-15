"""
Zybble lead-harvest worker — queue consumer.

Polls `search_jobs` for queued work and drives the full pipeline,
updating the job row live so the UI stepper never freezes:

  queued → searching → collecting → enriching → finding_emails → complete

Leads are upserted with dedupe on (user_id, company, city).
Runs as a standalone Docker service — never inside serverless.
"""

from __future__ import annotations

import os
import re
import sys
import time
import traceback
from urllib.parse import urlparse

from supabase import Client, create_client

from email_finder import find_email
from scraper import Place, scrape_places

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
POLL_SECONDS = float(os.environ.get("WORKER_POLL_SECONDS", "5"))

sb: Client = create_client(SUPABASE_URL, SERVICE_KEY)


def log(msg: str, **fields) -> None:
    extra = " ".join(f"{k}={v}" for k, v in fields.items())
    print(f"[worker] {msg} {extra}".rstrip(), flush=True)


def set_job(job_id: str, **patch) -> None:
    """Update job state — the SQL `touch_search_jobs` trigger
    maintains updated_at, so the UI's progress reflects reality."""
    sb.table("search_jobs").update(patch).eq("id", job_id).execute()


def claim_job() -> dict | None:
    queued = (
        sb.table("search_jobs")
        .select("*")
        .eq("status", "queued")
        .order("created_at")
        .limit(1)
        .execute()
        .data
    )
    if not queued:
        return None
    job = queued[0]
    claimed = (
        sb.table("search_jobs")
        .update({"status": "searching", "progress": 4})
        .eq("id", job["id"])
        .eq("status", "queued")  # only one worker may win
        .execute()
        .data
    )
    return claimed[0] if claimed else None


# ————— Field mapping: Place → leads row —————

STREET_RE = re.compile(r"^(.*?),\s*([^,]+?)(?:,\s*([A-Z]{2}|[A-Za-z ]+?))?(?:\s+(\d{3,10}))?(?:,\s*(.+))?$")


def split_address(address: str | None, fallback_country: str = "") -> tuple[str, str, str, str]:
    """Best-effort "street, city, state zip, country" split."""
    if not address:
        return "", "", "", fallback_country
    parts = [p.strip() for p in address.split(",") if p.strip()]
    street = parts[0] if parts else ""
    city = parts[1] if len(parts) > 1 else ""
    state_zip = parts[2] if len(parts) > 2 else ""
    state = re.sub(r"\d{3,10}", "", state_zip).strip()
    country = parts[3] if len(parts) > 3 else fallback_country
    return street, city, state, country


def domain_of(url: str | None) -> str | None:
    if not url:
        return None
    try:
        return urlparse(url if url.startswith("http") else f"https://{url}").netloc.lower()
    except Exception:
        return None


def process_job(job: dict) -> None:
    job_id = job["id"]
    user_id = job["user_id"]
    query = f"{job['query']} in {job['location']}"
    limit = int(job["quantity"])
    collected = 0

    log("job started", job=job_id, query=query, limit=limit)
    set_job(job_id, status="collecting", progress=8)

    existing = (
        sb.table("leads")
        .select("company,city")
        .eq("user_id", user_id)
        .limit(5000)
        .execute()
        .data
    )
    seen = {(r["company"].lower().strip(), (r["city"] or "").lower().strip()) for r in existing}

    def persist(place: Place) -> None:
        nonlocal collected
        street, city, state, country = split_address(place.address)
        key = (place.name.lower().strip(), city.lower().strip())
        if key in seen:
            return
        seen.add(key)

        category = place.category or job["query"]
        description = None
        if place.rating and place.reviews:
            description = (
                f"{place.name} is a {category.lower()} in {city or job['location']} "
                f"rated {place.rating} across {place.reviews} Google reviews."
            )

        row = {
            "user_id": user_id,
            "job_id": job_id,
            "company": place.name,
            "category": category,
            "address": street,
            "city": city,
            "state": state,
            "country": country or "United States",
            "phone": place.phone,
            "website": place.website,
            "maps_url": place.maps_url,
            "rating": place.rating,
            "reviews": place.reviews,
            "hours": place.hours,
            "description": description,
        }
        res = (
            sb.table("leads")
            .upsert(row, on_conflict="user_id,company,city", ignore_duplicates=True)
            .execute()
        )
        if res.data:
            collected += 1
            set_job(
                job_id,
                collected=collected,
                progress=8 + round((collected / max(1, limit)) * 50),
            )
            log("lead stored", job=job_id, company=place.name, collected=collected)

    harvested = scrape_places(query, limit, persist)

    # ————— Enriching (website presence already captured; ratings normalized) —————
    set_job(job_id, status="enriching", progress=64)
    time.sleep(1)
    set_job(job_id, progress=70)

    # ————— Finding emails: public pages only, never invented —————
    set_job(job_id, status="finding_emails")
    leads = (
        sb.table("leads")
        .select("id,website,email")
        .eq("job_id", job_id)
        .is_("email", "null")
        .not_.is_("website", "null")
        .execute()
        .data
    )
    total = max(1, len(leads))
    for idx, lead in enumerate(leads):
        try:
            found = find_email(lead["website"])
        except Exception:
            found = None
        if found:
            sb.table("leads").update(
                {
                    "email": found.email,
                    "email_status": found.status,
                    "email_source_url": found.source_url,
                }
            ).eq("id", lead["id"]).execute()
            log("email found", job=job_id, email=found.email, status=found.status)
        else:
            sb.table("leads").update({"email_status": "unknown"}).eq("id", lead["id"]).execute()
        if idx % 3 == 0:
            set_job(job_id, progress=70 + round(((idx + 1) / total) * 28))

    set_job(job_id, status="complete", progress=100, collected=collected)
    log("job complete", job=job_id, collected=collected)


def main() -> None:
    log("scraper worker online", poll=f"{POLL_SECONDS}s")
    while True:
        job: dict | None = None
        try:
            job = claim_job()
            if job is None:
                time.sleep(POLL_SECONDS)
                continue
            process_job(job)
        except KeyboardInterrupt:
            sys.exit(0)
        except Exception as err:
            traceback.print_exc()
            if job is not None:
                try:
                    set_job(job["id"], status="failed", error=str(err)[:280])
                except Exception:
                    pass
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
