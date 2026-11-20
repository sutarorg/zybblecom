# Architecture

Zybble uses the existing Next.js App Router UI. Keep Route Handlers and server-side adapters as the trust boundary; forms never receive provider secrets. Supabase Auth provides email/password identity and cookie refresh. Business roles come from `user_roles`, not token metadata or menu visibility. Next verifies the user and profile before reading private data. All credit mutations remain PostgreSQL transactions; neither client components nor redirects can grant credits.

Implemented locally: schema, Auth and admin session guard, wallet/history reads, geo-localized catalog, and an explicitly gated Dodo test checkout/webhook. Provider wiring is not live-verified. Creator project/media and admin CRUD adapters remain disconnected. The [planning and audit notes](session-5-plan.md) describe the remaining order. There is no separate backend, queue service, or video renderer.
