# Zybble

**Direct course selling for independent creators.** Zybble is a direct course-selling platform — not a marketplace. Creators build courses, publish them to unique URLs (`/c/{slug}`), and share those links anywhere. Buyers purchase only through shared course links; there is no public catalog.

## Stack

- **Next.js 16** (App Router, React 19) + TypeScript
- **Supabase Postgres** via **Drizzle ORM**
- **Cloudflare R2** for course video / PDF / resource storage (S3-compatible, presigned direct uploads)
- **Tailwind CSS v4**
- **Google OAuth 2.0** + email/password auth (scrypt hashing, http-only cookie sessions)
- **Razorpay** checkout (REST orders + HMAC-SHA256 signature verification)

---

# Deployment guide — click by click

You will need accounts on: **GitHub**, **Vercel**, **Supabase** (database), **Google Cloud** (sign-in), **Cloudflare** (file storage), and optionally **Razorpay** (payments). Every step below is exact; nothing is assumed.

## Step 1 — Create the GitHub repository

1. Go to <https://github.com> and sign in.
2. Click the **+** icon (top right) → **New repository**.
3. **Repository name:** `zybble` → choose **Private** → **Create repository** (leave "Add a README" unchecked).
4. On your machine, inside this project folder, run:

```bash
git init
git add -A
git commit -m "Zybble — direct course selling platform"
git branch -M main
git remote add origin https://github.com/<your-username>/zybble.git
git push -u origin main
```

> `.gitignore` already excludes `.env`, `node_modules`, and build output, so secrets can never be committed by accident. `.env.example` documents every variable.

## Step 2 — Create the Supabase database

1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub.
2. Click **New project**.
   - **Organization:** pick or create one
   - **Name:** `zybble`
   - **Database Password:** click **Generate a password** → **copy it now** and save it somewhere safe (you cannot view it again; you can only reset it)
   - **Region:** the one closest to your users
3. Click **Create new project** and wait ~2 minutes for provisioning.

### 2a. Create the tables (Supabase SQL Editor)

1. In the left sidebar click **SQL Editor** → **+ New query**.
2. Open the file [`supabase/schema.sql`](./supabase/schema.sql) from this repo, **copy the entire contents**, and paste it into the editor.
3. Click **Run** (or press <kbd>Ctrl/Cmd</kbd> + <kbd>Enter</kbd>).
4. You should see a result grid listing **10 table names** (`chapters`, `courses`, `coupons`, `enrollments`, `lesson_progress`, `lessons`, `orders`, `sessions`, `settlements`, `users`).

The script is **idempotent** — safe to re-run any time to repair the schema. It also enables Row Level Security with no policies on every table, which blocks Supabase's auto-generated public REST API from reading your data while your app (which connects directly as the `postgres` role) keeps full access.

> **Alternative to the SQL Editor:** you can push the schema from the repo instead — `DATABASE_URL="<your string from 2b>" npx drizzle-kit push --force`. Use whichever you prefer; both produce the identical schema.

### 2b. Get the connection string

1. Click **Connect** in the top bar of the Supabase dashboard.
2. Select the **ORMs** tab (or **Connection string** → **Transaction pooler**).
3. Copy the **Transaction pooler** URI — it looks like:

   ```
   postgresql://postgres.abcdefghijklm:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```

4. Replace `[YOUR-PASSWORD]` with the database password from Step 2, then append the connection flags:

   ```
   ?pgbouncer=true&sslmode=require
   ```

   Final value (this is your `DATABASE_URL`):

   ```
   postgresql://postgres.abcdefghijklm:YOURPASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
   ```

> **Why the transaction pooler (port 6543)?** Vercel runs serverless functions that open many short-lived connections. The pooler multiplexes them so you never exhaust Postgres connections. For long-running servers you can use the direct connection on port 5432 instead. If your password contains special characters (`@ : / ? # &`), URL-encode them.

## Step 3 — Configure Google OAuth

Zybble uses its own server-side OAuth 2.0 flow (`/api/auth/google` → Google → `/api/auth/google/callback`). Configure it once; it powers both Login and Sign Up. **You do not need Supabase Auth** — sessions are issued by Zybble.

### 3a. Create the Google Cloud project

1. Go to <https://console.cloud.google.com> and sign in.
2. Click the **project selector** (top-left) → **New Project**.
3. Name: `Zybble` → **Create**, then select the project.

### 3b. Configure the OAuth consent screen

