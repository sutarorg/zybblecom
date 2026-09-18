# Zybble

**Find the businesses that need you.**
AI-powered lead generation and outreach — find, enrich, research, score, write, send.

Zybble has one frontend/API application on Vercel and one **Railway worker**
that powers Lead Finder with the open-source
[gosom/google-maps-scraper](https://github.com/gosom/google-maps-scraper)
engine (MIT) — real Google Maps data from a headless Go/Playwright binary,
**no Google Maps API key**. The frontend, auth, AI, billing, SMTP delivery and
campaign job engine stay inside the Vercel app.

| Layer | Implementation |
| --- | --- |
| Frontend | React 19 · Vite · Tailwind v4 (landing + app in one bundle) |
| API | Vercel Serverless Function (`api/router.ts`), Node runtime, Zod-validated |
| Lead discovery | Python worker on **Railway** running the pinned `google-maps-scraper` Go engine, broad area coverage, no API key |
| Background jobs | Database-leased queue; Vercel Cron + in-app ticks for email, Railway worker for scraping |
| Database & Auth | Supabase (PostgreSQL + RLS + Auth) |
| AI | OpenAI `o4-mini` (server-side only) |
| Email finder | Source-backed public website scan + DNS MX verification (SSRF-guarded) |
| Email sending | User's own SMTP via nodemailer, AES-256-GCM encrypted credentials |
| Payments | Razorpay USD subscriptions + signed, idempotent webhooks |

```
zybble/
├─ src/                 → frontend (Vite build → dist/)
├─ api/
│  ├─ router.ts         → the entire backend, one function
│  └─ _lib/             → core, jobs, worker control plane, email-finder, smtp, openai, razorpay
├─ worker/
│  ├─ scraper.py         → discovery orchestration (coverage planning, dedupe, filters, progress)
│  ├─ gmaps_engine.py    → adapter that runs the google-maps-scraper binary as a child process
│  ├─ vendor/            → the engine pin (engine.json), upstream notes and its MIT licence
│  ├─ smoke_test.py      → local end-to-end test (live engine, or --simulate offline)
│  └─ tests/             → offline tests against a google-maps-scraper CLI simulator
├─ supabase/migrations/ → run once in the Supabase SQL editor
├─ railway.json         → Railway build config for the scraper worker
└─ vercel.json          → Vercel function config + cron schedule + rewrites
```

---

## How Lead Finder works

1. **Plan the area.** The requested location is geocoded with OpenStreetMap
   (Nominatim — no Google Geocoding API) and tiled into viewports sized to the
   requested radius (`worker/coverage.py`). "50 gyms in Delhi" becomes a sweep
   of the whole city, not one neighbourhood.
2. **Discover.** `worker/scraper.py` hands each batch of viewports to the
   `google-maps-scraper` engine (`worker/gmaps_engine.py`), which scrolls real
   Google Maps in headless Chromium and streams businesses back as JSONL while
   it works. The sweep collects until the requested number of *unique,
   filtered* results is reached or the coverage plan is exhausted, and asks the
   engine to stop early once the quota is met. Hitting the time budget is not a
   failure: the coverage cursor is saved and the job resumes on its next slice.
3. **Deduplicate.** Every business is keyed by Google place id → canonical Maps
   URL → normalised name + address, within the job and across slices.
4. **Filter.** The professional filters (rating, reviews, location, website,
   phone, email status, socials, open/closed, keywords, previously collected)
   are applied while scraping and re-applied server-side as a safety net.
5. **Enrich and find emails.** Published addresses are discovered from each
   business's own website and verified against DNS MX records. An address that
   is missing or malformed is stored as `unknown` — it never fails a job and is
   never invented.
6. **Report.** The job reports requested → discovered → unique → enriched →
   saved, plus duplicates, filtered, emails found, warnings and search-coverage
   progress, live in the UI.

| Component | Role |
| --- | --- |
| Vercel (frontend + API) | creates jobs, stores batches, enforces filters, tracks counters, orchestrates |
| Railway worker | owns the engine and the browser; batches viewports, dedupes, enriches |
| Supabase | auth, jobs (with a resumable coverage cursor), leads, quotas |

---

# Table of contents

1. [Prerequisites](#0--prerequisites)
2. [Step 1 — Push to GitHub](#step-1--push-to-github)
3. [Step 2 — Supabase](#step-2--supabase)
4. [Step 3 — OpenAI](#step-3--openai)
5. [Step 4 — Lead Finder scraper (test locally, deploy to Railway)](#step-4--lead-finder-scraper)
6. [Step 5 — Razorpay](#step-5--razorpay)
7. [Step 6 — Generate local secrets](#step-6--generate-local-secrets)
8. [Step 7 — Deploy to Vercel](#step-7--deploy-to-vercel)
9. [Step 8 — Connect everything](#step-8--connect-everything)
10. [Step 9 — Verify](#step-9--verify)
11. [Local development](#local-development)
12. [How background jobs work](#how-background-jobs-work)
13. [Environment variables](#environment-variables)
14. [Troubleshooting](#troubleshooting)
15. [Known limitations](#known-limitations)

---

# 0 · Prerequisites

| Service | URL | Used for |
| --- | --- | --- |
| GitHub | https://github.com | code hosting, auto-deploys |
| Vercel | https://vercel.com | **the only host** (sign up with GitHub) |
| Supabase | https://supabase.com | database + auth |
| OpenAI | https://platform.openai.com | AI research / scoring / writer |
| Docker runtime (worker mode only) | any container runtime you control | local Lead Finder smoke test (optional — Railway builds the image itself) |
| Razorpay | https://dashboard.razorpay.com | subscriptions |

You also need Git and a terminal for two `openssl` commands.

---

# Step 1 · Push to GitHub

1. Go to **https://github.com/new** → name it `zybble` → keep it **Private** →
   do **not** add a README → **Create repository**.
2. In a terminal inside this project folder:

```bash
git init
git add .
git commit -m "Zybble — single-application SaaS"
git branch -M main
git remote add origin https://github.com/<your-username>/zybble.git
git push -u origin main
```

`.gitignore` keeps `node_modules`, builds and every `.env` out of the repo.

---

# Step 2 · Supabase

### 2.1 Create the project
1. **https://supabase.com** → **New project** → name `zybble`, generate a database
   password, pick the region closest to your users → **Create new project** (~2 min).

### 2.2 Run the migrations — **all nine, in order**
1. Left sidebar → **SQL Editor** → **+ New query**.
2. Paste the entire contents of each file and click **Run**, one at a time:
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_backend.sql`
   - `supabase/migrations/003_production_hardening.sql`
   - `supabase/migrations/004_single_app.sql` ← required for the single-app job engine
   - `supabase/migrations/005_pluggable_lead_provider.sql` ← provider-scoped leases + secure worker claims
   - `supabase/migrations/006_worker_retry_bounds.sql` ← bounded retries for lease-reclaimed jobs
   - `supabase/migrations/007_search_job_signature_fix.sql` ← converges the 6-arg `create_search_job` signature + reloads the PostgREST schema cache
   - `supabase/migrations/008_lead_finder_scraper_engine.sql` ← Lead Finder counters, filters, lead identity + the 8-arg `create_search_job`
   - `supabase/migrations/009_requeue_stalled_search_jobs.sql` ← hands a search back to the queue if its worker is killed mid-sweep

**Already have a database?** If Lead Finder ever returned `Request failed (500)`,
run `008_lead_finder_scraper_engine.sql` alone — it is fully idempotent and
converges any prior state (missing columns, stale 4-/5-argument overloads,
stale PostgREST schema cache) to the exact schema the application expects.

### 2.3 Copy the keys
Left sidebar → **gear icon** → **API**:
- **Project URL** → `SUPABASE_URL` **and** `VITE_SUPABASE_URL`
- **anon public** → `VITE_SUPABASE_ANON_KEY`
- **service_role** (click Reveal) → `SUPABASE_SERVICE_ROLE_KEY`
  ⚠️ Server-only. It bypasses RLS; never put it in a `VITE_*` variable.

### 2.4 Auth URLs (finish in Step 8)
**Authentication → URL Configuration** → you will set **Site URL** and add a
**Redirect URL** once Vercel gives you a domain.

---

# Step 3 · OpenAI

1. **https://platform.openai.com/api-keys** → **+ Create new secret key**.
2. Name it `zybble`, create, and **copy immediately** → `OPENAI_API_KEY`.
3. `OPENAI_MODEL` is the literal text `o4-mini`. The API refuses to boot with
   any other value.

---

# Step 4 · Lead Finder scraper

Lead Finder runs on
[gosom/google-maps-scraper](https://github.com/gosom/google-maps-scraper)
(MIT — see `worker/THIRD_PARTY_LICENSES.md`), a Go engine that drives a real
headless Chromium through Google Maps with Playwright. `worker/Dockerfile`
builds the **pinned** tag and commit from source (the pin lives in
`worker/vendor/engine.json`, verified in CI by `npm run verify:engine`), and
`worker/gmaps_engine.py` runs it as a bounded child process that streams
businesses back as JSONL. From there the worker dedupes, filters, verifies
publicly listed emails and streams everything into your Supabase leads
database. **No Google Maps API key is used or required.**

Generate the shared secret now — Vercel and the worker must hold the same value:

```bash
openssl rand -hex 32   # → SCRAPER_WORKER_SECRET
```

## 4.1 Test the scraper locally before deploying

**A. Offline simulation (no Go, no Docker, no Google — run this first).** The
worker ships a CLI double that speaks the upstream engine's exact flag and
JSONL contract, so the whole integration can be exercised on any machine with
Python 3.11+:

```bash
python3 -m venv .venv && .venv/bin/pip install -r worker/requirements.txt
.venv/bin/python worker/smoke_test.py --simulate "gym" "Delhi" 50
.venv/bin/python worker/run_tests.py          # the full offline suite
```

Expected output: an engine banner (binary, version, pin, concurrency), one line
per business, every counter the UI reports, a lead-contract check against the
API's column limits and `SIMULATION PASSED`. This proves the subprocess
plumbing, streaming reader, dedupe, filters, progress reporting and resume
cursor — it cannot prove that Google still serves the markup the engine
expects, which is what step B is for.

**B. Real engine against live Google Maps (required before a deploy).** The
Docker image is the only supported way to get the engine and its Chromium: it
builds the pinned Go binary and installs Playwright's browser exactly as
Railway will.

```bash
docker build -f worker/Dockerfile -t zybble-scraper .
docker run --rm --shm-size=2g \
  -e ZYBBLE_APP_URL=http://localhost:3000 \
  -e SCRAPER_WORKER_SECRET=dummy \
  zybble-scraper python smoke_test.py "dentists" "Austin, Texas" 5
```

Expected output: the engine version banner, one line per real business (name,
city, rating, review count, website), then a JSON dump and `SMOKE TEST PASSED`.
This runs the exact production code path — the same `run_scrape()` the Railway
worker calls — against live Google Maps. The build itself ends with the same
smoke test in `--simulate` mode, so a broken engine or a missing browser
library fails the image build rather than the first customer search.

Prefer the engine on your own machine instead? Install Go 1.27+, then:

```bash
git clone --branch v1.18.0 https://github.com/gosom/google-maps-scraper
cd google-maps-scraper && go build -o /usr/local/bin/google-maps-scraper .
go install github.com/mxschmitt/playwright-go/cmd/playwright@v0.6100.0
playwright install chromium --with-deps
cd .. && python worker/smoke_test.py "dentists" "Austin, Texas" 5
```

(Use the exact version and commit from `worker/vendor/engine.json`; other
releases are untested.) Do not deploy to Railway until step B passes locally.

## 4.2 Deploy the worker to Railway

1. Go to **https://railway.com** → **Login with GitHub**.
2. **New Project** → **Deploy from GitHub repo** → select **`zybble`**
   (grant Railway access to the repository if asked).
3. Railway creates a service. Click it → **Settings** tab.
4. **Leave Root Directory empty** (repo root). The root `railway.json` takes
   over: it forces the **Dockerfile builder** on `worker/Dockerfile`, so
   Railway builds the worker image and never mistakes the repo for a Node/Vite
   project. If you ever see `react-vite-tailwind` or `vite build` in the build
   log, the Root Directory is wrong — clear it and redeploy. The build is
   multi-stage (compile the pinned Go engine → install Playwright Chromium →
   install the Python worker, then run the offline smoke test inside the
   image), so the **first build takes several minutes** and needs no
   build-time secrets.
5. Open the **Variables** tab → **+ New Variable** and add:

   | Variable | Value |
   | --- | --- |
   | `ZYBBLE_APP_URL` | `https://<project>.vercel.app` (your Vercel domain from Step 7) |
   | `SCRAPER_WORKER_SECRET` | the exact value you set in Vercel |
   | `SCRAPER_CONCURRENCY` | `2` (optional; job slices in parallel, 1–4) |
   | `SCRAPER_POLL_SECONDS` | `5` (optional) |
   | `SCRAPER_JOB_TIMEOUT_SECONDS` | `1200` (optional) |
   | `SCRAPER_TARGETS_PER_RUN` | `6` (optional; viewports per engine run — lower gives finer resume points, higher is faster) |
   | `SCRAPER_ENGINE_CONCURRENCY` | `2` (optional; searches the engine runs at once) |
   | `SCRAPER_ENGINE_BROWSER_POOL` | `1` (optional; Chromium contexts) |
   | `SCRAPER_ENGINE_PAGES_PER_BROWSER` | `2` (optional; tabs per context) |
   | `SCRAPER_ENGINE_EXTRACT_EMAIL` | `0` (optional; `1` also reads addresses off each business website — Zybble still verifies syntax and DNS MX) |

   Every engine knob and its default is listed in `.env.example`; the engine's
   own flags are documented in `worker/vendor/UPSTREAM.md`.
6. **Settings → Resources / Memory**: allocate at least **2 GB RAM** — each
   Chromium context with its tabs uses ~500–700 MB, so
   `SCRAPER_ENGINE_BROWSER_POOL × SCRAPER_ENGINE_PAGES_PER_BROWSER` (times
   `SCRAPER_CONCURRENCY`) must fit in it. The engine launches Chromium with
   `--no-sandbox` and `--disable-dev-shm-usage`, so `/dev/shm` size is not a
   constraint inside the container.
7. **No public domain is needed** — the worker only makes outbound HTTPS calls
   to your app's `/api/worker/*` endpoints.
8. Deploy. The log should show `worker online` and, every ~20s, a heartbeat.
   Verify from your app: `https://<project>.vercel.app/api/ready` →
   `lead_provider.ready: true`.

**How it stays safe and concurrent:** the worker never receives
`SUPABASE_SERVICE_ROLE_KEY`. It authenticates to `/api/worker/*` with the
shared secret (constant-time compared); every claimed job also gets a unique,
expiring lease token that authorizes all writes for that job. Multiple worker
replicas can run concurrently without claiming the same job — provider-scoped
`FOR UPDATE SKIP LOCKED` leasing in Postgres guarantees it. Every engine run is
a child process in its own process group: on a time budget, a shutdown signal
or a stop request the worker SIGTERMs the group (engine + all Chromium
processes), waits `SCRAPER_ENGINE_STOP_GRACE` seconds and SIGKILLs whatever is
left, so a wedged browser can never outlive its job slice. Upstream telemetry
is disabled (`DISABLE_TELEMETRY=1`) — nothing about your searches leaves the
container. Jobs that die mid-run are reclaimed after the lease expires, retried
up to `SCRAPER_MAX_ATTEMPTS` slices total, then failed with **unused quota
automatically refunded**.

---

# Step 5 · Razorpay

### 5.1 API keys
1. **https://dashboard.razorpay.com** → toggle **Test Mode** while developing.
2. **Settings → API Keys → Generate Test Key**.
3. Copy **Key Id** → `RAZORPAY_KEY_ID`, **Key Secret** (shown once) →
   `RAZORPAY_KEY_SECRET`.

Plans are created automatically on first checkout ($49 and $129/month USD) and
cached in `billing_plans` — nothing to configure manually.

### 5.2 Webhook
1. **Settings → Webhooks → + Add New Webhook**.
2. **URL:** `https://<your-vercel-domain>/api/webhooks/razorpay`
   (you get the domain in Step 7 — the URL is editable afterwards).
3. **Secret:** run `openssl rand -hex 16`, paste it into Razorpay **and** save
   the same value as `RAZORPAY_WEBHOOK_SECRET`.
4. **Active events** — tick exactly these six:
   `subscription.activated`, `subscription.charged`, `subscription.cancelled`,
   `subscription.completed`, `subscription.halted`, `payment.failed`.
5. **Create Webhook**.

---

# Step 6 · Generate local secrets

```bash
openssl rand -hex 32   # → SMTP_ENCRYPTION_KEY  (must be exactly 64 hex chars)
openssl rand -hex 32   # → CRON_SECRET
openssl rand -hex 32   # → SCRAPER_WORKER_SECRET (worker mode only)
```

---

# Step 7 · Deploy to Vercel

1. **https://vercel.com** → **Add New… → Project**.
2. **Import Git Repository** → `zybble` → **Import** (grant GitHub access if asked).
3. Vercel reads `vercel.json`: Framework **Vite**, build `npm run build`, output
   `dist`. Leave **Root Directory** as `./`.
4. Expand **Environment Variables** and add all of these:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Step 2.3 Project URL |
| `VITE_SUPABASE_ANON_KEY` | Step 2.3 anon key |
| `SUPABASE_URL` | Step 2.3 Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Step 2.3 service_role key |
| `OPENAI_API_KEY` | Step 3 |
| `OPENAI_MODEL` | `o4-mini` |
| `SCRAPER_WORKER_SECRET` | Step 4 — must match the Railway worker's value |
| `RAZORPAY_KEY_ID` | Step 5.1 |
| `RAZORPAY_KEY_SECRET` | Step 5.1 |
| `RAZORPAY_WEBHOOK_SECRET` | Step 5.2 |
| `SMTP_ENCRYPTION_KEY` | Step 6 |
| `CRON_SECRET` | Step 6 |

5. Click **Deploy**. You get `https://<project>.vercel.app` — the frontend **and**
   the API (`/api/...`) **and** the cron job, all from this one deployment.

Every push to `main` redeploys everything together.

---

# Step 8 · Connect everything

1. **Supabase → Authentication → URL Configuration**
   - **Site URL:** `https://<project>.vercel.app`
   - **Add Redirect URL:** `https://<project>.vercel.app/**` → **Save**.
2. **Razorpay → Settings → Webhooks** — set the URL to
   `https://<project>.vercel.app/api/webhooks/razorpay`.
3. **Custom domain (optional):** Vercel → **Settings → Domains → Add**. If you
   use one, also set `APP_URL=https://yourdomain.com` so unsubscribe links point
   at the right host, then redeploy.
4. **Verify cron is registered:** Vercel → your project → **Settings → Cron Jobs**.
   You should see `/api/cron/tick` on a daily-at-midnight schedule. The Hobby
   plan allows one cron run per day — background work is also drained
   continuously while anyone has the app open (and can be triggered manually,
   below), so nothing waits for the daily run unless nobody uses the app.

---

# Step 9 · Verify

Run these against your live URL:

```bash
curl https://<project>.vercel.app/api/health      # {"ok":true,...}
curl https://<project>.vercel.app/api/ready       # "lead_provider":{"ready":true,...} ✅
curl -X POST https://<project>.vercel.app/api/cron/tick   # 401 (secret required) ✅
```

`/api/ready` must show `"lead_provider": {"provider": "worker", "ready": true}`
before Lead Finder will accept searches — that confirms the Railway worker is
online and heart-beating.

Then in the browser:

1. **Sign up** → lands in the app on the Free plan.
2. **Find Leads** → `Dentists` / `Austin, Texas` / 25 km / 10 leads →
   the Railway worker claims the job and it moves
   `Queued → Searching → Collecting → Enriching → Finding emails → Complete`;
   real scraped businesses appear in **Leads** with email statuses.
3. **Billing → Growth** → Razorpay hosted checkout (Test card `4111 1111 1111 1111`,
   any future expiry/CVV) → plan flips to Growth after the webhook lands.
4. **Open a lead** → **Research with AI**, **Score lead**, **Write email**.
5. **Settings → SMTP senders → Connect** (Gmail needs an App Password) → **Test**.
6. **Campaigns → New campaign** → **Add leads** → **Launch** → the first email
   sends within a minute; the Activity feed streams live.
7. Open the email's **unsubscribe** link → the address joins the suppression list.

### Automated real-integration suite

`scripts/e2e-production.mjs` runs the whole journey against the live deployment
with real Supabase, Google, OpenAI, SMTP and Razorpay — creating a disposable
user and deleting it afterwards. It also asserts negative paths: anonymous
access is rejected, cron requires its secret, RLS blocks plan escalation, AI is
gated on Free, forged webhooks are refused, duplicate webhooks dedupe, invalid
SMTP is never stored, and an email job is never sent twice.

```bash
APP_URL=https://<project>.vercel.app \
CRON_SECRET=... SUPABASE_URL=... SUPABASE_ANON_KEY=... \
SUPABASE_SERVICE_ROLE_KEY=... RAZORPAY_WEBHOOK_SECRET=... \
E2E_RUN_SCRAPER=true npm run e2e
```

Or **GitHub → Actions → Production E2E → Run workflow** after adding the
`E2E_*` secrets listed in that workflow file.

---

# Local development

```bash
npm install
npm run typecheck     # frontend + API in one pass
npm run build         # client build + public-route prerender + SEO verification
npm test             # API tests + Lead Finder tests + scraper worker tests
```

`npm run verify:seo` checks the generated marketing documents, canonical URLs, titles, descriptions, robots controls, JSON-LD, sitemap and brand assets. `npm test` runs, in order:

| Script | What it checks |
| --- | --- |
| `test:api` | API behaviour, validation and auth |
| `test:leadfinder` | lead filters, email safety, dedupe keys, job counters |
| `verify:no-google` | no Google Maps API dependency anywhere in the lead path |
| `verify:engine` | the engine pin agrees with `worker/Dockerfile`, the adapter's flags, the licence and the docs |
| `test:worker` | the whole worker — coverage planning, the engine adapter (real subprocess + JSONL streaming), dedupe, filters, emails and the job pipeline — against an offline `google-maps-scraper` CLI double. No browser, no network |
| `verify:migrations` | every migration parses (`pip install pglast` to enable; skipped otherwise) |

To run the **full app** (frontend + serverless API + cron routes) locally you
need the Vercel CLI, because the API is made of Vercel Functions:

```bash
npm i -g vercel
vercel link           # once
vercel env pull .env  # pulls the variables you set in Step 7
npm run dev           # = vercel dev → http://localhost:3000
```

`npm run dev:web` starts Vite alone (UI only, no API) if you are just doing
visual work.

**Scraping locally** — verify the integration offline first, then against live
Google Maps (see [Step 4.1](#41-test-the-scraper-locally-before-deploying)):

```bash
python3 -m venv .venv && .venv/bin/pip install -r worker/requirements.txt
.venv/bin/python worker/smoke_test.py --simulate "gym" "Delhi" 50   # no browser, no network
python worker/smoke_test.py "dentists" "Austin, Texas" 5            # needs the engine binary
```

Then run the full worker against your local app (second terminal, Docker
required; `host.docker.internal` reaches `vercel dev` on the host):

```bash
docker build -f worker/Dockerfile -t zybble-scraper .
docker run --rm --shm-size=2g \
  -e ZYBBLE_APP_URL=http://host.docker.internal:3000 \
  -e SCRAPER_WORKER_SECRET="$SCRAPER_WORKER_SECRET" \
  -e SCRAPER_CONCURRENCY=1 \
  zybble-scraper
```

Trigger background email processing locally:

```bash
curl -X POST localhost:3000/api/cron/tick -H "x-cron-secret: $CRON_SECRET"
```

---

# How background jobs work

Work is stored in Supabase. Email jobs run in bounded serverless slices. Lead
discovery does not: the Python worker claims only `provider='scraper'` jobs
through the app's secure control plane and runs the scraping engine itself.

**Lifecycle**

```
search_jobs:  queued → searching → collecting → enriching → finding_emails → complete
                    ↘ (3 failed attempts, quota refunded) ────────────────→ failed
email_jobs:   scheduled → processing → sent
                        ↘ retry ×3 (5 min apart) → failed
```

**Two triggers, same code path**

| Trigger | When | Purpose |
| --- | --- | --- |
| Vercel Cron → `/api/cron/tick` | daily (midnight, Hobby limit) | scheduled follow-ups, stale recovery, rollovers |
| App → `/api/jobs/tick` | while a signed-in user has pending work | instant start, no waiting for cron |
| Scraper worker → `/api/worker/claim` | continuously, worker mode | real no-key Google Maps extraction |

**Safety properties**

- **Duplicate-job protection** — `claim_search_job` and `claim_due_email_jobs`
  use provider-scoped `FOR UPDATE SKIP LOCKED` leases, so one processor owns a job.
- **Worker isolation** — the worker has no Supabase key. A shared secret
  authenticates the service; a per-job UUID lease token authorizes every write.
- **Idempotent sends** — a unique index on `(campaign_lead_id, step_id)` means a
  step can only ever be queued once, and each send carries a stable `Message-ID`.
- **Timeout protection** — every slice checks a time budget and stops early,
  persisting its cursor first.
- **Stale-job recovery** — leases expire after 2 minutes; an interrupted job is
  automatically reclaimed and resumed from its cursor.
- **Retries** — searches retry 3 times, then fail and **refund unused quota**;
  emails retry 3 times, 5 minutes apart.
- **Progress** — every chunk writes `status` + `progress` + `collected`, which
  the UI polls via `/api/bootstrap` and `/api/search/:id`.

---

# Environment variables

**Vercel** (application — Settings → Environment Variables):

| Variable | Scope | Source |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | browser | Step 2.3 |
| `VITE_SUPABASE_ANON_KEY` | browser | Step 2.3 |
| `SUPABASE_URL` | server | Step 2.3 |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Step 2.3 — never in Railway |
| `OPENAI_API_KEY` | server | Step 3 |
| `OPENAI_MODEL` | server | `o4-mini` |
| `SCRAPER_WORKER_SECRET` | server | Step 4 — must match Railway |
| `RAZORPAY_KEY_ID` | server | Step 5.1 |
| `RAZORPAY_KEY_SECRET` | server | Step 5.1 |
| `RAZORPAY_WEBHOOK_SECRET` | server | Step 5.2 |
| `SMTP_ENCRYPTION_KEY` | server | `openssl rand -hex 32` |
| `CRON_SECRET` | server | `openssl rand -hex 32` |
| `APP_URL` | server, optional | custom domain only |
| `CORS_ORIGINS` | server, optional | extra allowed browser origins |

**Railway** (scraper worker — Variables tab):

| Variable | Required | Value |
| --- | --- | --- |
| `ZYBBLE_APP_URL` | yes | your Vercel app URL |
| `SCRAPER_WORKER_SECRET` | yes | same value as Vercel |
| `SCRAPER_CONCURRENCY` | no | `2` — job slices in parallel (1–4) |
| `SCRAPER_POLL_SECONDS` | no | `5` |
| `SCRAPER_JOB_TIMEOUT_SECONDS` | no | `1200` — engine budget per slice; the job resumes afterwards |
| `SCRAPER_EMAIL_BUDGET_SECONDS` | no | `600` |
| `SCRAPER_MAX_TILES` | no | `36` — viewports swept to cover the whole location |
| `SCRAPER_MAX_ATTEMPTS` | no | `6` — bounded slices a broad search may use |
| `SCRAPER_BATCH_SIZE` | no | `5` — businesses stored per crash-safe batch |
| `SCRAPER_TARGETS_PER_RUN` | no | `6` — viewports handed to one engine run |
| `SCRAPER_ENGINE_CONCURRENCY` | no | `2` — `-c`, searches the engine runs at once |
| `SCRAPER_ENGINE_BROWSER_POOL` | no | `1` — Chromium contexts (~500–700 MB each with their tabs) |
| `SCRAPER_ENGINE_PAGES_PER_BROWSER` | no | `2` — tabs per Chromium context |
| `SCRAPER_ENGINE_DEPTH` | no | `10` — `-depth`, scroll depth per viewport (raised automatically when a slice needs more) |
| `SCRAPER_ENGINE_LANG` | no | `en` — Google interface language |
| `SCRAPER_ENGINE_INACTIVITY` | no | `3m` — abandon a wedged browser session after this idle time |
| `SCRAPER_ENGINE_EXTRACT_EMAIL` | no | `0` — `1` lets the engine read addresses off business websites (still verified here) |
| `SCRAPER_ENGINE_PROXIES_FILE` | no | empty — one proxy URL per line, if you route the engine through proxies |
| `GOOGLE_MAPS_SCRAPER_BIN` | no | empty — auto-detected on `PATH` and in `/usr/local/bin` |

`.env.example` documents every knob, including the low-level ones
(`SCRAPER_ENGINE_STOP_GRACE`, `SCRAPER_ENGINE_POLL_INTERVAL`,
`SCRAPER_ENGINE_WORKDIR`, `SCRAPER_ENGINE_EXTRA_ARGS`, …).

No Google Maps API key exists anywhere in this deployment — and none is
needed. Lead discovery is powered entirely by the Railway scraper worker,
which drives real Google Maps through the open-source
[gosom/google-maps-scraper](https://github.com/gosom/google-maps-scraper)
engine (MIT), built from the tag and commit pinned in
`worker/vendor/engine.json`. There is no Places API, no Geocoding API and no
`places` fallback: `npm run verify:no-google` fails the build if one ever
reappears, and `npm run verify:engine` fails it if the engine pin, the
Dockerfile and the adapter drift apart.

---

# Troubleshooting

| Symptom | Fix |
| --- | --- |
| Entirely white page | Hard-refresh first (Ctrl/Cmd+Shift+R). If it persists, the boot overlay will now show the underlying error; check `/api/ready` — it names every missing environment variable. |
| `/ready` says "not configured" | A required env var is unset in Vercel → Settings → Environment Variables (Lead Finder only needs `SCRAPER_WORKER_SECRET`; there is no Google Maps key). Redeploy after changes. |
| `/ready` reports a `create_search_job` RPC error, or Lead Finder returns 500 "does not match the application's N-argument call" | Run `supabase/migrations/008_lead_finder_scraper_engine.sql` (and `007_search_job_signature_fix.sql` if it was never applied) in the SQL Editor — they drop stale 4-/5-/6-argument overloads, converge the columns and reload the PostgREST schema cache. Then retry the search. |
| Lead Finder works but the counters stay at 0 | Migration 008 has not been applied; `search_jobs` is missing `discovered`/`unique_count`/… and `leads` is missing `dedupe_key`. Run it in the SQL Editor and retry. |
| `SUPABASE_URL` was pasted with `/rest/v1/` | The API now strips it defensively and rejects other path-bearing URLs with a clear 503 naming the variable. Use the bare Project URL: `https://xyz.supabase.co`. |
| `/api/*` returns the HTML page | The `/api/:path*` → `/api/router?path=:path*` rewrite must come **first** in `vercel.json`. Redeploy. |
| API 500 on every route (`FUNCTION_INVOCATION_FAILED`, no JSON body) | The function crashed while being imported, before any route ran. Check **Vercel → Deployments → Functions logs**. Most likely cause: the emitted `api/*.js` still contains `.ts` import specifiers (`Cannot find module '.../_lib/application.ts'`) — `tsconfig.json` must keep `"rewriteRelativeImportExtensions": true`; `npm run verify:api` reproduces this locally and runs as part of `npm run build`. |
| `/api/ready` shows `providerHealth.status: "offline"` or searches never start | The Railway worker is not running or not heart-beating. Check Railway → service → **Deployments/Logs** for `worker online` (it prints the engine binary, version and pin); verify `ZYBBLE_APP_URL` and `SCRAPER_WORKER_SECRET`. `/api/ready` shows the heartbeat age and the engine build the worker reported. |
| Railway build log shows `vite build` / `react-vite-tailwind` | Railway tried to build the Node/Vite app instead of the worker. Clear any **Root Directory** setting (leave it repo root) so the root `railway.json` Dockerfile builder applies. Redeploy. |
| Railway worker crashes or is OOM-killed | Raise the service memory to ≥ 2 GB (Settings → Resources), or lower `SCRAPER_CONCURRENCY`, `SCRAPER_ENGINE_BROWSER_POOL` and `SCRAPER_ENGINE_PAGES_PER_BROWSER`. Each Chromium context needs ~500–700 MB for its tabs. |
| Worker log says `scraping engine unavailable` | The engine binary is missing from the image or `GOOGLE_MAPS_SCRAPER_BIN` points nowhere. Redeploy so `worker/Dockerfile` rebuilds it, and check the build log for the `engine pin mismatch` / `google-maps-scraper -version` steps. The job fails fast and is **not** retried, because a missing binary cannot fix itself. |
| Worker log says `engine failed (exit code N)` | The engine or its browser died mid-sweep. The slice is retried from the saved cursor with a fresh browser session. If it repeats, lower `SCRAPER_ENGINE_CONCURRENCY` / `SCRAPER_ENGINE_PAGES_PER_BROWSER`, raise memory, or route through proxies with `SCRAPER_ENGINE_PROXIES_FILE`. The last ~16 KB of the engine's stderr is in the worker log. |
| Searches are slower than before | The engine scrolls each viewport only as deep as the slice needs (`-depth`), and stops the moment the quota is met. Raise `SCRAPER_TARGETS_PER_RUN` for fewer engine restarts, or `SCRAPER_ENGINE_CONCURRENCY` if CPU and RAM allow. |
| Worker gets 401 | `SCRAPER_WORKER_SECRET` differs between Vercel and Railway. Set the same 64-hex value in both, redeploy Vercel and restart the worker. |
| Worker gets 409 | Its job lease expired or was reclaimed — expected safe behavior; the worker drops the stale browser result and claims another job. After `SCRAPER_MAX_ATTEMPTS` (default 6) claims the job finishes with what it collected and quota is refunded. |
| A search returns far fewer leads than requested | The location is swept in bounded slices; check that the worker is heart-beating and look at `/api/ready`. Each slice continues from the saved coverage cursor — see the job's `coverage_done/coverage_total` counters in the UI. |
| Smoke test fails locally with a traffic challenge | Google presented a CAPTCHA for your IP. Wait, retry from a different network, or lower the limit. The worker reports this as a retryable failure (`ChallengeError`) and resumes from its cursor — it never bypasses challenges. |
| Engine exits immediately with `flag provided but not defined` | The pinned engine and the adapter disagree about a flag. Run `npm run verify:engine`: it compares every flag in `worker/vendor/engine.json` with the ones `worker/gmaps_engine.py` sends. |
| Engine works in Docker but not on your laptop | Playwright's Chromium and its system libraries are missing. Install them the way the image does (`playwright install chromium --with-deps`), or just use the Docker image — it is what Railway runs. |
| `python worker/run_tests.py` fails with `ModuleNotFoundError: requests` | Install the worker's two runtime dependencies first: `pip install -r worker/requirements.txt`. The offline suite needs no browser and no engine binary. |
| Search completes with 0 leads | No businesses matched. Widen the radius or use a broader location. Quota is refunded automatically. |
| Job stuck in `collecting` | Wait one cron cycle — the lease expires after 2 minutes and the job resumes from its cursor. Check `/api/internal/metrics` with the cron secret. |
| Emails scheduled but not sending | Confirm **Settings → Cron Jobs** shows `/api/cron/tick`, and that the campaign has a connected SMTP sender. Opening the app also drives a tick. |
| Cron never runs | Vercel Cron requires a **production** deployment; preview deployments do not schedule jobs. |
| Magic link errors | Supabase → Authentication → URL Configuration must list your Vercel domain with `/**`. |
| Payment succeeded, plan unchanged | Check Razorpay → Webhooks delivery log; `RAZORPAY_WEBHOOK_SECRET` must match exactly. |
| AI returns 403 | The account is on Free. AI is Growth+ — upgrade, then retry. |

---

# Known limitations

These are real constraints, stated plainly rather than hidden:

1. **Google Maps markup changes are an operational risk.** The engine is pinned
   to a released upstream tag, so a markup change is fixed by bumping the pin in
   `worker/vendor/engine.json` (and `ARG GMS_VERSION` / `ARG GMS_COMMIT` in
   `worker/Dockerfile`) to a newer upstream release, then re-running the smoke
   test — not by patching selectors in this repository. Between bumps, a markup
   change shows up as fewer results or `engine failed`, so monitor the worker
   logs and `/api/ready`.
2. **The scraper runs on Railway.** Chromium cannot run reliably in Vercel's
   serverless functions, so the worker is a separate Railway service — the only
   second deployment in this architecture, dedicated entirely to Lead Finder.
3. **Worker radius is viewport-based.** The worker geocodes the location with
   Nominatim and turns the requested radius into a grid of Google Maps
   viewports at a matching zoom. Maps may still return edge results; it is not
   a contractual geo-fence.
4. **Scraping Google Maps may conflict with Google's Terms of Service.** The
   upstream project carries the same warning. Use lawful public-business
   research practices, do not bypass CAPTCHAs/access controls, and obtain legal
   advice for your jurisdiction and scale.
5. **One viewport yields roughly 20 results per scroll depth.** Coverage
   therefore comes from sweeping many viewports across the location
   (`SCRAPER_MAX_TILES`), not from one deep scroll — which is also why a very
   small location honestly returns fewer leads than requested.
6. **Hobby cron runs once per day.** Vercel Hobby allows a single daily cron
   run (configured at `0 0 * * *`; sub-daily schedules require **Pro**). The
   in-app tick compensates by draining the queue every few seconds while anyone
   has the app open, so searches, deliveries and retries stay realtime during
   use — only fully unattended workloads (e.g., a follow-up due overnight while
   nobody is online) would wait for the daily run. You can also drain the queue
   manually at any time: `curl -X POST https://<domain>/api/cron/tick -H "x-cron-secret: <CRON_SECRET>"` (see Local development).
7. **Function timeout is 60s**, so email delivery and post-discovery
   enrichment are chunked; discovery itself never runs in a function.
8. **Email verification is DNS-level** (MX + published-address provenance). It
   does not perform SMTP recipient probing, which providers widely block and
   which harms sender reputation.
9. **No SMTP inbound parsing.** Bounces are detected from live SMTP 5xx
   responses at send time; open/click tracking is intentionally not implemented.

---

# Security

- The service-role key, OpenAI key, Razorpay secrets, optional Google key and
  `SMTP_ENCRYPTION_KEY` exist only in server-side function environment; only
  `VITE_*` variables reach the browser.
- RLS is enabled on every table and grants read-only access to a user's own
  rows; all mutations go through the API, which authorizes each request.
- SMTP passwords are AES-256-GCM encrypted before storage and are never
  selected by any endpoint.
- Webhooks are HMAC-verified and processed exactly once; the browser is never
  trusted for plan activation.
- The email finder enforces an SSRF guard, validating every redirect hop and
  refusing private, loopback and link-local addresses.
- Rate limiting is database-backed, so it holds across all serverless instances.
- The scraper carries only `SCRAPER_WORKER_SECRET`; every write also needs the
  current per-job lease token. It never receives the Supabase service-role key.

MIT © Zybble
per-job lease token. It never receives the Supabase service-role key.

MIT © Zybble
