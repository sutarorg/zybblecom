# Zybble

**Find the businesses that need you.**
AI-powered lead generation and outreach — find, enrich, research, score, write, send.

| Layer | Stack |
| --- | --- |
| Frontend | React 19 · Vite · Tailwind CSS v4 · hash-routed SPA (landing + app in one bundle) |
| API | Fastify 4 · TypeScript · Zod · ran as a Docker container |
| Database & Auth | Supabase (PostgreSQL + Row Level Security + Auth) |
| AI | OpenAI `o4-mini` (server-side only) |
| Payments | Razorpay USD subscriptions + signed webhooks |
| Email | User SMTP (nodemailer) · AES-256-GCM credential encryption |
| Scraper | Python + Selenium worker (adapted from [GoogleMapScraper](https://github.com/SoCloseSociety/GoogleMapScraper)) |

```
 GitHub repo
 ├─ /               → Vercel  (frontend: landing page + dashboard app)
 ├─ /server         → Container host (zybble-api + zybble-mailer worker)
 ├─ /worker         → Container host (zybble-scraper: Python/Selenium)
 └─ /supabase       → SQL migrations (run once in Supabase SQL Editor)
```

The frontend talks to **Supabase Auth** directly (anon key, safe for browsers) and to the
**`zybble-api`** for everything else. Selenium and the mail loop run as **separate
long-lived processes — never inside serverless functions**.

---

# Table of contents

1. [Prerequisites](#0--prerequisites)
2. [Step 1 — Push the code to GitHub](#step-1--push-the-code-to-github)
3. [Step 2 — Supabase: project, migrations, keys, auth URLs](#step-2--supabase)
4. [Step 3 — OpenAI API key](#step-3--openai-api-key)
5. [Step 4 — Razorpay: keys + webhook secret](#step-4--razorpay)
6. [Step 5 — Deploy the backend services (API + workers)](#step-5--deploy-the-backend-services)
7. [Step 6 — Deploy the frontend on Vercel](#step-6--deploy-the-frontend-on-vercel)
8. [Step 7 — Connect everything (final URLs)](#step-7--connect-everything)
9. [Smoke test your production app](#step-8--smoke-test)
10. [Local development](#local-development)
11. [Environment variable master table](#environment-variable-master-table)
12. [Troubleshooting](#troubleshooting)

---

# 0 · Prerequisites

Create free accounts on each of these before starting:

| Service | URL | Used for |
| --- | --- | --- |
| GitHub | https://github.com | code hosting, auto-deploys |
| Vercel | https://vercel.com | frontend hosting (sign up **with GitHub**) |
| Supabase | https://supabase.com | database + auth |
| OpenAI | https://platform.openai.com | AI research / scoring / writer |
| Razorpay | https://dashboard.razorpay.com | subscriptions |
| Railway *or* Render | https://railway.app · https://render.com | API + worker containers |

You also need **Git** and (for two generated secrets) a terminal
(macOS/Linux, or Git Bash / WSL on Windows).

---

# Step 1 · Push the code to GitHub

1. Go to **https://github.com/new**.
2. **Repository name:** `zybble` → leave **Private** selected (recommended) →
   **do not** tick "Add a README" → click **Create repository**.
3. On the next page GitHub shows "Push an existing repository from the command
   line". Open a terminal inside this project folder and run exactly:

```bash
git init
git add .
git commit -m "Zybble — production SaaS (frontend, API, workers)"
git branch -M main
git remote add origin https://github.com/<your-username>/zybble.git
git push -u origin main
```

4. Reload the repository page — you should see the code.
   (`.gitignore` already keeps `node_modules`, builds and every `.env` file out
   of the repo, so secrets can never be pushed by accident.)

---

# Step 2 · Supabase

This gives you **4 values**: `SUPABASE_URL`, the **anon key**, the **service-role key**,
plus a fully migrated database.

### 2.1 Create the project

1. Go to **https://supabase.com** → sign in → click **New project**.
2. Choose your organization, set:
   - **Name:** `zybble`
   - **Database password:** click **Generate** and save it somewhere safe
     (you won't need it for this deployment, but keep it).
   - **Region:** closest to your users.
3. Click **Create new project** and wait ~2 minutes while it provisions.

### 2.2 Run the database migrations

1. In the left sidebar, click the terminal icon **"SQL Editor"**.
2. Click **+ New query**.
3. Open `supabase/migrations/001_init.sql` from this repo, copy its **entire**
   contents, paste it into the editor, click **Run** (bottom-right).
   You should see _"Success. No rows returned"_.
4. Click **+ New query** again and repeat with `supabase/migrations/002_backend.sql`, **Run**.

That creates all 15+ tables, indexes, Row Level Security policies, the
post-signup provisioning trigger, the atomic `try_consume_leads` quota RPC,
webhook idempotency and billing tables.

### 2.3 Get the API keys

1. In the left sidebar, click the **gear icon** (Project Settings).
2. Click **API** (on newer UIs it's called **"Data API"** → "API keys").
3. Copy these three values into a scratch note:
   - **Project URL** → this is your `SUPABASE_URL` (and the frontend's `VITE_SUPABASE_URL`)
     — looks like `https://abcdefghiklm.supabase.co`.
   - Under **Project API keys** → **`anon` `public`** → **Reveal/Copy** →
     this is `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`.
   - **`service_role`** → click **Reveal**, then **Copy** → this is
     `SUPABASE_SERVICE_ROLE_KEY`. ⚠️ Treat it like a password — it bypasses
     RLS and must only ever live in backend env vars, never in the frontend.

### 2.4 Auth URL configuration (do now, finalize in Step 7)

1. Left sidebar → **Authentication**.
2. Click **URL Configuration** (under "Configuration").
3. **Site URL:** for now put `https://localhost` — we'll replace it with your
   live Vercel domain in Step 7 (Supabase validates magic-link/password-reset
   redirects against this list).
4. Under **Redirect URLs** click **Add URL** and add:
   - `http://localhost:5173/**` (local dev) — add your production URL in Step 7.
5. Optional but recommended for production: left sidebar **Authentication →
   Providers → Email** → keep **Confirm email** ON, so signups verify their inbox.

---

# Step 3 · OpenAI API key

1. Go to **https://platform.openai.com** and sign in.
2. In the **left sidebar**, click **API keys** (or visit
   https://platform.openai.com/api-keys directly).
3. Click **+ Create new secret key**.
   - **Name:** `zybble` → **Project:** Default → permissions **All**.
4. Click **Create secret key** and **copy it immediately** (shown only once) —
   this is `OPENAI_API_KEY` (`sk-...`).
5. `OPENAI_MODEL` needs no dashboard visit — the value is just the text `o4-mini`
   (already in `.env.example`). Billing/quota lives under **Settings → Billing**
   if you need to top up.

---

# Step 4 · Razorpay

This gives you **3 values**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

### 4.1 API keys

1. Go to **https://dashboard.razorpay.com** and sign in.
2. Use the toggle in the **top bar** to choose **Test Mode** while developing
   (switch to Live Mode when ready to charge real customers — Live requires KYC).
3. Left sidebar → **Settings** → **API Keys** (under "Account and Settings").
4. Click **Generate Test Key** (or **Generate Live Key** in Live Mode).
5. Copy:
   - **Key Id** (`rzp_test_...`) → `RAZORPAY_KEY_ID`
   - **Key Secret** → shown **once** → `RAZORPAY_KEY_SECRET` (click to
     download/copy before closing the dialog).
6. If you ever lose the secret, return to the same page and click **Regenerate**.

> Plans are **auto-provisioned by the API on first checkout**
> (USD $49/month and $129/month, monthly period, cached in the
> `billing_plans` table). You do not need to create plans manually.

### 4.2 Webhook + webhook secret

1. Left sidebar → **Settings** → **Webhooks** → click **+ Add New Webhook**.
2. **Webhook URL:** `https://<your-api-domain>/api/webhooks/razorpay`
   — you get `<your-api-domain>` in Step 5, so either come back after Step 5
   or fill it in now and edit later (the URL is editable).
3. **Secret:** generate one in your terminal —

```bash
openssl rand -hex 16
```

   Paste the output into the Razorpay **Secret** field **and** save the same
   value as `RAZORPAY_WEBHOOK_SECRET` in your backend env vars.
4. **Active events** — tick exactly these:
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.cancelled`
   - `subscription.completed`
   - `subscription.halted`
   - `payment.failed`
5. Click **Create Webhook**.

The API verifies `X-Razorpay-Signature` against this secret on every call,
processes each event idempotently, and treats the webhook — never the browser —
as the source of truth.

---

# Step 5 · Deploy the backend services

Three services run as containers from this monorepo:

| Service | Source | Command |
| --- | --- | --- |
| `zybble-api` | `server/` (Dockerfile) | `node dist/server.js` (default) |
| `zybble-mailer` | `server/` (same image) | `node dist/worker.js` |
| `zybble-scraper` | `worker/` (Dockerfile) | `python worker.py` |

First, generate the two local secrets in your terminal:

```bash
openssl rand -hex 32   # → SMTP_ENCRYPTION_KEY
openssl rand -hex 24   # → WORKER_SECRET
```

### Step 5 · Option A — Railway (recommended, click-by-click)

**Service 1 — API:**

1. Go to **https://railway.app** → **Login with GitHub**.
2. **New Project** → **Deploy from GitHub repo** → select **`zybble`** →
   if asked, confirm "Railway can access the repository".
3. Railway creates a service. Click it → **Settings** tab.
4. Scroll to **Source** → set **Root Directory** to `server`
   (Railway auto-detects `server/Dockerfile`).
5. Open the **Variables** tab → click **+ New Variable** and add **all** of:

| Variable | Value from |
| --- | --- |
| `SUPABASE_URL` | Step 2.3 — Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Step 2.3 — service_role key |
| `OPENAI_API_KEY` | Step 3 |
| `OPENAI_MODEL` | `o4-mini` |
| `RAZORPAY_KEY_ID` | Step 4.1 |
| `RAZORPAY_KEY_SECRET` | Step 4.1 |
| `RAZORPAY_WEBHOOK_SECRET` | Step 4.2 |
| `SMTP_ENCRYPTION_KEY` | `openssl rand -hex 32` (above) |
| `WORKER_SECRET` | `openssl rand -hex 24` (above) |
| `APP_URL` | temporary `https://localhost` — **replace in Step 7** |

6. Still in **Settings** → **Networking** section → click **Generate Domain**.
   Railway assigns `https://<something>.up.railway.app` — **copy this: it is your
   API domain** (`VITE_API_URL` for the frontend and the Razorpay webhook URL).
7. The service auto-deploys; wait for **Deploy → Success**, then click the
   **Deployments → View logs** and look for `"zybble api listening"`.

**Service 2 — Mailer worker (sends scheduled emails):**

1. In the same project, click **+ New** (top-right) → **GitHub Repo** →
   `zybble` again.
2. **Settings → Source → Root Directory:** `server`.
3. **Settings → Deploy → Custom Start Command:** `node dist/worker.js`.
4. **Variables tab:** click **"Add Variable Reference"** or re-add the **same
   full set** as the API service (Railway doesn't auto-share — fastest is the
   **"Raw Editor"** toggle: paste the whole block).
5. Deploy; logs should show `"mailer worker started"`.

**Service 3 — Scraper worker (Google Maps / Selenium):**

1. **+ New → GitHub Repo → `zybble`** once more.
2. **Settings → Source → Root Directory:** `worker`
   (auto-detects `worker/Dockerfile` with Chromium).
3. **Variables:** only two are needed —
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   (optional: `WORKER_POLL_SECONDS=5`).
4. Deploy; logs should show `"[worker] scraper worker online"`.

### Step 5 · Option B — Render (one-click blueprint)

1. Go to **https://render.com** → sign in → **New → Blueprint**.
2. Connect GitHub, select the `zybble` repo → Render reads `render.yaml` and
   creates all three services (`zybble-api`, `zybble-mailer`, `zybble-scraper`).
3. It prompts for each `sync: false` env var — paste the same values from the
   Option A table.
4. Click **Apply / Create resources**. When `zybble-api` is live, its URL
   (`https://zybble-api.onrender.com`) is your API domain.

> Any Docker host works (Fly.io, DigitalOcean App Platform, ECS): build
> `server/Dockerfile` twice (default CMD + `worker` CMD) and
> `worker/Dockerfile` once, with the same env vars.

---

# Step 6 · Deploy the frontend on Vercel

1. Go to **https://vercel.com** → log in (with GitHub).
2. Click **Add New… → Project** (top-right of the dashboard).
3. Under **Import Git Repository**, find `zybble` → click **Import**
   (first time: click **"Install Vercel for GitHub"** and grant access to the repo).
4. Vercel auto-detects everything from `vercel.json` — verify:
   - **Framework Preset:** `Vite` ✅ (auto)
   - **Root Directory:** `./` (leave as-is)
   - **Build Command:** `npm run build` · **Output Directory:** `dist` (auto)
5. Expand **Environment Variables** and add exactly **3**:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Step 2.3 — Project URL (`https://….supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Step 2.3 — anon public key |
| `VITE_API_URL` | Step 5 — your API domain, e.g. `https://zybble-production.up.railway.app` (no trailing slash) |

   *(Leave the scope on **Production, Preview, Development** — all three.)*

6. Click **Deploy**. ~1 minute later you get
   `https://<project-name>.vercel.app` — **this is your live product**.
7. Optional custom domain: **Project → Settings → Domains → Add** and follow
   the DNS instructions Vercel shows.

Every `git push` to `main` now auto-redeploys the site.

---

# Step 7 · Connect everything

Last loop-closers (2–3 minutes):

1. **Supabase → Authentication → URL Configuration:**
   - **Site URL:** `https://<project-name>.vercel.app`
   - **Add Redirect URL:** `https://<project-name>.vercel.app/**`
   → **Save**. (Magic links and password resets now land back in the app.)

2. **API service → backend env var `APP_URL`** — set it to the same Vercel domain
   (used to build unsubscribe links inside sent emails). Redeploy the API
   (Railway: **Deployments → Redeploy**).

3. **Razorpay → Settings → Webhooks** — edit your webhook and confirm the URL is
   `https://<your-api-domain>/api/webhooks/razorpay`. Save.

4. **Vercel ← API domain** — if you deployed the API before getting its final
   domain, update `VITE_API_URL`: **Vercel → your project → Settings →
   Environment Variables → ⋯ → Edit** → then **Deployments → ⋯ → Redeploy**.

You're live.

---

# Step 8 · Smoke test

Run this in order on your production URL; every item maps to a real subsystem:

1. **Sign up** (`/signup`) → lands in the app, Free plan visible in the sidebar.
2. **Find Leads** → `Dentists` / `Texas` / 10 leads → watch the job go
   `Queued → Searching → Collecting → Enriching → Finding emails → Complete`
   (scraper worker at work; leads appear in **Leads** live).
3. **Billing → Growth** → Razorpay checkout opens → in **Test Mode** use card
   `4111 1111 1111 1111`, any future expiry, any CVV → on success the plan
   flips to Growth (webhook confirms; Billing activity shows `upgraded`).
4. **Leads → open a lead** → **Research with AI**, **Score lead**, **Write email**
   (real `o4-mini` calls; results cached).
5. **Settings → SMTP senders → Connect** a real SMTP account
   (Gmail: Google Account → Security → 2-Step Verification → App passwords)
   → **Test** (live handshake).
6. **Campaigns → New campaign** (Day 0 / 3 / 7 prefilled) → **Add leads** →
   **Launch** → first emails send within seconds via the mailer worker;
   follow-ups schedule for +3/+7 days; Activity feed streams live.
7. Open an email **Preview** → click its **unsubscribe** link → the address
   joins the suppression list and is never emailed again.
8. **Export CSV** from Leads → downloads instantly (server-side export).

---

# Local development

No env vars are required to explore the product — the frontend ships with an
embedded local engine (local auth, lead pipeline, AI heuristics, campaign
simulation) so `npm run dev` alone gives you the full UI end-to-end.

```bash
npm install
npm run dev          # → http://localhost:5173
```

To run against the real backend locally:

```bash
cp .env.example .env          # fill in the server-side values
cd server && npm install && npm run dev        # API on :8787
cd server && npm run dev:worker                # mailer (second terminal)
cd worker && pip install -r requirements.txt && python worker.py   # scraper (third)
```

…and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL=http://localhost:8787`
in a `.env` for the frontend.

---

# Environment variable master table

| Variable | Set where | Source (click-by-click step) |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Vercel | Step 2.3 — Project URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel | Step 2.3 — anon public key |
| `VITE_API_URL` | Vercel | Step 5 — generated API domain |
| `SUPABASE_URL` | API, mailer, scraper | Step 2.3 — Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | API, mailer, scraper | Step 2.3 — service_role (secret) |
| `NEXT_PUBLIC_SUPABASE_URL` | same as `SUPABASE_URL` | kept for Next-style tooling parity |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as `VITE_SUPABASE_ANON_KEY` | " |
| `OPENAI_API_KEY` | API, mailer | Step 3 — platform.openai.com → API keys |
| `OPENAI_MODEL` | API, mailer | literal `o4-mini` |
| `RAZORPAY_KEY_ID` | API, mailer | Step 4.1 — Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | API, mailer | Step 4.1 — shown once at generation |
| `RAZORPAY_WEBHOOK_SECRET` | API, mailer | Step 4.2 — you generate it (`openssl rand -hex 16`) and put the same value into Razorpay |
| `SMTP_ENCRYPTION_KEY` | API, mailer | `openssl rand -hex 32` |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | API, mailer | your Vercel domain (Step 7) |
| `WORKER_SECRET` | API, mailer | `openssl rand -hex 24` |
| `WORKER_POLL_SECONDS` | scraper (optional) | default `5` |

> The scraper only needs `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

---

# Troubleshooting

| Symptom | Fix |
| --- | --- |
| Sign-in says "Invalid access token" in the app | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` wrong or missing in Vercel → edit, redeploy. |
| Magic link lands on an error page | **Supabase → Authentication → URL Configuration**: Site URL and Redirect URLs must include your Vercel domain with `/**`. |
| `402` on search | Monthly quota consumed — expected behavior; upgrade or wait for the next month. |
| Job stays `Queued` | Scraper worker isn't running (check its logs) or `SUPABASE_SERVICE_ROLE_KEY` is wrong on the worker. |
| AI buttons throw 403 | Account is on Free — AI is Growth+. If you just upgraded, wait ~10s for the webhook sync. |
| SMTP connect fails | Handshake happens live on save — wrong host/port or provider requires an *app password*. 5xx rejects during sending auto-suppress the address. |
| Emails scheduled but not sending | `zybble-mailer` worker must be running; it ticks every 15 s. |
| Payment succeeded, plan didn't change | Check **Razorpay → Webhooks →** your webhook (it shows delivery attempts + the API needs `RAZORPAY_WEBHOOK_SECRET` to match the webhook secret). The `/api/billing/verify` endpoint syncs instantly on success regardless. |
| Razorpay webhook 401 | `RAZORPAY_WEBHOOK_SECRET` ≠ webhook secret in the dashboard — make them identical and redeploy the API. |

---

# Security notes

- The **service-role key** is used only in backend processes; every query is
  still explicitly scoped to the authenticated user, and RLS stays enabled as
  defense in depth.
- `OPENAI_API_KEY`, Razorpay secrets and `SMTP_ENCRYPTION_KEY` never reach the
  browser (`.env.example` marks exactly which variables are browser-safe).
- SMTP passwords are encrypted with AES-256-GCM before they touch the database
  and are **never selected back** by any endpoint.
- Webhooks are HMAC-verified and idempotent; browser payment redirects are
  never trusted for plan activation.
- The scraper collects **public business data only** (name, address, phone,
  website, hours, ratings, publicly listed emails) and never circumvents
  CAPTCHAs or access controls. Respect Google's Terms of Service and local
  outreach regulations (CAN-SPAM / GDPR) — built-in one-click unsubscribe and
  suppression lists help you comply.

MIT © Zybble