1. Left menu → **APIs & Services** → **OAuth consent screen**.
2. Select **External** → **Create**.
3. Fill in **App name** (`Zybble`), **User support email**, and **Developer contact information**.
4. **Save and Continue** through Scopes (leave untouched — Zybble only requests `openid email profile`) and Test users.
5. While the app is in **Testing**, only listed accounts can sign in: **Audience** → **+ Add users** → add your Gmail addresses.
6. To open it to everyone: **OAuth consent screen** → **Audience** → **Publish app** → **Confirm**.

### 3c. Create the OAuth Client ID and Secret

1. Left menu → **Credentials** → **+ Create Credentials** → **OAuth client ID**.
2. **Application type:** `Web application`; **Name:** `Zybble web`.
3. Under **Authorized redirect URIs** → **+ Add URI**, add **exactly** (no trailing slash):

   ```
   http://localhost:3000/api/auth/google/callback
   https://YOUR-DOMAIN/api/auth/google/callback
   ```

   > You won't know the production domain until Step 6 — add localhost now, deploy, then return here and add the real one.
4. **Create** → copy the **Client ID** and **Client Secret** → these are `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## Step 4 — Set up Cloudflare R2 storage

R2 stores lesson videos, PDFs, cover images, and downloadable resources. Uploads go **directly from the creator's browser to R2** using short-lived presigned URLs, so large video files never pass through Vercel.

> Skip this and Zybble still works — upload buttons explain that storage isn't configured, and creators can paste external URLs (YouTube, Vimeo, Drive) instead.

### 4a. Create the bucket

1. Go to <https://dash.cloudflare.com> → sign in → left sidebar → **R2 Object Storage**.
2. First time only: click **Purchase R2** / **Enable R2** and add a payment method (R2 has a generous always-free tier: 10 GB storage, and **zero egress fees**).
3. Click **Create bucket** → **Bucket name:** `zybble-courses` → choose a **Location** near your users → **Create bucket**.

### 4b. Enable public access for the bucket

Course files are served to enrolled students in the browser, so the bucket needs a public read URL.

1. Open the bucket → **Settings** tab.
2. Find **Public Development URL** → **Enable** → confirm.
3. Copy the URL shown — it looks like `https://pub-1a2b3c4d5e.r2.dev`. That is your `R2_PUBLIC_BASE_URL` (no trailing slash).

> **Production tip:** for a branded, cache-friendly URL, use **Custom Domains** → **Connect Domain** → e.g. `cdn.your-domain.com` (requires the domain to be on Cloudflare DNS). Then set `R2_PUBLIC_BASE_URL=https://cdn.your-domain.com`.

### 4c. Add the CORS policy (required for browser uploads)

1. In the bucket → **Settings** tab → scroll to **CORS Policy** → **Edit** / **Add CORS policy**.
2. Paste this, replacing the domain with yours, then **Save**:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://YOUR-DOMAIN"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

> Missing or wrong CORS is the #1 cause of "Network error during upload" — the origin in `AllowedOrigins` must match your site exactly (scheme + host, no trailing slash).

### 4d. Create the API token

1. Go back to **R2 Object Storage** (bucket list) → right sidebar **API** → **Manage API Tokens** → **Create API Token**.
2. **Token name:** `zybble-uploads`.
3. **Permissions:** select **Object Read & Write**.
4. **Specify bucket(s):** choose **Apply to specific buckets only** → `zybble-courses`.
5. Click **Create API Token**.
6. Copy the **Access Key ID** → `R2_ACCESS_KEY_ID`, and the **Secret Access Key** → `R2_SECRET_ACCESS_KEY` (**shown only once**).
7. Your **Account ID** is on the R2 Overview page (right sidebar) → `R2_ACCOUNT_ID`.

## Step 5 — Get Razorpay keys (optional, for paid courses)

Without these, free enrollment works and paid checkout shows a clear "payments not configured" message.

1. <https://dashboard.razorpay.com> → sign in → set the top-bar toggle to **Test Mode**.
2. **Settings** → **API Keys** → **Generate Test Key**.
3. Copy **Key Id** (`rzp_test_…`) → `RAZORPAY_KEY_ID`, and **Key Secret** → `RAZORPAY_KEY_SECRET` (shown once).

**Going live:** complete Razorpay account activation, switch to **Live Mode**, generate a **Live Key**, and replace both values. **No webhooks required** — Zybble verifies payments server-side via HMAC-SHA256 signature.

**Test-mode card:** `5267 3181 8797 5449` (Mastercard) or `4111 1111 1111 1111` (Visa), any future expiry, any CVV, then click **Success** on the mock bank page.

## Step 6 — Deploy on Vercel

