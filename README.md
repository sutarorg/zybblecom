# Zybble

**Direct course selling for independent creators.** Zybble is a direct course-selling platform — not a marketplace. Creators build courses, publish them to unique URLs (`/c/{slug}`), and share those links anywhere. Buyers purchase only through shared course links; there is no public catalog.

## Stack

- **Next.js 16** (App Router, React 19) + TypeScript
- **PostgreSQL** via **Drizzle ORM**
- **Tailwind CSS v4**
- **Google OAuth 2.0** + email/password auth (scrypt hashing, http-only cookie sessions)
- **Razorpay** checkout (REST orders + HMAC-SHA256 signature verification)

---

# Deployment guide — click by click

You will need accounts on: **GitHub**, **Vercel**, **Neon** (Postgres), **Google Cloud**, and optionally **Razorpay**. Every step below is exact; nothing is assumed.

## Step 1 — Create the GitHub repository

1. Go to <https://github.com> and sign in.
2. Click the **+** icon (top right) → **New repository**.
3. **Repository name:** `zybble` → choose **Private** → **Create repository** (leave "Add a README" unchecked).
4. On your machine, inside this project folder, run the commands GitHub shows:

```bash
git init
git add -A
git commit -m "Zybble — direct course selling platform"
git branch -M main
git remote add origin https://github.com/<your-username>/zybble.git
git push -u origin main
```

> The repo's `.gitignore` already excludes `.env`, `node_modules`, and build output. Your secrets can never be committed by accident. `.env.example` documents every variable.

## Step 2 — Create the PostgreSQL database (Neon)

Any hosted Postgres works; these steps are for Neon (free tier is enough):

1. Go to <https://neon.tech> → **Sign up** (GitHub login is fastest).
2. Click **New Project** → name it `zybble` → pick the region closest to your users → **Create Project**.
3. On the project dashboard, find the **Connection string** box. Select **Pooled connection** (important for serverless) and click **Copy**. It looks like:
   `postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require`
4. Save it — this is your `DATABASE_URL`.

### Apply the database schema

From the project folder on your machine:

```bash
npm install
DATABASE_URL="paste-your-connection-string-here" npx drizzle-kit push --force
```

`drizzle.config.ts` reads `DATABASE_URL` from the environment, so this works from anywhere — no config edits. You should see `Changes applied`. All 9 tables (users, sessions, courses, chapters, lessons, coupons, orders, enrollments, lesson_progress, settlements) now exist.

## Step 3 — Configure Google OAuth

Zybble uses a server-side OAuth 2.0 flow (`/api/auth/google` → Google → `/api/auth/google/callback`). Configure it once; it covers both Login and Sign Up.

### 3a. Create the Google Cloud project

1. Go to <https://console.cloud.google.com> and sign in with the Google account that will own the app.
2. Click the **project selector** (top-left, next to the Google Cloud logo) → **New Project**.
3. Name: `Zybble` → leave organization as-is → **Create**.
4. Wait for the notification, then select the `Zybble` project from the selector.

### 3b. Configure the OAuth consent screen

1. Left menu → **APIs & Services** → **OAuth consent screen**.
2. Select **External** → **Create**.
3. Fill in:
   - **App name:** `Zybble`
   - **User support email:** your email
   - **App logo / domain fields:** optional at this stage
   - **Developer contact information:** your email
4. Click **Save and Continue** (App information) → **Save and Continue** (Scopes — leave untouched; Zybble only requests the open `email`/`profile` scopes) → **Save and Continue** (Test users).
5. **Optional but recommended while the app is in "Testing" status:** on the **Test users** step (or later via **Audience**), click **+ Add users** and add every Gmail address you will test with. In Testing mode, **only listed users can sign in**.
6. When you're ready for the public: **OAuth consent screen** → **Audience** → **Publish app** → **Confirm**. Publishing makes "Continue with Google" work for anyone.

### 3c. Create the OAuth Client ID and Secret

1. Left menu → **Credentials** → **+ Create Credentials** → **OAuth client ID**.
2. **Application type:** `Web application`. **Name:** `Zybble web`.
3. Under **Authorized redirect URIs**, click **+ Add URI** and add **exactly these two** (no trailing slashes — they must match character-for-character):

   ```
   http://localhost:3000/api/auth/google/callback
   https://YOUR-APP-NAME.vercel.app/api/auth/google/callback
   ```

   > You won't know your final Vercel domain until Step 5. Add the localhost URI now, deploy, then come back (Credentials → click "Zybble web") and add the production URI. If you attach a custom domain later, add `https://your-domain.com/api/auth/google/callback` too.
