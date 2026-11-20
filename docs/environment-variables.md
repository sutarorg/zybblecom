# Environment variables

Copy `.env.example` to `.env.local` for local development. Deploy secrets through Vercel/Supabase environments, never into client-prefixed variables.

| Key | Notes |
| --- | --- |
| `SITE_URL` | Canonical SEO origin, independent of Auth callback origin |
| `APP_ORIGIN` | Exact app scheme, host and port (no trailing slash); cookie security and same-origin mutation boundary |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Dedicated project settings. Secret restricted to trusted server process |
| `AUTH_STATE_SECRET` | Independent high-entropy secret (minimum 32 characters), for recovery marker and rate-actor hashing |
| `DODO_MODE`, `DODO_CHECKOUT_ENABLED` | `test_mode` and `1` enable checkout only with all provider settings; leave unset by default |
| `DODO_PAYMENTS_API_KEY`, `DODO_WEBHOOK_SECRET` | Test server credentials, not client configuration |
| `DODO_PRODUCT_{STARTER,CREATOR,STUDIO}_{INR,USD}` | Six unique test one-time products with exact gross totals |
| `PRICING_COUNTRY_HEADER` | Explicit trusted-ingress override for QA. Untrusted non-Vercel requests fall back to USD |
| `ZYBBLE_MAINTENANCE` | Maintenance page presentation; not a production mutation kill switch |

No R2 or ClipSDK settings are read yet.
