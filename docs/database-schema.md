# Database schema

See `supabase/migrations/` for implemented types and privileges.

| Area | Relations | Access |
| --- | --- | --- |
| Identity | `profiles`, `user_roles` | Auth trigger syncs email and creates role and zero wallet. Only self profile reads and name edits are granted. No browser role reads or changes. |
| Money | `credit_wallets`, `credit_transactions`, `credit_purchases` | RLS for non-suspended owners; payment/provider IDs and ledger metadata restricted; wallet and ledger writes through transactional RPCs. |
| Creator | `projects`, `media_assets`, `upload_sessions`, `generation_jobs`, `generation_quotes`, `clips` | Composite foreign keys enforce common ownership; safe owner-readable columns, no browser writes. Upload sessions and quotes are server-only. |
| Operations | `webhook_events`, `generation_tasks`, `asset_copy_tasks`, `admin_audit_logs`, `support_requests`, `request_limits` | Server only. Audit is append-only for service role. Task columns model future lease fencing, but no worker claims or sweeps are implemented yet. |

Privileged definer functions use empty `search_path`, qualified relations, and named grants. Read APIs use security invoker and RLS. Tested locally with PostgreSQL and surrogate Supabase roles/claims. `supabase/tests/access.test.sql` is the CLI pgTAP suite; full Supabase CLI execution still awaits Docker or disposable staging. The schema deliberately restricts hard deletion of Auth identities with retained business records; design pseudonymization/retention and test it before launch.