4. Click **Create**. A modal shows your **Client ID** and **Client Secret** → copy both (you can always re-open this later from **Credentials → Zybble web**).

These become `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## Step 4 — Get Razorpay keys (optional, for paid courses)

Without these, free enrollment works and paid checkout shows a clear "payments not configured" message — nothing breaks.

1. Go to <https://dashboard.razorpay.com> → **Sign up** (or sign in).
2. Find the **mode toggle** in the top bar and set it to **Test Mode** (orange).
3. Left menu → **Settings** → **API Keys** → **Generate Test Key**.
4. Copy the **Key Id** (`rzp_test_...`) and **Key Secret** — the secret is shown only once, store it immediately.
5. These become `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.

**To accept real money later:** complete Razorpay account activation (business details in the dashboard), switch the toggle to **Live Mode**, generate a **Live Key**, and replace the two variables.

**No webhook setup is required** — Zybble verifies payments server-side with the HMAC-SHA256 signature returned by checkout.

**Test-mode payments:** open any paid course → **Enroll now** → in the Razorpay modal pay by card with `5267 3181 8797 5449` (Mastercard, domestic) or `4111 1111 1111 1111` (Visa), any future expiry, any CVV → click **Success** on the mock bank page. No real money moves.

## Step 5 — Deploy on Vercel

