# Zybble

**Find the businesses that need you.**
AI-powered lead generation and outreach — find, enrich, research, score, write, send.

Zybble has one frontend/API application on Vercel and a **pluggable lead
provider**. With `LEAD_PROVIDER=worker`, Lead Finder uses the open-source
Python/Selenium scraper (no Google Maps API key). With
`LEAD_PROVIDER=places`, the same queue can use the serverless Places API
fallback. The frontend, auth, AI, billing, SMTP delivery and campaign job
engine stay inside the Vercel app in both modes.

| Layer | Implementation |
| --- | --- |
| Frontend | React 19 · Vite · Tailwind v4 (landing + app in one bundle) |
| API | Vercel Serverless Function (`api/index.ts`), Node runtime, Zod-validated |
| Background jobs | Vercel Cron + in-app ticks, database-leased, chunked |
| Database & Auth | Supabase (PostgreSQL + RLS + Auth) |
| AI | OpenAI `o4-mini` (server-side only) |
| Lead discovery | `worker`: SoCloseSociety GoogleMapScraper adaptation (Selenium, no API key); `places`: API fallback |
| Email finder | Source-backed public website scan + DNS MX verification (SSRF-guarded) |
| Email sending | User's own SMTP via nodemailer, AES-256-GCM encrypted credentials |
| Payments | Razorpay USD subscriptions + signed, idempotent webhooks |

```
zybble/
├─ src/                 → frontend (Vite build → dist/)
├─ api/
│  ├─ router.ts         → the entire backend, one function
│  └─ _lib/             → core, jobs, places, email-finder, smtp, openai, razorpay
├─ worker/              → optional no-key Selenium provider (Docker)
├─ supabase/migrations/ → run once in the Supabase SQL editor
└─ vercel.json          → function config + cron schedule + rewrites
```

---

# Table of contents

