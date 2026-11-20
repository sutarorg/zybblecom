# Zybble Marketing

Public marketing website for Zybble, an AI video repurposing product. The site is built with the Next.js App Router, React, strict TypeScript, and Tailwind CSS v4.

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