1. Go to <https://vercel.com> → **Sign Up** → **Continue with GitHub** → authorize Vercel.
2. Dashboard → **Add New…** → **Project**.
3. Under **Import Git Repository**, find `zybble` (click **Adjust GitHub App Permissions** → grant access to the repo if it isn't listed) → **Import**.
4. Vercel auto-detects Next.js; **do not change** framework/build settings.
5. Expand **Environment Variables** and add each row below (Name + Value; leave scope as all environments):

| Name | Where the value comes from | Example |
|------|----------------------------|---------|
| `DATABASE_URL` | Neon dashboard connection string (Step 2) | `postgresql://user:***@host-pooler...?sslmode=require` |
| `GOOGLE_CLIENT_ID` | Google Cloud → Credentials → Zybble web (Step 3c) | `....apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google Cloud → same screen (Step 3c) | `GOCSPX-...` |
| `NEXT_PUBLIC_APP_URL` | Your Vercel production URL: `https://` + the domain shown after this first deploy, **no trailing slash**. For the very first deploy you may enter your best guess (`https://zybble.vercel.app`); correct it in Step 6 if the actual domain differs. | `https://zybble.vercel.app` |
| `RAZORPAY_KEY_ID` | Razorpay dashboard → Settings → API Keys (Step 4) | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay dashboard → same screen (Step 4) | |
| `ADMIN_EMAIL` | The email **you** will sign up with — becomes platform admin | `you@example.com` |
| `APP_SECURE_COOKIES` | Always `true` on Vercel (HTTPS) | `true` |

6. Click **Deploy**. Wait ~1–2 minutes for the build; Vercel shows **Congratulations** with your live URL.
7. **Finished the first deploy?** Confirm the actual production domain (top of the project → **Domains**). If it's different from what you used:
   - Vercel: **Settings** → **Environment Variables** → pencil on `NEXT_PUBLIC_APP_URL` → set the real domain → **Save** → **Deployments** → ⋯ on latest → **Redeploy**.
   - Google Cloud: **Credentials** → **Zybble web** → add `https://REAL-DOMAIN/api/auth/google/callback` to **Authorized redirect URIs** → **Save** (propagates within ~5 minutes).

> **Any future env-var change** on Vercel follows the same pattern: **Settings → Environment Variables → edit → Save → Redeploy** (env changes require a redeploy to take effect).

## Local development setup — click by click

1. Clone: `git clone https://github.com/<you>/zybble.git && cd zybble`
2. Install: `npm install`
3. Create env file: `cp .env.example .env`
4. Open `.env` and fill in:
   - `DATABASE_URL` — Neon string from Step 2, or local Postgres `postgresql://postgres:postgres@127.0.0.1:5432/app_db`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Step 3c values
   - `NEXT_PUBLIC_APP_URL` — `http://localhost:3000`
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — Step 4 test values (optional)
   - `ADMIN_EMAIL` — your email; `APP_SECURE_COOKIES` — keep `false` locally
5. Apply schema: `npx drizzle-kit push`
6. Run: `npm run dev` → open <http://localhost:3000>

## OAuth redirect URLs — exact reference

| Environment | Add to Google Credentials → Authorized redirect URIs | `NEXT_PUBLIC_APP_URL` |
|-------------|-------------------------------------------------------|------------------------|
| Local dev | `http://localhost:3000/api/auth/google/callback` | `http://localhost:3000` |
| Vercel production | `https://YOUR-APP.vercel.app/api/auth/google/callback` | `https://YOUR-APP.vercel.app` |
| Custom domain | `https://your-domain.com/api/auth/google/callback` | `https://your-domain.com` |

Rules: the path is always `/api/auth/google/callback`, **HTTPS only** in production (Google allows plain HTTP for localhost), no trailing slashes, and the value of `NEXT_PUBLIC_APP_URL` must match the origin of the URI you registered. A `redirect_uri_mismatch` error from Google always means these three don't match exactly.

## Final testing steps

**Local (http://localhost:3000):**

1. Landing loads; **Start selling** → `/signup`.
2. **Continue with Google** → choose a Google account → you return logged in → sent to the right surface.
3. Log out; sign up with email + password using your `ADMIN_EMAIL` → you land on `/admin` (you're the admin).
4. Create a second account as a **creator** → **New course** → add one chapter, one video lesson, one PDF lesson → save → set price ₹499 or 0 → **Publish** → **Copy link**.
5. Incognito window → open the course link → sign up as a **buyer** → free course: **Enroll for free** → lands in the player; paid course: checkout with the Razorpay test card above → player opens, progress saves with **Complete & continue**.
6. Creator dashboard shows the order; `/admin/settlements` shows the creator's balance → **Create payout** → **Mark as paid** → creator **Earnings** shows it.

**Production (https://YOUR-APP.vercel.app):**

1. `/api/health` returns `{"ok":true,"db":true,...}`; `/status` shows **All systems operational**.
2. Google sign-in works on both `/login` and `/signup` (if Google shows `access_blocked`, your consent screen is still in Testing — add the user or publish the app).
3. Repeat steps 4–6 above; run one Razorpay **test-mode** purchase end-to-end.
4. Only then switch Razorpay to live keys and run a ₹1 real transaction.

## Troubleshooting

| Symptom | Cause & fix |
|---|---|
| Google shows `Error 400: redirect_uri_mismatch` | The callback URI isn't registered or doesn't match `NEXT_PUBLIC_APP_URL`. Compare character-for-character (https vs http, trailing slash) in Google Cloud → Credentials → Zybble web, then retry after ~5 minutes. |
| `access_blocked: This app hasn't been verified` | Consent screen is in **Testing**. Add the account under **Audience → Test users**, or click **Publish app**. |
| `/login?error=state` | Stale or blocked cookies (often third-party-cookie blocking in incognito). Reload `/login` and sign in again; ensure `APP_SECURE_COOKIES` matches the scheme (`true` only on HTTPS). |
| Paid checkout says payments aren't configured | `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are missing on that environment. Add them (Vercel: Settings → Environment Variables → Redeploy). |
| `/status` shows Database down | `DATABASE_URL` is wrong or the DB is suspended (Neon free tier auto-suspends — it wakes on first query; refresh `/status` after a few seconds). |
| After editing env vars on Vercel nothing changed | Env changes need a redeploy: **Deployments → ⋯ → Redeploy**. |

---

## Architecture notes

```
src/
  app/
    api/auth/google/         # OAuth initiation + callback (state cookie CSRF protection,
                             # code exchange, id_token validation, account linking)
    api/checkout/            # Razorpay order + server-side signature verification
    api/coupons/             # coupon price validation
    api/health               # DB-backed probe (powers /status)
    c/[slug]/                # public course sales page (+ free-preview route)
    dashboard/               # creator studio (overview, builder, orders, earnings)
    learn/                   # student library + course player
    admin/                   # platform admin + settlements/payouts
  lib/auth.ts                # sessions, scrypt hashing, role guards
  lib/actions/*              # server actions — every mutation, Zod-validated
```

- OAuth accounts get `passwordHash = "oauth:google"` (password login disabled for them; Google sign-in links to an existing email account automatically)
- Every paid order splits into 10% platform commission + creator earning; admins batch unsettled earnings into settlements
- Security: http-only state cookie + exact-match CSRF check, `aud`/`exp` ID-token validation, server-side pricing, ownership checks in every mutation, unique constraints on slug/email/enrollment/progress
