# Private source-video uploads

## Required infrastructure

1. Apply `20261120000800_source_uploads.sql` on the app’s Supabase project. Use an isolated, migrated Supabase project and an isolated R2 bucket for staging. The upload path uses the existing `projects`, `media_assets`, `upload_sessions` and permission model. It does not touch the wallet or reserve credits.
2. In Cloudflare R2 create a **separate private bucket** for sources. Do not enable an `r2.dev` URL or attach a public custom domain. Create an **Object Read & Write** R2 token scoped to **that bucket only**. The credential needs `PutObject`, `HeadObject` and ranged `GetObject`, conditional `CopyObject`, `CreateMultipartUpload`, `UploadPart`, `ListParts`, `CompleteMultipartUpload`, `AbortMultipartUpload`, and `DeleteObject`. It does not need account administration, bucket creation, or access to archive/avatars. Configure CORS and lifecycle rules with an administrator separately, not with the runtime credential.
3. Scope these server variables per deployment: `R2_ACCOUNT_ID`, `R2_SOURCE_BUCKET_NAME`, `R2_SOURCE_ACCESS_KEY_ID`, `R2_SOURCE_SECRET_ACCESS_KEY`, `R2_SOURCE_UPLOAD_ENABLED` (`1` after verification), `CRON_SECRET` (independent random value, at least 32 characters). The existing `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` are **archive read-only** and cannot be used for sources. Use the standard R2 S3 endpoint (no custom/jurisdiction host). Configure auth vars and match `APP_ORIGIN` precisely. Use Vercel’s Node runtime with Fluid Compute supporting the route’s 90-second cap.
4. Set the bucket’s **CORS Policy** for only the exact workspace origin(s) using that bucket. For example, production:

```json
[
  {
    "AllowedOrigins": ["https://zybble.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type", "If-None-Match", "Content-Length"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```

The staging bucket must use the exact staging origin instead. No browser `GET`, `DELETE`, bucket listing, or credentialed R2 fetch is required. Browser-generated `Content-Length` is signed; single PUT also signs `If-None-Match: *`. CORS is not authorization; short-lived signatures are bearer credentials. Never log or share them.

5. Set R2 object lifecycle rules: abort incomplete multipart uploads after **1 day** and delete objects older than **2 days only under `source-staging/`**. Do **not** expire `sources/` using that rule. The daily Vercel cron in `vercel.json` calls `GET /api/uploads/cleanup` with `Authorization: Bearer $CRON_SECRET` and reaps expired sessions and temporary objects in batches. Vercel Preview does not schedule production cron jobs; trigger it manually or through a trusted staging scheduler. Monitor failures and expired-session backlog. The lifecycle is the backstop for late browser writes and unrecorded multipart IDs.

## Flow and bounds

- `/dashboard` selects the local File and opens `/projects/new`, even with a zero balance. The user explicitly clicks **Upload video**. Authentication, confirmed email, onboarding, suspension checks, same-origin JSON and DB-backed quotas apply. A session lasts 24 hours with at most 5 outstanding per user. Limits: 20 starts/resumes, 300 signed parts, 30 finishes and 30 cancellations per user per hour.
- `POST /api/uploads` accepts `policy`, `begin`, `part`, `finish`, or `cancel`. It accepts session UUIDs, never R2 keys, URLs, client-asserted metadata, or provider multipart IDs. Maximum 2,000,000,000 bytes (2 GB). Files up to 16 MiB use a staging PUT; larger files use 16 MiB parts. Each URL allows at most 15 minutes and only the expected length. The same selected File can retry and resume in the workspace session using server-listed parts, including when a browser PUT/finish response is lost. A full browser reload loses the local file and its resume ticket; abandoned sessions expire. Cancellation aborts multipart and cleans temporary storage.
- The server compares actual R2 sizes and ETags (including each multipart part), completes the upload and conditionally copies it to the private `sources/` key. The browser never has a write URL for that sealed key. The Node process then uses bounded R2 range reads with `If-Match` and Mediabunny to demux MP4/MOV/WebM, including actual video packet data and container-derived timestamps and display dimensions. It rejects invalid media or duration over 180 minutes, resolution beyond 8192px per side, and files that cannot be checked within the probe budget. This is format and metadata validation, not a full transcode or malware scan.
- A DB transaction atomically makes the verified asset and project visible. `Projects` uses owner-RLS reads and does not expose object keys; incomplete/cancelled uploads do not appear as successful projects. Uploading does not start paid processing. Generation still requires a server-verified credit quote/reservation and provider dispatch, which this change does not enable.

## Staging acceptance gate (real R2, no test doubles)

Use two onboarded staging accounts; use a real short MP4 and a second valid MP4 larger than 16 MiB, kept outside the repository. Record the zero-balance account’s wallet and ledger. From the dashboard and then directly from `/projects/new`, upload the two sources, observe browser progress, interrupt multipart after part 1, retry/resume, and confirm already accepted parts are not re-sent. Verify these using authorized staging DB/R2 tools: owner-scoped project, source FK, `verified`/`ready` status, R2 content length and ETag, real duration and dimensions, and unchanged balances/transactions. Check that a second account or signed-out browser cannot sign, finish, cancel, or read the first account’s project; verify cancel, replay, expired cleanup, and invalid-media rejection. Do not write secrets, private URLs, cookies, or test media to the repository. This hosted smoke test is **not yet verified**.
