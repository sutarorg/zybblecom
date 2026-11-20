# Zybble account and system frontend — Session 2 handoff

This extends the Session 1 app. The public marketing routes, credit packs, typography, and design primitives remain in place. No identity provider, payment processor, email service, analytics, or new runtime dependency was added.

[Representative screenshots](session-2-screenshots.jpg)

## Completed routes

| Route                                    | Frontend behavior                                                                                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`                                 | Email/password form, visibility toggle, inline validation, and recovery/signup links. No remember-me control. Verified login responses route to onboarding or dashboard; there is no login success in the unconnected preview.        |
| `/signup`                                | Name, email, unique passphrase guidance, visibility, and terms acknowledgement. No duplicate password field; the reset flow uses confirmation. Verification guidance only appears as a submission result after an accepted request.   |
| `/forgot-password`                       | Validated email input. The accepted state gives the same confirmation regardless of whether an account exists; the preview explicitly says nothing was sent.                                                                          |
| `/reset-password`                        | New password and confirmation with mismatch feedback and visibility. The form is gated by a verified recovery session. A direct visit shows recovery guidance instead.                                                                |
| `/verify-email`                          | Inbox/spam guidance, resend with server-provided cooldown, signup link if the address needs correction, and distinct expired and verified views.                                                                                      |
| `/auth/callback`                         | Loading and link status. A verified result routes to dashboard/onboarding, verification, or password reset; arbitrary URL destinations are ignored. Invalid and expired links and sessions have safe recovery paths.                  |
| `/onboarding`                            | Four steps: welcome, content type, main goal, and finish. Both questions are optional. Back navigation preserves choices; skipping clears that choice. A verified completed session bypasses the flow. Preview choices are transient. |
| `/checkout/success`                      | Neutral confirmation and purchase summary until the server verifies the payment **and** credit grant. Confirmed pack, amount, and credits can only come from the trusted status adapter.                                              |
| `/checkout/cancelled`, `/checkout/retry` | Clear status wording plus pricing and history links. Retry returns to a credit-pack review without starting a second payment.                                                                                                         |
| `/404`, `/unauthorized`, `/maintenance`  | Branded HTTP 404, access guidance, and service notice. The maintenance page shows interruption only when `ZYBBLE_MAINTENANCE=1`; it does not gate the rest of the site.                                                               |
| `/dashboard`, `/dashboard/purchases`     | Stable destinations with honest availability states. No dashboard data, balances, user profiles, or transactions are fabricated.                                                                                                      |
| `/privacy`, `/terms`                     | Clearly labeled notices describing this preview, not production legal documents.                                                                                                                                                      |

## Components and states

- `src/components/account/`: responsive `AccountFrame` and `AccountHeading`, shared `AuthForm` and password input, and the onboarding wizard. Reuses the original podcast portrait and Zybble’s wordmark, tokens, buttons, icon tiles, and typeface.
- `src/components/system/`: `SystemLayout`, `SystemPanel`, `PaymentResult`, `ServiceUnavailable`, `ApplicationError`, `RetryButton`, `PageLoader`, `PendingButton`, and `DashboardSkeleton`. Next.js loading boundaries and Suspense cover navigation, dashboard, checkout status, and callback verification. React transitions handle retries and post-submit navigation.
- The form supports blank, focused, invalid, submitting, disabled, unavailable, network, invalid-credentials, verification-required, and accepted states. Expired recovery/verification, unauthorized, and rate-limited outcomes have explicit frontend messages. A success UI is conditional on a real successful adapter result. Forms do not store credentials in browser storage, and they cannot perform a native credential submit when JavaScript is disabled.
- Root, global, and route-group error boundaries offer retry, dashboard, and support without rendering exception details. No synthetic error route ships.

## Session 5 integration contract

`src/lib/services/contracts.ts` defines `FrontendServices` and the discriminated `ServiceResult<T>`. The factory in `src/lib/services/index.ts` validates requests, normalizes transport failures, and defaults to `unavailable`. `validation.ts` contains shared field checks; `messages.ts` maps stable error codes to public copy. There is no network adapter installed.

| Service methods                                                  | Backend work                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `signup`, `login`, `logout`, `getSession`                        | Wire the browser-safe adapter through same-origin endpoints; keep provider/session handling server-side. Return only the minimal session summary. Configure the password policy, decide session lifetime, and replace the preview legal notices before enabling registrations.                                                                 |
| `requestPasswordRecovery`, `getRecoveryState`, `resetPassword`   | Deliver recovery email with a neutral response for all addresses. Validate the recovery grant, enforce expiry and single use, and define session revocation and password-change notification.                                                                                                                                                  |
| `resendVerification`, `getEmailVerification`, `completeCallback` | Configure SMTP, email templates, allowed callback destinations, and server-side verification or PKCE exchange. Use an actual server route to exchange codes and set cookies before redirecting to a clean URL; the current callback page cannot set cookies from a Server Component. Rate limiting and resend time must be server-enforced.    |
| `completeOnboarding`                                             | Persist optional preferences and completion for the authenticated user. The server should avoid repeating onboarding after completion and support a fresh login on expired sessions.                                                                                                                                                           |
| `createCheckout`, `getPaymentStatus`                             | Authorize access, bind a checkout to the signed-in account, resolve price/currency from the approved config, and grant credits idempotently only on verified Dodo webhook processing. A returned reference is only a lookup key. Make status responses private and uncached, and attach real checkout and purchase-history screens when ready. |

Auth, system, and review routes are not in the marketing sitemap. Callback and sensitive result routes use no-referrer/private no-store headers. Frontend states do not provide real authorization. Configure independent Vercel preview and production credentials, validate cookies and redirect URLs in both environments, and keep all provider secrets on the server.

## Verification

- `npm run lint`, route type generation, strict TypeScript, and the production build passed. Three contract tests cover the reset validator, no-success behavior of the unconnected service, and validation/error mapping.
- Chromium checked all 17 route states at **320, 375, 390, 430, 768, 1024, 1280, and 1440 px**, including all four onboarding steps. No overflow, missing images, unexpected response or browser errors, or broken links among 16 discovered account/system links in the final production run. Axe reported no violations in the selected rules at 390 and 1440 px.
- Capture count: **67 screenshots** across 390, 768, and 1440 px, including validation, maintenance, and an application error. Reviewed the layouts, refined the photo-panel text and form notice, then recaptured. Full captures are local QA output under `test-results/account/`; the representative contact sheet is included in this handoff.
- Tested keyboard submit/focus, password toggles, signup/forgot/resend validation, skip/back onboarding behavior, a real segment error and retry using a temporary local route, and reset mismatch feedback through an isolated form render. Both temporary routes were removed. Verified the no-JavaScript disabled form, maintenance gating, and that unverified redirect parameters cannot claim a payment or grant credits. No production credentials were entered and the forms made no credential POSTs.
- Reran Session 1’s production marketing suite at seven widths: 16 route states and **34 links/anchors** passed, with no regressions detected by that suite.
- Actual email delivery, account creation, verification, recovery grants and successful password reset, provider checkout, webhook fulfillment, and persistent onboarding cannot be exercised end-to-end without the Session 5 backend. Safari, Firefox, and manual assistive-technology checks are still recommended.

### Run the checks

```sh
npm run lint
npx next typegen
npm run typecheck
npx --yes tsx --test scripts/qa/auth-contract.test.ts
npm run build
# Then run npm run start -- --port 3099 in another terminal.
# Browser tooling setup is in docs/marketing-session-1.md.
ORIGIN=http://localhost:3099 node scripts/qa/account.mjs
ORIGIN=http://localhost:3099 node scripts/qa/visual.mjs
```

## Research used

[Baymard sign-in UX](https://baymard.com/blog/simplifying-sign-in), [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/), [WAI form notifications](https://www.w3.org/WAI/tutorials/forms/notifications/), and [OWASP recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) informed concise forms, optional preferences, actionable field errors, and neutral recovery. For the integration seam: [Supabase password auth](https://supabase.com/docs/guides/auth/passwords), [passwordless comparison](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs), [Next.js loading](https://nextjs.org/docs/app/api-reference/file-conventions/loading), [error handling](https://nextjs.org/docs/app/getting-started/error-handling), [React transitions](https://react.dev/reference/react/useTransition), [Dodo webhooks](https://docs.dodopayments.com/developer-resources/webhooks), and [Vercel environments](https://vercel.com/docs/deployments/environments).