1. <https://vercel.com> → **Sign Up** → **Continue with GitHub** → authorize.
2. **Add New…** → **Project** → find `zybble` under *Import Git Repository* (click **Adjust GitHub App Permissions** if it isn't listed) → **Import**.
3. Vercel auto-detects Next.js — **do not change** build settings.
4. Expand **Environment Variables** and add every row below:

| Name | Where to get it | Example |
|------|-----------------|---------|
| `DATABASE_URL` | Supabase → Connect → Transaction pooler (Step 2b) | `postgresql://postgres.abc:PW@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require` |
| `GOOGLE_CLIENT_ID` | Google Cloud → Credentials (Step 3c) | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google Cloud → Credentials (Step 3c) | `GOCSPX-...` |
| `NEXT_PUBLIC_APP_URL` | Your production URL, no trailing slash | `https://zybble.com` |
| `R2_ACCOUNT_ID` | Cloudflare → R2 Overview → Account ID (Step 4d) | `8f2c…` |
| `R2_ACCESS_KEY_ID` | R2 → Manage API Tokens (Step 4d) | |
| `R2_SECRET_ACCESS_KEY` | R2 → Manage API Tokens (Step 4d) | |
| `R2_BUCKET` | Your bucket name (Step 4a) | `zybble-courses` |
| `R2_PUBLIC_BASE_URL` | R2 bucket public URL (Step 4b) | `https://pub-1a2b3c.r2.dev` |
| `RAZORPAY_KEY_ID` | Razorpay → API Keys (Step 5) | `rzp_test_…` |
| `RAZORPAY_KEY_SECRET` | Razorpay → API Keys (Step 5) | |
| `ADMIN_EMAIL` | The email **you** will sign up with — becomes platform admin | `you@example.com` |
| `APP_SECURE_COOKIES` | Always `true` on Vercel (HTTPS) | `true` |

5. Click **Deploy** and wait ~2 minutes.
6. **After the first deploy**, note your real domain (**Project → Domains**) and finish the loop:
   - **Vercel:** Settings → Environment Variables → set `NEXT_PUBLIC_APP_URL` to the real domain → **Save**.
   - **Google Cloud:** Credentials → `Zybble web` → add `https://REAL-DOMAIN/api/auth/google/callback` → **Save**.
   - **Cloudflare R2:** bucket → Settings → CORS → add `https://REAL-DOMAIN` to `AllowedOrigins` → **Save**.
   - **Vercel:** Deployments → ⋯ on the latest → **Redeploy** (env changes only apply after a redeploy).
7. Open `https://YOUR-DOMAIN/api/health` — it must return `{"ok":true,"db":true,…}`. This probe verifies the **tables exist**, not just connectivity, so a failure here means Step 2a wasn't run against this database.

## Local development setup — click by click

1. `git clone https://github.com/<you>/zybble.git && cd zybble`
2. `npm install`
3. `cp .env.example .env`
4. Edit `.env`:
   - `DATABASE_URL` — the Supabase string from Step 2b (or local Postgres `postgresql://postgres:postgres@127.0.0.1:5432/app_db`)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Step 3c
   - `NEXT_PUBLIC_APP_URL` — `http://localhost:3000`
   - `R2_*` — Step 4 (optional)
   - `RAZORPAY_*` — Step 5 (optional)
   - `ADMIN_EMAIL` — your email; `APP_SECURE_COOKIES` — `false` locally
5. Create the tables: run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor, **or** `npx drizzle-kit push`
6. `npm run dev` → <http://localhost:3000>

## OAuth redirect URLs — exact reference

| Environment | Google → Authorized redirect URIs | `NEXT_PUBLIC_APP_URL` |
|-------------|-----------------------------------|------------------------|
| Local dev | `http://localhost:3000/api/auth/google/callback` | `http://localhost:3000` |
| Vercel | `https://YOUR-APP.vercel.app/api/auth/google/callback` | `https://YOUR-APP.vercel.app` |
| Custom domain | `https://your-domain.com/api/auth/google/callback` | `https://your-domain.com` |

The path is always `/api/auth/google/callback`; HTTPS in production; no trailing slashes; `NEXT_PUBLIC_APP_URL` must match the registered origin exactly. A `redirect_uri_mismatch` error always means these disagree.

## Final testing steps

**Local (http://localhost:3000)**

1. Landing loads → **Start selling** → `/signup`.
2. **Continue with Google** → pick an account → you return signed in.
3. Log out → sign up with email/password using your `ADMIN_EMAIL` → you land on `/admin`.
4. New account as **creator** → **New course** → **upload a cover image** → add a chapter → add a **video lesson and upload an MP4** (watch the progress bar) → add a **PDF lesson and upload a PDF** → attach a **resource file** → Save.
5. Set price ₹499 (or 0) → **Publish** → **Copy link**.
6. Incognito → open the link → sign up as **buyer** → enroll (free instantly, or pay with the Razorpay test card) → the player opens and the uploaded video/PDF plays inline → **Complete & continue** saves progress.
7. Creator **Orders** shows the sale; **Admin → Settlements** → **Create payout** → **Mark as paid** → creator **Earnings** reflects it.

**Production (https://YOUR-DOMAIN)**

1. `/api/health` → `{"ok":true,"db":true,…}`; `/status` → **All systems operational**.
2. Google sign-in works on `/login` and `/signup`.
3. Upload a real video in the builder — confirm it plays from your `R2_PUBLIC_BASE_URL`.
4. Run one Razorpay **test-mode** purchase end to end, then switch to live keys.

## Troubleshooting

| Symptom | Cause & fix |
|---|---|
| Sign-up / log-in / course pages 500 while `/api/health` looks fine | The schema was never created in **this** database. Run `supabase/schema.sql` in the Supabase SQL Editor (Step 2a) against the same project as `DATABASE_URL`, then re-check `/api/health` (it verifies tables exist). |
| Sign-in shows "database hasn't been set up yet" | Same as above — run the SQL script. |
| `password authentication failed` / `Tenant or user not found` | Wrong password or malformed pooler URI. Re-copy from Supabase → **Connect**, replace `[YOUR-PASSWORD]`, and URL-encode special characters. |
| `too many connections` | Use the **transaction pooler** host (port **6543**) with `?pgbouncer=true`, not the direct 5432 host. |
| Google `Error 400: redirect_uri_mismatch` | Registered URI ≠ `NEXT_PUBLIC_APP_URL`. Compare character-for-character in Google Cloud → Credentials, then retry after ~5 min. |
| Google `access_blocked: app not verified` | Consent screen is in **Testing** — add the account under **Audience → Test users**, or **Publish app**. |
| Upload fails with "Network error during upload" | R2 **CORS** doesn't include your exact origin. Bucket → Settings → CORS Policy (Step 4c) → add the origin → Save. |
| Upload fails with 401/403 from storage | R2 API token lacks **Object Read & Write** on this bucket, or `R2_ACCOUNT_ID` / keys are wrong. Recreate the token (Step 4d). |
| Uploaded file returns 404 when played | `R2_PUBLIC_BASE_URL` is wrong or public access is off. Bucket → Settings → **Public Development URL** → Enable, then copy that exact URL. |
| Upload button says storage isn't configured | One or more `R2_*` variables are missing on that environment. Add all five, then **Redeploy**. |
| Paid checkout says payments aren't configured | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` missing → add → **Redeploy**. |
| Env var edits don't take effect | Vercel requires a redeploy: **Deployments → ⋯ → Redeploy**. |

---

## Architecture notes

```
src/
  app/
    api/auth/google/         # OAuth initiation + callback (state-cookie CSRF,
                             # code exchange, id_token validation, account linking)
    api/uploads/presign/     # R2 presigned PUT (auth + ownership + MIME/size limits)
    api/checkout/            # Razorpay order + server-side signature verification
    api/coupons/             # coupon price validation
    api/health               # schema-aware DB probe (powers /status)
    c/[slug]/                # public course sales page (+ free-preview route)
    dashboard/               # creator studio (overview, builder, orders, earnings)
    learn/                   # student library + course player
    admin/                   # platform admin + settlements/payouts
  db/                        # Drizzle client (TLS-aware pool) + schema
  lib/r2.ts                  # R2 client, MIME/size rules, key builder, presigner
  lib/actions/*              # server actions — every mutation, Zod-validated
supabase/schema.sql          # paste-and-run schema for the Supabase SQL Editor
```

**Upload flow:** creator picks a file → `POST /api/uploads/presign` verifies session, creator role, course ownership, MIME type and size → returns a 15-minute presigned PUT URL → the browser uploads straight to R2 with a progress bar → the returned public URL is saved on the lesson/course. Object keys are namespaced `courses/{courseId}/{kind}/{uuid}-{filename}`.

**Security:** RLS enabled on all tables (blocks Supabase's public REST API); scrypt password hashing with constant-time compare; http-only sessions; server-side price computation; HMAC-verified payments; ownership checks in every mutation and upload; unique constraints on slug, email, enrollment, and lesson progress.