1. [Prerequisites](#0--prerequisites)
2. [Step 1 — Push to GitHub](#step-1--push-to-github)
3. [Step 2 — Supabase](#step-2--supabase)
4. [Step 3 — OpenAI](#step-3--openai)
5. [Step 4 — Choose the lead provider](#step-4--choose-the-lead-provider)
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

### 2.2 Run the migrations — **all five, in order**
1. Left sidebar → **SQL Editor** → **+ New query**.
2. Paste the entire contents of each file and click **Run**, one at a time:
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_backend.sql`
   - `supabase/migrations/003_production_hardening.sql`
   - `supabase/migrations/004_single_app.sql` ← required for the single-app job engine
   - `supabase/migrations/005_pluggable_lead_provider.sql` ← provider-scoped leases + secure worker claims

Migrations 004–005 add the search radius, durable job cursor, provider-scoped
leases, stale recovery and secure worker ownership tokens.

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

# Step 4 · Choose the lead provider

## Mode A — Selenium worker, no Google Maps API key (requested mode)

Set `LEAD_PROVIDER=worker`. Generate a shared secret:

```bash
openssl rand -hex 32   # → SCRAPER_WORKER_SECRET
```

Put the same secret in Vercel and the worker. The worker needs only:

```env
ZYBBLE_APP_URL=https://your-zybble-domain.com
SCRAPER_WORKER_SECRET=<same value as Vercel>
SCRAPER_CONCURRENCY=2
```

Build and run its container from the repository root:

```bash
docker build -f worker/Dockerfile -t zybble-scraper .
docker run -d --name zybble-scraper --restart unless-stopped \
  --shm-size=2g \
  -e ZYBBLE_APP_URL=https://your-zybble-domain.com \
  -e SCRAPER_WORKER_SECRET=<secret> \
  -e SCRAPER_CONCURRENCY=2 \
  zybble-scraper
```

The worker never receives `SUPABASE_SERVICE_ROLE_KEY`. It authenticates to
`/api/worker/*` with the shared secret; every claimed job also gets a unique,
expiring lease token. Two workers can run concurrently without claiming the
same job. Each job gets its own Chromium session, always closed in `finally`.

Optional tuning:

```env
SCRAPER_POLL_SECONDS=5
SCRAPER_JOB_TIMEOUT_SECONDS=1200
SCRAPER_CONCURRENCY=2       # 1–4; allow ~600 MB RAM per browser
```

## Mode B — serverless fallback

Set `LEAD_PROVIDER=places` and provide `GOOGLE_MAPS_API_KEY` with **Places API
(New)** and **Geocoding API** enabled. No worker is needed. This mode is kept
for operational fallback; worker mode does not read or require this key.

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
| `LEAD_PROVIDER` | `worker` for Selenium/no key; `places` for fallback |
| `SCRAPER_WORKER_SECRET` | Step 4 (required in worker mode) |
| `GOOGLE_MAPS_API_KEY` | only when `LEAD_PROVIDER=places`; omit in worker mode |
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
curl https://<project>.vercel.app/api/ready       # {"ok":true,"database":"healthy",...}
curl -X POST https://<project>.vercel.app/api/cron/tick   # 401 (secret required) ✅
```

Then in the browser:

1. **Sign up** → lands in the app on the Free plan.
2. **Find Leads** → `Dentists` / `Austin, Texas` / 25 km / 10 leads →
   the job moves `Queued → Searching → Collecting → Enriching → Finding emails → Complete`
   and real businesses appear in **Leads** with email statuses.
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
```

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

To run the no-key scraper locally (second terminal, Docker required):

```bash
docker build -f worker/Dockerfile -t zybble-scraper .
docker run --rm --shm-size=2g \
  -e ZYBBLE_APP_URL=http://host.docker.internal:3000 \
  -e SCRAPER_WORKER_SECRET="$SCRAPER_WORKER_SECRET" \
  -e SCRAPER_CONCURRENCY=1 \
  zybble-scraper
```

Trigger background processing locally:

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

Application variables live in Vercel. Worker-only variables live only in its
container runtime.

| Variable | Scope | Source |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | browser | Step 2.3 |
| `VITE_SUPABASE_ANON_KEY` | browser | Step 2.3 |
| `SUPABASE_URL` | server | Step 2.3 |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Step 2.3 |
| `OPENAI_API_KEY` | server | Step 3 |
| `OPENAI_MODEL` | server | `o4-mini` |
| `LEAD_PROVIDER` | server | `worker` (no API key) or `places` |
| `SCRAPER_WORKER_SECRET` | server + worker | same generated value, worker mode only |
| `GOOGLE_MAPS_API_KEY` | server, optional | Places fallback only |
| `RAZORPAY_KEY_ID` | server | Step 5.1 |
| `RAZORPAY_KEY_SECRET` | server | Step 5.1 |
| `RAZORPAY_WEBHOOK_SECRET` | server | Step 5.2 |
| `SMTP_ENCRYPTION_KEY` | server | `openssl rand -hex 32` |
| `CRON_SECRET` | server | `openssl rand -hex 32` |
| `APP_URL` | server, optional | custom domain only |
| `CORS_ORIGINS` | server, optional | extra allowed browser origins |

**Removed** with the old architecture: `VITE_API_URL`, the Supabase key on the
worker, `PORT`, and `NEXT_PUBLIC_*`. The API is same-origin, so
there is no API URL to configure.

Worker-only: `ZYBBLE_APP_URL`, `SCRAPER_WORKER_SECRET`, and optional
`SCRAPER_CONCURRENCY`, `SCRAPER_POLL_SECONDS`, `SCRAPER_JOB_TIMEOUT_SECONDS`.

---

# Troubleshooting

| Symptom | Fix |
| --- | --- |
| Entirely white page | Hard-refresh first (Ctrl/Cmd+Shift+R). If it persists, the boot overlay will now show the underlying error; check `/api/ready` — it names every missing environment variable. |
| `/ready` says "not configured" | A required env var is unset in Vercel → Settings → Environment Variables. In worker mode, `GOOGLE_MAPS_API_KEY` is not required. Redeploy after changes. |
| `/api/*` returns the HTML page | The `/api/:path*` → `/api/router?path=:path*` rewrite must come **first** in `vercel.json`. Redeploy. |
| API 500 on every route | A required env var is missing — the function throws on boot. Check **Vercel → Deployments → Functions logs**; the message names the variable. |
| Worker-mode search stays queued | Start the scraper container and verify `ZYBBLE_APP_URL` plus `SCRAPER_WORKER_SECRET`. `/api/ready` reports its heartbeat and age. |
| Worker gets 401 | `SCRAPER_WORKER_SECRET` differs between Vercel and the container. Set the same 64-hex value and redeploy/restart. |
| Worker gets 409 | Its job lease expired or was reclaimed — expected safe behavior; the worker drops the stale browser result and claims another job. |
| Places-mode search is rejected | Only relevant with `LEAD_PROVIDER=places`: enable Places API (New), Geocoding, billing and set `GOOGLE_MAPS_API_KEY`. |
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
2. **Worker mode needs a container runtime.** That is inherent to Chromium;
   Vercel cannot run Selenium reliably. Provider C keeps the rest of Zybble as
   one app and lets you switch to `places` without changing the frontend or DB.
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
