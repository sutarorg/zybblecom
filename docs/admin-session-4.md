# Admin Dashboard · Session 4

Open `/admin` in the existing Zybble preview. This is a separate internal console with its own navigation and styles, not a replacement for the marketing, account, or creator routes. The frontend preview has no admin session, and its adapters return `unavailable`. It does not read or change private records; unavailable numbers are dashes, not zero. The only disconnected pricing values shown are the public, source-controlled packs with an explicit label. No invented people, transactions, payment volumes, provider events, or charts are seeded.

[Responsive screenshots](session-4-screenshots.jpg) · [Browser QA](../scripts/qa/admin.mjs) · [Typed API contracts](../src/services/admin/contracts.ts)

## Route list

| Route                   | Purpose                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/admin`                | Eight platform totals, chart frames driven by verified series, operational shortcuts and cursor-paginated recent activity. Gross payments are separate by currency.                        |
| `/admin/users`          | Directory: name/email search, country code, status, registration sort, and cursor pagination.                                                                                              |
| `/admin/users/[userId]` | Profile, balance and usage, related projects, purchases/refunds, ledger, internal notes, and role/record-specific actions. Reached from user rows and related-record references.           |
| `/admin/projects`       | Metadata inventory and lifecycle filters. Row details show original-file metadata, not playable content or signed storage URLs.                                                            |
| `/admin/jobs`           | Internal and provider IDs, stage, timing, clip requests, reservation/settlement, and stuck/asset failure filters.                                                                          |
| `/admin/jobs/[jobId]`   | Verified request and provider state, sanitized codes, asset-copy status, retry history, credit settlement, webhook links, and eligible actions. Reached from job rows and related records. |
| `/admin/payments`       | Payment ID/email and date/status filters, Dodo transaction drill-down, refunds/disputes, and separate credit fulfillment. No card data.                                                    |
| `/admin/credits`        | Six credit aggregates, customer lookup, add/deduct workflow and an append-only ledger.                                                                                                     |
| `/admin/webhooks`       | Source, signature, and processing filters; sanitized detail and guarded retry for verified eligible events only.                                                                           |
| `/admin/settings`       | Platform, pricing, credit rules, upload formats and limits, processing caps, support and maintenance. Edits require an eligible section, current revision and audited confirmation.        |
| `/admin/audit-logs`     | Read-only entries by actor, action category, record and date.                                                                                                                              |

Projects, payments and webhooks use row-linked `?inspect=<opaque-id>` drill-downs on their list pages rather than additional top-level routes. They have explicit close/back links. Unknown or inaccessible records are handled separately from an unconnected service. Do not add admin signup or expose internal links on public pages.

## Folder structure and components

```text
src/app/admin/                  App Router pages, layout, loading/error/not-found
src/components/admin/
  chrome.tsx                    Desktop sidebar, mobile modal drawer, breadcrumbs, profile/logout
  ui.tsx                        Heading, Panel, State, Notice, AccessState, Badge, DataList,
                                Records, Pager, RecordRef, DetailLink, AdminLoading
  filters.tsx                   Responsive filter bar/drawer, explicit labels, date validation
  columns.tsx                   Typed domain columns and contextual record links
  listing.tsx                   Reusable table + filter + cursor composition
  action-dialog.tsx             Reason, server review, and separate final confirmation
  settings-editor.tsx           Typed proposals for allowed settings sections
src/services/admin/
  contracts.ts                  Read/command interfaces and safe DTOs
  service.ts                    Fail-closed adapter wrapper, safe errors, confirmation validation
  server.ts, access.ts          Server-only reads, request-local session cache, fixed permission map
  client.ts                     Default-disconnected admin command adapter
  query.ts, format.ts            Query normalization and UTC/currency formatting
