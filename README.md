# Zybble — sell what you know, with a single link

Zybble ([zybble.com](https://zybble.com)) is a mobile-first course-selling platform:

- **Instant creators** — every registered user can create and publish courses immediately. No approvals.
- **Link-first selling** — each course gets a unique shareable URL (`zybble.com/c/<slug>`). There is no public marketplace or explore page; the creator's link *is* the store.
- **Razorpay payments** — secure checkout with server-side signature verification and webhook confirmation.
- **Automatic daily settlements** — a scheduled payout run at **4:00 PM** transfers eligible creator earnings to their bank accounts with full audit records.
- **90 / 10 split** — Zybble keeps a 10% platform fee, creators receive 90%. All financial math happens server-side in integer paise.

---

## 1. Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Database | PostgreSQL via Drizzle ORM |
| Styling | Tailwind CSS v4 |
| Payments | Razorpay Orders API + checkout.js + webhooks |
| Payouts | RazorpayX (contacts → fund accounts → payouts) |
| Auth | Email/password (bcrypt + JWT session cookie) and Google OAuth 2.0 |
| Scheduler | `node-cron` in-process (daily 16:00) + protected HTTP endpoint |

## 2. Quick start

```bash
npm install
cp .env.example .env    # then fill in values (see §3)
npx drizzle-kit push    # create tables in PostgreSQL
# one extra guard index against duplicate enrollments:
psql "$DATABASE_URL" -c "CREATE UNIQUE INDEX IF NOT EXISTS purchases_paid_unique ON purchases (buyer_id, course_id) WHERE status = 'paid';"
npm run dev             # http://localhost:3000
```

Production (VPS / Docker / any Node host):

```bash
npm run build && npm start
```

**Demo accounts** (seeded automatically on first boot):

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@zybble.com` | `admin12345` |
| Creator (has 2 published courses) | `creator@zybble.com` | `creator12345` |
| Buyer | `buyer@zybble.com` | `buyer12345` |

> **Test mode** — if Razorpay keys are absent, the platform simulates the gateway
> end-to-end (orders, payment success/failure, signature flow, payouts). The moment
> live keys are set, simulation is permanently disabled.

## 3. Environment variables — where to find every value

All variables live in **`.env`** at the project root. Below is each one with
click-by-click instructions.

### 3.1 `DATABASE_URL` ✱ required

PostgreSQL connection string.

**Local PostgreSQL:** keep the default `postgresql://postgres:postgres@127.0.0.1:5432/app_db`, then create the DB:

```bash
psql postgresql://postgres:postgres@127.0.0.1:5432/postgres -c "CREATE DATABASE app_db;"
```

**Neon (free hosted option):**
1. Go to <https://neon.tech> → **Sign up** → **Create a project**.
2. Pick a name (e.g. `zybble`) and region → **Create project**.
3. On the project dashboard click **Connect** → copy the **connection string** (it looks like `postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`).
4. Paste it as `DATABASE_URL`.

### 3.2 `AUTH_SECRET` ✱ required in production

Signs session cookies and test-mode payment tokens. Any long random string works:

```bash
openssl rand -base64 32
```

Paste the output as `AUTH_SECRET`. Rotate it any time — users will simply be logged out.

### 3.3 `NEXT_PUBLIC_APP_URL` ✱ required for Google OAuth in production

The public origin of the app, no trailing slash — used to build the absolute Google redirect URL.

- Local development: leave unset (`http://localhost:3000` is used).
- Production: set `NEXT_PUBLIC_APP_URL=https://zybble.com`.

### 3.4 Razorpay keys — `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`

Enables live checkout, payment signature verification, and RazorpayX payouts.

1. Go to <https://dashboard.razorpay.com> and log in (KYC required for **live** mode; **test** mode works immediately).
2. Use the mode toggle in the top-left to pick **Test** (recommended first) or **Live**.
3. In the left sidebar click **Settings** → **API Keys**.
4. Click **Generate Test Key** (or **Regenerate Live Key**).
5. A dialog shows the **Key Id** (`rzp_test_...` / `rzp_live_...`) and **Key Secret**.
6. Copy **Key Id** → `RAZORPAY_KEY_ID`, **Key Secret** → `RAZORPAY_KEY_SECRET`. The secret is shown only once — save it immediately.

### 3.5 `RAZORPAY_WEBHOOK_SECRET`

Verifies that webhook calls genuinely come from Razorpay (the app returns `400` otherwise).

1. First invent your own secret, e.g. `openssl rand -base64 24` → set it as `RAZORPAY_WEBHOOK_SECRET`.
2. Razorpay Dashboard → **Settings** → **Webhooks** → **+ Add New Webhook**.
3. **Webhook URL**: `https://zybble.com/api/webhooks/razorpay` (use your real domain; for local testing use a tunnel like `ngrok http 3000`).
4. **Secret**: paste the *same* value you set in step 1.
5. Under **Active events** tick **`payment.captured`** and **`payment.failed`**.
6. Click **Create Webhook**. Razorpay will now POST signed events to the platform.

### 3.6 `RAZORPAYX_ACCOUNT_NUMBER`

The RazorpayX current account that **funds** creator payouts (the daily 4:00 PM settlement).

1. Razorpay Dashboard → left sidebar → **RazorpayX** → **Get started** and complete RazorpayX activation for your business.
2. In RazorpayX open **Accounts & Settings** (or **My Account**).
3. Copy your **RazorpayX current account number**.
4. Set it as `RAZORPAYX_ACCOUNT_NUMBER`.
5. Keep the account funded — payouts with insufficient balance either queue or fail (the run records the failure and retries the purchase batch next run).

> No separate API keys are needed for payouts — the same `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` authenticate RazorpayX. If this variable is empty, payouts stay in simulation mode.
> In **test mode**, RazorpayX payouts also require enabling **Payouts** in test mode and using test funds; until then, leave this empty and enjoy the simulator.

### 3.7 Google sign-in — `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`

Powers the **Continue with Google** button on the auth page.

1. Go to <https://console.cloud.google.com> and sign in with a Google account.
2. Top bar → project picker → **New Project** → name it (e.g. `Zybble`) → **Create**.
3. Left menu → **APIs & Services** → **OAuth consent screen** → **Get started**.
4. Enter **App name** (`Zybble`) and a **User support email** → click **Next**.
5. Audience: choose **External** → **Next** → add your contact email → **Next** → agree → **Create**.
6. Left menu → **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**.
7. **Application type**: **Web application**. Name: `Zybble Web`.
8. **Authorized JavaScript origins** → **+ Add URI**: add
   - `http://localhost:3000`
   - `https://zybble.com` (your real domain)
9. **Authorized redirect URIs** → **+ Add URI**: add
   - `http://localhost:3000/api/auth/google/callback`
   - `https://zybble.com/api/auth/google/callback`
10. Click **Create**. A dialog shows **Client ID** (`....apps.googleusercontent.com`) and **Client Secret** (`GOCSPX-...`).
11. Copy them into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, restart the app.

The callback route verifies the ID token's signature/audience with Google before creating or linking the user.

### 3.8 `CRON_SECRET`

Protects the HTTP settlement trigger (`/api/cron/settle`) so only your scheduler can invoke it.

1. Generate: `openssl rand -base64 24` → set as `CRON_SECRET`.
2. Call it with either an `Authorization: Bearer <CRON_SECRET>` header or `?secret=<CRON_SECRET>`.

> **On Vercel this variable is required**: Vercel Cron automatically sends
> `Authorization: Bearer <CRON_SECRET>` when invoking the job declared in
> `vercel.json` — no extra setup needed. Everywhere else, an in-process
> scheduler runs the settlement **every day at 4:00 PM** automatically, and
> this endpoint covers external schedulers (system cron, GitHub Actions) and
> manual admin runs.

### 3.9 `SETTLEMENT_TZ`

IANA timezone for the built-in 16:00 schedule. Default `Asia/Kolkata`. Example: `Asia/Dubai`, `Europe/London`.

---

## 4. How money flows

```
Buyer ──/c/slug──▶ Order created (Razorpay, server-side)        purchase: created
        ──checkout.js──▶ signature verified server-side         purchase: paid
        ──webhook (double-entry confirmation, idempotent)──▶    purchase: paid
                                                                    │
Admin fee 10% ──▶ purchases.fee_paise        (platform revenue)     │
Creator 90%  ──▶ purchases.creator_paise     (pending balance)      │
        ──daily 4:00 PM settlement run──▶                           ▼
        payout record + RazorpayX transfer ──▶ creator bank account
```

Duplicate-purchase protection: a partial unique index on `(buyer_id, course_id) WHERE status = 'paid'`, plus transactional re-checks, make double enrollment impossible — a colliding second payment is flagged for refund instead.

## 5. Payout rules (admin-configurable)

Configured in **Admin → Settings** and enforced by the settlement engine:

- **Platform fee %** (default 10) — applied to all future orders.
- **Minimum payout** (default ₹1) — smaller balances roll over to the next run.
- **Clearing period hours** (default 0) — a sale becomes eligible N hours after purchase.

A payout is skipped (and retried next run) if the creator has no bank account on file. Failed gateway transfers unlink their purchases so the next run retries them.

## 6. Project structure

```
src/
├─ app/
│  ├─ page.tsx                  # Landing page
│  ├─ auth/                     # Email + Google sign-in
│  ├─ c/[slug]/                 # Public shareable course page (the store)
│  ├─ learn/[courseId]/         # Course player + progress
│  ├─ my-courses/               # Buyer dashboard
│  ├─ creator/                  # Studio: courses, sales, payouts, bank
│  ├─ admin/                    # Admin: users, courses, orders, payouts, settings
│  └─ api/
│     ├─ checkout/              # Order creation, verification, test simulator
│     ├─ webhooks/razorpay/     # Signed payment webhooks (source of truth)
│     ├─ auth/google/           # Google OAuth start + callback
│     └─ cron/settle/           # Protected settlement trigger
├─ db/schema.ts                 # Users, courses, lessons, purchases, payouts…
├─ lib/
│  ├─ razorpay.ts               # Orders, signature/webhook verify, RazorpayX payouts
│  ├─ settlement.ts             # The 4:00 PM settlement engine
│  ├─ checkout.ts               # Idempotent mark-paid with duplicate guard
│  └─ server-boot.ts            # Demo seed + node-cron scheduler (16:00 daily)
└─ instrumentation.ts           # Boots seed + scheduler with the server
```

## 7. Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npx drizzle-kit push` | Apply `src/db/schema.ts` to PostgreSQL |
| `npm run typecheck` | TypeScript check |

---

## 8. Deploy to production on Vercel (via GitHub) — click-by-click

The repo is deployment-ready: `.env` is git-ignored (only `.env.example` is committed), `vercel.json` already declares the daily settlement cron, and the app auto-detects Vercel.

### 8.1 Push the code to GitHub

```bash
git init
git add -A
git commit -m "Zybble — initial release"
git branch -M main
```

Then either use the GitHub CLI:

```bash
gh repo create zybble --private --source=. --push
```

…or create the repo manually: <https://github.com/new> → name it `zybble` → **Create repository** → then:

```bash
git remote add origin https://github.com/<your-username>/zybble.git
git push -u origin main
```

### 8.2 Create a production database

Follow **§3.1 (Neon)** to create a hosted PostgreSQL database and copy its pooled connection string — this becomes your production `DATABASE_URL`. (Vercel Postgres or Supabase work identically.)

### 8.3 Apply the schema to the production database

From your own machine (drizzle.config.ts reads `DATABASE_URL` from `.env`):

```bash
# temporarily point .env's DATABASE_URL at the production database, then:
npx drizzle-kit push
psql "$DATABASE_URL" -c "CREATE UNIQUE INDEX IF NOT EXISTS purchases_paid_unique ON purchases (buyer_id, course_id) WHERE status = 'paid';"
```

### 8.4 Import the repo into Vercel

1. Go to <https://vercel.com> → **Log in** → **Continue with GitHub**.
2. Dashboard → **Add New…** → **Project**.
3. Under **Import Git Repository** find `zybble` (click **Adjust GitHub App Permissions** and grant access if it isn't listed) → **Import**.
4. **Framework Preset** shows **Next.js** automatically — leave Build and Output Settings untouched.
5. Expand **Environment Variables** and add these rows (values from §3):

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | Your Neon/production connection string (§3.1) |
   | `AUTH_SECRET` | `openssl rand -base64 32` (§3.2) |
   | `NEXT_PUBLIC_APP_URL` | `https://<your-project>.vercel.app` for now — update to `https://zybble.com` after adding the domain |
   | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | §3.4 (leave empty to stay in test mode) |
   | `RAZORPAY_WEBHOOK_SECRET` | §3.5 |
   | `RAZORPAYX_ACCOUNT_NUMBER` | §3.6 (empty = simulated payouts) |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | §3.7 |
   | `CRON_SECRET` | `openssl rand -base64 24` — **required** (§3.8) |
   | `SETTLEMENT_TZ` | `Asia/Kolkata` |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Your admin login (created on first boot) |
   | `SEED_DEMO` | `false` for a clean production start, `true` to include demo courses |

6. Click **Deploy** and wait ~2 minutes.

### 8.5 The 4:00 PM settlement on Vercel

- `vercel.json` declares it: `path: /api/cron/settle`, `schedule: 30 10 * * *` — cron schedules on Vercel are **UTC**, and `10:30 UTC` = **4:00 PM Asia/Kolkata**. After deploying, see it under **Project → Settings → Cron Jobs**.
- Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET`, so just make sure `CRON_SECRET` is set. (Hobby plans allow one invocation per day — this schedule fits.)
- To change the time, edit the `schedule` in `vercel.json` (UTC) and redeploy. On non-Vercel hosts (`next start`, Docker, VPS) the in-process scheduler arms itself at 16:00 in `SETTLEMENT_TZ` instead — both paths run the same settlement engine.

### 8.6 Post-deploy wiring (2 minutes)

1. **Razorpay webhook** (§3.5): set the URL to `https://<your-domain>/api/webhooks/razorpay`.
2. **Google OAuth** (§3.7): add `https://<your-domain>` as a JavaScript origin and `https://<your-domain>/api/auth/google/callback` as a redirect URI in the Google Cloud console.
3. **Custom domain**: Vercel → **Settings → Domains** → add `zybble.com` → follow the DNS instructions (A record `76.76.21.21` or CNAME `cname.vercel-dns.com`) → HTTPS is automatic. Then update `NEXT_PUBLIC_APP_URL`, the webhook URL, and the Google URIs to the final domain and **Redeploy**.
4. On first request the app seeds the admin account (and demo data unless `SEED_DEMO=false`). Log in at `/auth`.

### 8.7 Verify the deployment

```bash
curl https://<your-domain>/api/health                        # {"ok":true}
curl -X POST https://<your-domain>/api/cron/settle \
  -H "Authorization: Bearer <CRON_SECRET>"                   # settlement summary JSON
```

Make a test purchase (test mode shows the simulated gateway if keys are unset), then press **Run settlement now** in **Admin → Payouts** to see the full pipeline end-to-end.
