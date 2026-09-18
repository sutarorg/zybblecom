# Zybble

**Find the businesses that need you.**
AI-powered lead generation and outreach — find, enrich, research, score, write, send.

Zybble has one frontend/API application on Vercel and one **Railway worker**
that powers Lead Finder with the open-source
[SoCloseSociety/GoogleMapScraper](https://github.com/SoCloseSociety/GoogleMapScraper)
(MIT) — real Google Maps data via Selenium, **no Google Maps API key**. The
frontend, auth, AI, billing, SMTP delivery and campaign job engine stay inside
the Vercel app.

| Layer | Implementation |
| --- | --- |
| Frontend | React 19 · Vite · Tailwind v4 (landing + app in one bundle) |
| API | Vercel Serverless Function (`api/router.ts`), Node runtime, Zod-validated |
| Lead discovery | Python/Selenium worker on **Railway** — vendored GoogleMapScraper engine, broad area coverage, no API key |
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
│  ├─ scraper.py         → discovery engine (coverage planning, dedupe, paging)
│  ├─ vendor/            → vendored GoogleMapScraper core (MIT) + its licence
│  └─ tests/             → offline tests against a Google Maps simulator
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
2. **Discover.** `worker/scraper.py` drives real Google Maps through the
   vendored two-phase core (smart-scroll the results feed, then read each
   business panel) and collects businesses until the requested number of
   *unique, filtered* results is reached or the coverage plan is exhausted.
   Hitting the browser time budget is not a failure: the coverage cursor is
   saved and the job resumes on its next slice.
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
| Railway worker | owns the browser; runs the GoogleMapScraper engine |
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
| Docker runtime (worker mode only) | any container runtime you control | Python/Selenium Lead Finder |
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

Lead Finder runs on an adaptation of
[SoCloseSociety/GoogleMapScraper](https://github.com/SoCloseSociety/GoogleMapScraper)
(MIT — see `worker/THIRD_PARTY_LICENSES.md`). It drives a real Chromium browser
through Google Maps, extracts public business details, verifies publicly listed
emails, and streams everything into your Supabase leads database. **No Google
Maps API key is used or required.**

Generate the shared secret now — Vercel and the worker must hold the same value:

```bash
openssl rand -hex 32   # → SCRAPER_WORKER_SECRET
```

## 4.1 Test the scraper locally with a real search (before deploying)

On your own machine (needs Python 3.11+ and Chrome installed):

```bash
pip install -r worker/requirements.txt
python worker/smoke_test.py "dentists" "Austin, Texas" 5
```

Expected output: phase-1 link collection progress, then one line per real
business (name, city, rating, review count, website), then a JSON dump and
`SMOKE TEST PASSED`. This runs the exact production code path — the same
`run_scrape()` the Railway worker calls — against live Google Maps.

If you prefer Docker (matches Railway exactly):

```bash
docker build -f worker/Dockerfile -t zybble-scraper .
docker run --rm --shm-size=2g \
  -e ZYBBLE_APP_URL=http://localhost:3000 \
  -e SCRAPER_WORKER_SECRET=dummy \
  zybble-scraper python -c "from smoke_test import main; exit(main())"
```

Do not deploy to Railway until the smoke test passes locally.

## 4.2 Deploy the worker to Railway

1. Go to **https://railway.com** → **Login with GitHub**.
2. **New Project** → **Deploy from GitHub repo** → select **`zybble`**
   (grant Railway access to the repository if asked).
3. Railway creates a service. Click it → **Settings** tab.
4. **Leave Root Directory empty** (repo root). The root `railway.json` takes
   over: it forces the **Dockerfile builder** on `worker/Dockerfile`, so
   Railway builds the Python/Selenium image and never mistakes the repo for a
   Node/Vite project. If you ever see `react-vite-tailwind` or `vite build` in
   the build log, the Root Directory is wrong — clear it and redeploy.
5. Open the **Variables** tab → **+ New Variable** and add:

   | Variable | Value |
   | --- | --- |
   | `ZYBBLE_APP_URL` | `https://<project>.vercel.app` (your Vercel domain from Step 7) |
   | `SCRAPER_WORKER_SECRET` | the exact value you set in Vercel |
   | `SCRAPER_CONCURRENCY` | `2` (optional; 1–4) |
   | `SCRAPER_POLL_SECONDS` | `5` (optional) |
   | `SCRAPER_JOB_TIMEOUT_SECONDS` | `1200` (optional) |

6. **Settings → Resources / Memory**: allocate at least **2 GB RAM** — each
   Chromium session uses ~500–700 MB. The Dockerfile sets
   `--disable-dev-shm-usage` so `/dev/shm` size is not a constraint.
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
`FOR UPDATE SKIP LOCKED` leasing in Postgres guarantees it. Each job runs in
its own Chromium session, always closed in `finally`. Jobs that die mid-run
are reclaimed after the lease expires, retried up to 3 times total, then
failed with **unused quota automatically refunded**.

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
npm run build
npm test              # API tests + Lead Finder tests + scraper worker tests
```

`npm test` runs, in order:

| Script | What it checks |
| --- | --- |
| `test:api` | API behaviour, validation and auth |
| `test:leadfinder` | lead filters, email safety, dedupe keys, job counters |
| `verify:no-google` | no Google Maps API dependency anywhere in the lead path |
| `test:worker` | the scraper engine against an offline Google Maps simulator (98% of it runs without a browser) |
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

**Scraping locally** — first verify the engine with a real search
(see [Step 4.1](#41-test-the-scraper-locally-with-a-real-search-before-deploying)):

```bash
pip install -r worker/requirements.txt
python worker/smoke_test.py "dentists" "Austin, Texas" 5
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

Work is stored in Supabase. Email jobs and the optional Places provider run in
bounded serverless slices. In Selenium mode, the Python worker claims only
`provider='worker'` jobs through the app's secure control plane.

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
| Selenium worker → `/api/worker/claim` | continuously, worker mode | real no-key Google Maps extraction |

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
| `SCRAPER_CONCURRENCY` | no | `2` (1–4; ~600 MB RAM per browser) |
| `SCRAPER_POLL_SECONDS` | no | `5` |
| `SCRAPER_JOB_TIMEOUT_SECONDS` | no | `1200` |

| `SCRAPER_EMAIL_BUDGET_SECONDS` | no | `600` |
| `SCRAPER_MAX_TILES` | no | `36` — viewports swept to cover the whole location |
| `SCRAPER_MAX_ATTEMPTS` | no | `6` — bounded slices a broad search may use |
| `SCRAPER_BATCH_SIZE` | no | `5` — businesses stored per crash-safe batch |

No Google Maps API key exists anywhere in this deployment — and none is
needed. Lead discovery is powered entirely by the Railway scraper worker,
which drives real Google Maps through the open-source
[GoogleMapScraper](https://github.com/SoCloseSociety/GoogleMapScraper) engine
vendored in `worker/vendor/`. There is no Places API, no Geocoding API and no
`places` fallback: `npm run verify:no-google` fails the build if one ever
reappears.

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
| Search fails with "Selenium lead worker is offline" | The Railway worker is not running or not heart-beating. Check Railway → service → **Deployments/Logs** for `worker online`; verify `ZYBBLE_APP_URL` and `SCRAPER_WORKER_SECRET`. `/api/ready` shows the heartbeat age. |
| Railway build log shows `vite build` / `react-vite-tailwind` | Railway tried to build the Node/Vite app instead of the worker. Clear any **Root Directory** setting (leave it repo root) so the root `railway.json` Dockerfile builder applies. Redeploy. |
| Railway worker crashes or is OOM-killed | Raise the service memory to ≥ 2 GB (Settings → Resources) or lower `SCRAPER_CONCURRENCY`. Each Chromium session needs ~500–700 MB. |
| Worker gets 401 | `SCRAPER_WORKER_SECRET` differs between Vercel and Railway. Set the same 64-hex value in both, redeploy Vercel and restart the worker. |
| Worker gets 409 | Its job lease expired or was reclaimed — expected safe behavior; the worker drops the stale browser result and claims another job. After `SCRAPER_MAX_ATTEMPTS` (default 6) claims the job finishes with what it collected and quota is refunded. |
| A search returns far fewer leads than requested | The location is swept in bounded slices; check that the worker is heart-beating and look at `/api/ready`. Each slice continues from the saved coverage cursor — see the job's `coverage_done/coverage_total` counters in the UI. |
| Smoke test fails locally with a traffic challenge | Google presented a CAPTCHA for your IP. Wait, retry from a different network, or lower the limit. The worker reports this as a retryable failure — it never bypasses challenges. |
| Smoke test fails with `SelectorChangedError` | Google changed Maps markup. Update the fallback selectors in `worker/scraper.py` (`collect_links` / `extract_place`). |
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

1. **Selenium layout changes are an operational risk.** The worker uses several
   selector fallbacks and reports a precise `SelectorChangedError`, but Google
   can change Maps markup. Monitor worker logs and `/api/ready`.
2. **The scraper runs on Railway.** Chromium cannot run reliably in Vercel's
   serverless functions, so the worker is a separate Railway service — the only
   second deployment in this architecture, dedicated entirely to Lead Finder.
3. **Worker radius is viewport-based.** The worker geocodes the location with
   Nominatim and sets Google Maps' center/zoom to the requested radius. Maps may
   still return edge results; it is not a contractual geo-fence.
4. **Scraping Google Maps may conflict with Google's Terms of Service.** The
   upstream project carries the same warning. Use lawful public-business
   research practices, do not bypass CAPTCHAs/access controls, and obtain legal
   advice for your jurisdiction and scale.
5. **Places fallback caps results** at roughly 60 per text query and is metered
   by Google; it is not used in worker mode.
6. **Hobby cron runs once per day.** Vercel Hobby allows a single daily cron
   run (configured at `0 0 * * *`; sub-daily schedules require **Pro**). The
   in-app tick compensates by draining the queue every few seconds while anyone
   has the app open, so searches, deliveries and retries stay realtime during
   use — only fully unattended workloads (e.g., a follow-up due overnight while
   nobody is online) would wait for the daily run. You can also drain the queue
   manually at any time: `curl -X POST https://<domain>/api/cron/tick -H "x-cron-secret: <CRON_SECRET>"` (see Local development).
7. **Function timeout is 60s**, so email delivery and Places fallback are chunked.
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
