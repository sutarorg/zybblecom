# API reference

JSON endpoints return `{success:true,data,requestId}` or `{success:false,error:{code},requestId}`, without provider internals. Cookies are same-origin; JSON mutations require the configured Origin. Responses are private/no-store. Callback is a 303 redirect rather than JSON when configured.

| Method | Path                                   | Body/query / guard                                                                              |
| ------ | -------------------------------------- | ----------------------------------------------------------------------------------------------- | --------- | ----------------------------- |
| POST   | `/api/auth/signup`                     | `email`, `password`, `fullName`, `termsAccepted: true`                                          |
| POST   | `/api/auth/login`                      | `email`, `password`                                                                             |
| POST   | `/api/auth/forgot`, `/api/auth/resend` | `email`                                                                                         |
| POST   | `/api/auth/reset`                      | `password`; verified session and signed short-lived recovery cookie                             |
| POST   | `/api/auth/logout`                     | `{}`                                                                                            |
| POST   | `/api/auth/onboarding`                 | Optional allowlisted `contentType`, `goal`; verified user                                       |
| GET    | `/auth/callback`                       | Provider proof; internally rewritten to `/api/auth/callback` when configured; no open redirects |
| POST   | `/api/checkout`                        | `packId`, `requestKey` (UUID); verified user, test checkout gate, server-selected amount        |
| GET    | `/api/credits/wallet`                  | Verified owner; available/reserved/consumed                                                     |
| GET    | `/api/credits/history`                 | Verified owner; optional `filter=all                                                            | purchases | usage` and opaque page cursor |
| POST   | `/api/webhooks/dodo`                   | Raw UTF-8, max 128 KB; three Standard Webhooks headers                                          |

Missing configuration fails closed. Source uploads use the authenticated [`POST /api/uploads`](source-uploads.md) operations. Generation dispatch and reconciliation remain out of scope.

### Creator settings

- `POST /api/settings/profile`: `{ "name": "Creator Name" }`, trimmed and limited to 100 characters. Uses the authenticated user's RLS-scoped profile update and returns `{ name, email }`. No email or avatar mutations.
- `POST /api/settings/preferences`: `{ "defaultAspect": "9:16", "defaultCaptions": "bold" }`, using the existing four ratios and four caption modes. Uses an owner-scoped authenticated RPC and returns the saved choices. Job notification delivery is not implemented and this endpoint does not enable it.

Both endpoints require the configured origin, a verified active account session, JSON request size limits and private/no-store responses. The disconnected preview does not accept writes.

### Archived media and ClipSDK receipts (staging)

- `POST /api/clips/download`: same-origin JSON `{ projectId, clipId, asset }`, where `asset` is `mp4`, `srt`, `vtt`, or `thumbnail`. Only a verified active owner can obtain a short-lived GET link for a ready archive asset attached to a completed, settled job. Missing or inaccessible resources return no signed URL.
- `POST /api/webhooks/clipsdk`: verifies the HMAC over timestamp and exact raw body. Correlates the known provider job and records an idempotent, sanitized terminal receipt. An accepted receipt is **not** a job outcome or a credit transaction. Unknown jobs are retryable rather than bound from incoming data.
- `GET /api/admin/jobs/:jobId/provider`: verified administrator only, with a rate limit. Accepts Zybble's internal job UUID, reads the correlated ClipSDK job, and returns `{ status, stage }`. Does not expose provider URLs, response messages, or usage, and does not update application state.
