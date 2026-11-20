# Environment variables

Copy `.env.example` to `.env.local` for local development. Deploy secrets through Vercel/Supabase environments, never into client-prefixed variables.

| Key                                                               | Notes                                                                                                                                           |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`                                                        | Canonical SEO origin, independent of Auth callback origin                                                                                       |
| `APP_ORIGIN`                                                      | Exact app scheme, host and port (no trailing slash); cookie security and same-origin mutation boundary                                          |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Dedicated project settings. Secret restricted to trusted server process                                                                         |
| `AUTH_STATE_SECRET`                                               | Independent high-entropy secret (minimum 32 characters), for recovery marker and rate-actor hashing                                             |
| `DODO_MODE`, `DODO_CHECKOUT_ENABLED`                              | `test_mode` and `1` enable checkout only with all provider settings; leave unset by default                                                     |
| `DODO_PAYMENTS_API_KEY`, `DODO_WEBHOOK_SECRET`                    | Test server credentials, not client configuration                                                                                               |
| `DODO_PRODUCT_{STARTER,CREATOR,STUDIO}_{INR,USD}`                 | Six unique test one-time products with exact gross totals                                                                                       |
| `PRICING_COUNTRY_HEADER`                                          | Explicit trusted-ingress override for QA. Untrusted non-Vercel requests fall back to USD                                                        |
| `ZYBBLE_MAINTENANCE`                                              | Maintenance page presentation; not a production mutation kill switch                                                                            |
| `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`                                 | Private Cloudflare R2 account and bucket identifiers for archived clips; the endpoint is derived by the server. No custom URL or public bucket. |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`                        | Sensitive bucket-scoped R2 Object Read Only credentials for the current archived-media path.                                                    |
| `CLIPSDK_API_KEY`                                                 | Sensitive bearer key for the administrator-only read of already correlated jobs. Does not enable job submission.                                |
| `CLIPSDK_WEBHOOK_SECRET`                                          | Sensitive signing secret for `POST /api/webhooks/clipsdk`. Include the whole `whsec_` value.                                                    |

Missing configuration disables the affected provider path. These settings do not enable uploads, billable generation, reconciliation, or archiving. See [video processing](video-processing-flow.md) for staging prerequisites.
