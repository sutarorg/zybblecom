# Deployment gates

No deployment has been performed. This branch is **not production-ready**.

1. Enable existing Supabase and Vercel connections. Use a dedicated non-production Supabase project, Vercel environment/origin, Dodo test products/secret, private R2 bucket and sandbox ClipSDK credentials. Do not reuse secrets or paste them into chat.
2. Apply migrations to local/disposable staging; run `supabase test db`, verify Auth confirmation/recovery templates and SMTP, then test signup through logout and role revocation under real cookies. Set the Auth `site_url` to the exact deployment `APP_ORIGIN` and align allowlists. Never configure production as a preview redirect.
3. Prove all six Dodo products/tax/currency/add-ons in preview and hosted checkout. Run India and non-India sessions; pay for Creator once and replay deliveries. Verify Dodo webhook signing, provider retrievability, ledger, refunds/disputes, and downstream history. Confirm independent retry/reconciliation before accepting live traffic.
4. Implement and verify the video, archival and admin paths in [Video processing](video-processing-flow.md), plus monitoring, retention, replay controls and operational pause switches. Verify Playwright test cases with real staging data isolated from production.
5. Only after security/QA sign-off and owner approval, provision separate production resources and decide on live payments. They cannot be toggled on in this code today.

Operational alerts still needed: webhook lag, pending purchases, explicit review cases, lease expiry, server errors, balance anomalies, provider 429/402 rates and unarchived assets. Never alert with credentials, card details or raw provider payloads. Back up Postgres, document rollback/recovery, and exercise a restore before launch.