src/styles/admin.css             Route-scoped, responsive admin styles
scripts/qa/admin.mjs            Browser navigation, layout, access-state and control checks
scripts/qa/admin-contract.test.tsx  Authorization, safety, formatting and read-only state tests
```

The admin layout uses the existing typeface, tokens and lightning mark. Narrow screens use the navigation and filter dialogs instead of the desktop sidebar. Actual data tables preserve `<th scope>` relationships and use an internal keyboard-focusable scroll region rather than adding page overflow; empty table headers yield to the empty state on phones. Loading is tied to App Router reads rather than an artificial delay.

## API contracts and Session 5 dependencies

No API routes or provider operations were implemented in Session 4. Install a verified server adapter in `src/services/admin/server.ts` and a same-origin authenticated command adapter in `client.ts`. The following are proposed adapter surfaces, not live endpoints:

| Domain    | Typed operations                                                                   | Session 5 dependencies                                                                                                                                                                                                                                                                                      |
| --------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Access    | `getSession`, `logout`                                                             | Supabase SSR session verification, admin role provisioning, revocation/MFA policy, safe cookie refresh, explicit access states. Read permission keys are fixed by operation. UI hiding is not authorization.                                                                                                |
| Overview  | `overview`, `activity`                                                             | Authorized aggregated read model with timestamp, count/credit definitions and gross totals by original currency. Return optional sorted daily series only from verified records, and redact restricted dimensions for lesser roles.                                                                         |
| Customers | `users`, `user`; user intents via commands                                         | Directory indexes, stable cursor queries, country/status normalization, note visibility, account access and financial operations distinct from read access. Suspend/reactivate must safely enforce or restore backend access.                                                                               |
| Projects  | `projects`, `project`                                                              | Authorized metadata DTO; never return raw video URLs, storage keys or transcripts. If private inspection of content is ever needed, add a separate reasoned, audited least-privilege capability.                                                                                                            |
| Jobs      | `jobs`, `job`; reconcile, asset retry, investigate, release, and reprocess intents | Durable job and asset-copy records; ClipSDK polling/webhooks; server-computed stuck/asset failure flags; verified settlement, retry history and idempotency.                                                                                                                                                |
| Payments  | `payments`, `payment`                                                              | Synchronize Dodo payments, refunds and supported dispute events into Supabase. Keep payment state separate from entitlement fulfillment. Use authoritative ISO currency, integer minor units and exponent. Exclude card fields even if the provider returns them. Gross is not net revenue or cash balance. |
| Credits   | `creditTotals`, `ledger`; add/deduct intents                                       | Append-only transactional ledger and computed aggregates. Entries need admin ID, customer ID, previous balance, delta, new balance, reason, UTC time and a stable operation reference. Never rewrite prior entries.                                                                                         |
| Webhooks  | `webhooks`, `webhook`; retry intent                                                | Verify signatures and timestamps on the raw body before processing; keep secrets and raw payloads server-side. Persist deduplication keys and attempts; project allowlisted metadata and safe error codes, never signature values, payment credentials, transcripts or signed URLs.                         |
| Audit     | `audit`                                                                            | Immutable records with actor, action/category, record, reason, timestamp and outcome. Filter by actor/record/date using stable indexes and opaque, bounded cursors.                                                                                                                                         |
| Settings  | `settings`; `update_settings` intent                                               | Real configuration revision and per-section edit permissions. Validate uploads, processing limits, support/maintenance, pack pricing and credits independently. Approval must not retroactively change old purchases. Integrate an explicit publication path before making live changes.                    |

### Authorization and API boundaries

1. Verify session and current membership on every private read and mutation. Leave admin auth unavailable until the backend is wired, then ensure production denies absent or unverified sessions. Do not trust browser role flags, query parameters or a JWT claim without signature, freshness and revocation checks. Use least-privilege grants plus RLS or a private schema with explicit service authorization. Keep elevated keys and provider clients server-side. Role revocation and logout must clear private client/router state.
2. Preserve request-dynamic, `private, no-store`, no-referrer and noindex behavior. Use same-origin CSRF protections for command endpoints, input limits, and rate limits. Query-string filters are bookmarkable, so redact emails, IDs and other search terms in access logs and telemetry. Use inclusive UTC date inputs mapped to a half-open server range. Return bounded pages with cursor tokens scoped to a filter and authorized operator, ordered by sort key plus unique record ID.
3. Every sensitive action is **prepare → review → execute**. `prepare({intent, reason})` validates a reason and eligibility, returning an expiring opaque confirmation ID, target and a safe summary; credit changes include before/delta/after. Reprocessing is unavailable without verified credit impact and an explicit provider-cost quote. `execute({preparedId, requestKey})` must reverify membership/permission, intent, target, current revision, balances and eligibility, and atomically deduplicate the request. An ambiguous browser response reuses the same request key rather than treating the operation as failed or creating a duplicate. Return an immutable audit ID and `queued` or `applied`; refresh read models, never optimistically change balances or job states.
4. Reconciliation queries an **existing** ClipSDK job. An asset-copy retry only retries copying already generated files; it never resubmits clip generation. Release reservations only after verified job and settlement checks. Manual reprocessing requires a separately quoted, authorized and idempotent paid operation; enforce unique active work and reconcile ambiguous provider attempts before reissue. Map real ClipSDK stages; do not infer progress percentages, provider prices, or reservation release from a failed status.
5. Webhook duplicate detection and retries must not double grant credits or double-process jobs. Store validated events durably before acknowledging and reconcile from the provider when events are missing. Retry only a verified, eligible persisted event through a protected command. Give invalid-signature events a minimal metadata-only diagnostic; never let them reach fulfillment. Vercel observability should record safe correlation IDs/stage metrics, not DTO bodies, URLs, email searches, secrets or raw payloads.

### Research reviewed before implementation

- [Next.js authentication and authorization](https://nextjs.org/docs/app/guides/authentication), [Supabase custom claims and RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) and [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): verify near the data source, use explicit permissions, grants and limited profiles.
- [Vercel Observability](https://vercel.com/docs/observability), [ClipSDK job API](https://clipsdk.com/docs/jobs) and [ClipSDK webhooks](https://clipsdk.com/docs/webhooks): distinguish operational states, stage and verified metadata from app-side alerting and asset persistence.
- [Dodo payment reporting API](https://docs.dodopayments.com/api-reference/payments/get-payments) and [Dodo webhooks](https://docs.dodopayments.com/developer-resources/webhooks): synchronized payment reports, explicit fulfillment, signed event verification, duplicates and provider retry semantics.
- [Stripe Dashboard](https://docs.stripe.com/dashboard), [billing credits](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits) and [event deliveries](https://docs.stripe.com/webhooks): separate customer, transaction, credit state and delivery views. No Stripe integration or subscription model is used.
- [GitHub audit logs](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/reviewing-the-audit-log-for-your-organization), [Carbon data tables](https://carbondesignsystem.com/components/data-table/usage/) and [W3C table accessibility](https://www.w3.org/WAI/tutorials/tables/): actor/action/record filtering, disclosure of details, accessible captions and scoped headers. No reference designs or assets were copied.

## QA results

- Production Chromium: **11 admin routes × 8 widths** (320, 375, 390, 430, 768, 1024, 1280 and 1440 px); 16 internal destinations checked. Verified private/no-store and no-referrer headers, noindex, heading count, absence of rows in disconnected mode, and no page overflow, unexpected responses, console errors or browser mutation requests. Selected WCAG A/AA axe checks passed at 390 and 1440, including the mobile drawer and dialogs.
- Opened each route and visually reviewed its phone, tablet and desktop capture after revisions. Confirmed keyboard open/Escape/focus restoration, filter apply/clear, date validation, user registration sort, job/project/payment/webhook/credit/audit filters, read-only safeguards dialog, and the inline project/payment/webhook detail panels. **36 captures** in the ignored `test-results/admin/` directory; a representative sheet is linked above.
- Contract and rendering tests verify missing/expired/denied access does not reach the read adapter, true-empty vs unavailable and permission errors, complete credit/reprocess consequences and status badge text. All **12** admin/account/workspace tests passed. Lint, strict TypeScript, production build and `git diff --check` passed.
- Existing app regressions: 13 creator URLs at eight widths, 17 account/system URLs at eight widths, and 16 marketing states at seven widths. Existing creator setup, account and public navigation still work.
- Lab performance (390 px Chromium, three cold loads per route, 4× CPU throttle, 150 ms latency, ~1.6 Mbps download): median LCP **908 ms** on `/admin`, **904 ms** on `/admin/users`, and CLS **0** in these six disconnected-preview runs. No production field or populated-table performance claim.
- **Not verified end-to-end:** real authorization and role revocation, populated/paginated datasets, live mutations and privileged confirmations, uploads/payments/provider reconciliation, and production telemetry. Contract tests use no rendered fake admin/customer/payment records. Safari, Firefox and manual assistive-technology QA remain open.

```sh
npm run lint && npm run typecheck && npm run build
npx --yes tsx --test scripts/qa/{admin-contract.test.tsx,auth-contract.test.ts,workspace-contract.test.ts}
# With the production build running and browser tooling configured (see Session 2):
node scripts/qa/admin.mjs
node scripts/qa/perf.mjs /admin /admin/users
```
