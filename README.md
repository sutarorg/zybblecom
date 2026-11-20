# Zybble

Zybble is an AI video repurposing product built with the Next.js App Router, React, TypeScript and Tailwind CSS. The existing UI runs without providers; this branch adds a database, account and test-billing foundation. It is not a deployed or fully verified SaaS.

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm run build
```

Use Node.js 22 or later. `npm run dev -- --hostname 0.0.0.0` exposes a sandbox preview. Copy `.env.example` to `.env.local` if you need to set the canonical origin or test trusted country headers. No external service or account is needed to run the website.

See [the Session 1 handoff](docs/marketing-session-1.md) for the route map, design components, content rules, test results, and integration plan.

See [the Session 2 handoff](docs/account-session-2.md) for the account, onboarding, checkout-result, and system UI, browser QA, and the backend integration contracts.
See [the Session 3 workspace handoff](docs/workspace-session-3.md) for the creator routes, responsive screenshots, QA, and Session 5 integration checkpoints.
See [the Session 4 admin handoff](docs/admin-session-4.md) for the internal console, API contracts, screenshots, and backend requirements.

## Backend integration status

- [Plan and repo audit](docs/session-5-plan.md) · [Local test results](docs/session-5-verification.md)
- [Architecture](docs/architecture.md) · [Schema](docs/database-schema.md) · [API](docs/api-reference.md)
- [Payments](docs/payment-flow.md) · [Credits](docs/credit-system.md) · [Video processing status](docs/video-processing-flow.md)
- [Environment](docs/environment-variables.md) · [Security](docs/security.md) · [Deployment gates](docs/deployment.md)

`npm run test:db` starts an isolated embedded PostgreSQL server and uses separate clients for concurrency checks (run as a non-root user). `npm run test:contracts` runs UI and provider contract checks. `supabase test db` requires a working local Supabase CLI stack and runs the separate pgTAP grant suite. Neither local command proves a hosted payment, account, or video run.
