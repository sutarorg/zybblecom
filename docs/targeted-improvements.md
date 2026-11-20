# Targeted improvements

This pass preserves the existing purple-and-white site and workspace. It does not activate production checkout or paid generation, change live provider configuration, or deploy anything.

## Creator experience

- The desktop document and intentional scroll surfaces use thin light-gray scrollbars; touch scrolling remains native. The hero loses only its “SHORT PREVIEW” label. Desktop sidebar collapse and expand share one accessible control, placed at the bottom when collapsed. The workspace links use **Credits** and **Help**.
- The project wizard still has three steps. Step 2 keeps the optional 500-character AI guidance and its provider mapping; the duplicate guidance row is removed from Step 3. The original sample image illustrates framing and caption choices, independently of the uploaded file. It does not analyze the speaker. Clean sets the provider caption style to `false`; downloadable SRT/VTT remain separate from burned-in captions. Keep MP4: no verified M4V savings or downstream compatibility justifies changing the export.
- Browser-readable duration produces a preliminary `ceil(seconds / 60)` estimate within the current source limits. Display the actual available wallet independently; missing balance is unknown, not zero. The dashboard redirects a known zero balance before opening the file chooser or accepting a drop. If a local estimate exceeds the wallet, the draft stays in memory while the user visits Credits. No estimated debit occurs.
- The video-link field automatically checks HTTPS, length, credentials, host and path syntax as text is entered or pasted, without a button or network request. Passing that check says nothing about availability, duration, permission, or processing eligibility. The [ClipSDK API reference](https://api.clipsdk.com/llms.txt) documents uploads, clip creation and job status, but no trusted stand-alone duration check was found. Keep link processing disabled. The browser adapter is still download-only: there is no connected owner-scoped project reader, upload verifier, quote endpoint or dispatcher. The existing database reserve is source/owner/expiry-bound and atomic. Do not expose a browser quote or dispatch based on client duration. The remaining path needs an authorized source read, bounded server-side verification, a fresh source/config/billing-bound quote, atomic reservation, and receipt/archive/retry reconciliation. No ClipSDK sandbox, paid cost, or end-to-end output was verified.

## Checkout and configuration gates

| Pack    |  India | Other supported regions | Processing minutes |
| ------- | -----: | ----------------------: | -----------------: |
| Starter |   ₹299 |                      $9 |                 30 |
| Creator |   ₹999 |                     $19 |                120 |
| Studio  | ₹2,499 |                     $39 |                300 |

One catalog controls features on the homepage, pricing pages and credit wallet: up to 20 clips, AI captions, smart vertical framing, MP4 downloads, and non-expiring credits. **Buy Now** uses the existing checkout action with pending and error handling. Login and onboarding retain only an allowlisted pack; returning to Credits does not automatically create an order. Cart, frozen pricing, webhook signature, and idempotent fulfillment remain the authority. Region comes from the existing trusted server path, not a client currency selector.

- **Common:** `APP_ORIGIN` must match the exact active HTTPS origin (local loopback HTTP is allowed). Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `AUTH_STATE_SECRET` where applicable. The secret and auth-state value are server-only. See `.env.example` and `docs/environment-variables.md` for existing aliases and scopes.
- **Dodo:** Keep `DODO_CHECKOUT_ENABLED=0` outside the isolated Preview/Development environment. To test one pair, an approved isolated environment needs `DODO_MODE=test_mode`, `DODO_PAYMENTS_API_KEY`, `DODO_WEBHOOK_SECRET`, and that pair’s unique `DODO_PRODUCT_{STARTER,CREATOR,STUDIO}_{USD,INR}` ID. Production is blocked even if the flag is set. Admin Settings shows per-pair readiness, missing/invalid names, scope, and build commit; it does not reveal values or prove provider acceptance.
- **Scope and freshness:** In Vercel, check Production, Preview (including branch overrides), and Development separately. Changes are captured on a new deployment, not retroactively applied to the active one. Compare the commit on the active deployment and the diagnostics with the intended build and confirm a fresh isolated deployment before testing. The production and preview checkout flags were observed at `0`; the deployed production build was still the base of this branch. No redeploy or live charge was initiated. Sandbox checkout/fulfillment for all six pairs remains unverified. Use only approved test credentials, approved test cards, and synthetic accounts; verify cart/paid facts and replay behavior before broadening access.

## Account and contact

- Signup, reset, and change share the same 8–16 policy with “Use 8–16 characters.” Existing longer passwords remain valid for login and current-password proof. Profile changes require a matching confirmed email and active session, and an independent Supabase password sign-in verifies the current credential even when the provider’s optional current-password setting is off. The proof session is revoked locally at the provider; the original verified session performs the update and revokes other refresh sessions. The loopback fixture does not prove hosted session revocation or hosted mail flows.
- Apply migration `20261120000700_profile_avatar.sql` before using storage. Keep a separate **private** R2 bucket, no public bucket domain, and an access key scoped to that bucket. Set `R2_ACCOUNT_ID`, `R2_AVATAR_BUCKET_NAME`, `R2_AVATAR_ACCESS_KEY_ID`, and `R2_AVATAR_SECRET_ACCESS_KEY` server-side. The upload allows decoded JPEG/PNG/WebP/AVIF within a 4,000,000-byte cap (below the serverless body limit), converts to a 384px WebP, and uses generated owner-specific keys and short-lived signed reads. The browser can preview and cancel without a write. Compare-and-set protects replacement cleanup; failed cleanup needs operator review. Isolated private-migration and bucket smoke test required before enabling storage; no real R2 lifecycle was exercised.
- **Resend:** Verify an owned sender domain or subdomain with the DNS records in Resend. Issue a sending-only API key and set `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` (an address on that domain), and `CONTACT_TO_EMAIL` (production intent: `tejassutar.business@gmail.com`). For isolated QA, use a separately approved test recipient. Incoming requests cannot set the sender or recipient; visitor email is Reply-To. The same-origin route validates the body, rejects the honeypot, applies ingress/global rate limits, and only reports acceptance for a provider response with a message ID. No contact submission record is stored in the app; transmission and provider retention still apply. No real email sent, verified sender or provider acceptance confirmed in this pass.

## Editorial inventory

Nine original drafts are published in the local catalog under **Zybble Editorial Team**. Each has a distinct original 16:9 WebP with specific alt text, source links and relevant Zybble links. The existing search, categories and pagination remain. Article pages emit their own canonical, social image, BlogPosting and breadcrumb data, and appear in the sitemap. The ten-article editorial target is **not met**: one of this session’s ten image generations was needed for the preview. These workflow-focused topics do not cover the full requested comparison/query set. No unsupported rankings or price comparisons are published.

| Slug                           | Focus                                              |
| ------------------------------ | -------------------------------------------------- |
| `repurpose-youtube-video`      | Build a twenty-piece plan from one source video    |
| `podcast-clips`                | Choose and review self-contained excerpts          |
| `short-video-captions`         | Caption styling, accuracy and accessibility        |
| `vertical-video-framing`       | Speaker crop, centered crop and full-frame choices |
| `content-repurposing-workflow` | Small-team intake, review and distribution         |
| `podcast-to-blog-post`         | Turn a transcript into a researched article        |
| `blog-to-linkedin-carousel`    | Convert a single insight into a readable carousel  |
| `agency-video-repurposing`     | Client review, handoff and capacity planning       |
| `video-repurposing-cost`       | Compare monthly cost by visible, usable output     |

These are roughly 1,100–1,180 words each. The requested 1,200–1,800-word range needs further original examples/research, alongside a tenth article with its own generated cover.

## Reproduce and review

- `npm run lint`, `npm run typecheck`, `npm run test:contracts`, `npm run test:db`, `npm run build`; `npm run test:launch` adds local HTTP, visual, interaction, account, dashboard, workspace, studio, admin and route checks. Preserve `NODE_PATH`, `CHROMIUM_PATH`, `ORIGIN`, and `SHOTS` for local browser tooling. On this sandbox Chromium is the available engine; Safari/WebKit, mobile devices, and Firefox are not represented by its viewport sizes.
- `node scripts/qa/targeted-improvements.mjs` against a disconnected local build runs the responsive and editorial checks and records rendered evidence. It uses a real 61-second synthetic WebM instead of a blob labeled as video. `CONNECTED_BROWSER_QA=1 node tests/e2e/media-http.mjs` additionally exercises the wallet and profile UI against a loopback Auth/PostgREST fixture; without the flag it runs the standalone HTTP checks. Neither runs live providers.
- Before/after captures live under the ignored `test-results/targeted-improvements/` directory. The disconnected baseline cannot show a pre-existing blog article or a verified Step 3 draft because neither was present. The fixture screenshots are not production evidence. No screenshots, original image intermediates, or secrets are intended for Git; only optimized product assets and the small synthetic media fixture are included.

### Local verification results

- Lint, TypeScript, all 29 contract tests, the isolated PostgreSQL suite, and the production build passed.
- On the final local production build, the targeted Chromium pass covered 81 route/viewport combinations, decoded the actual sample upload duration, checked preview and navigation, and loaded all nine article pages from the sitemap. The separate interaction suite passed keyboard, FAQ, search/filter/pagination, metadata, contact-failure and pricing assertions.
- The connected loopback fixture passed zero, insufficient, sufficient and unknown wallet cases, draft preservation across Credits, password visibility and legacy/current password enforcement. It did not write to a hosted database, send mail, call Dodo or ClipSDK, or access R2.
- Visual, account, dashboard, workspace, studio and admin suites passed on the final local production build. Before/after images and the connected profile/preview captures were visually reviewed locally.
- The final local route matrix passed 585 page/viewport checks, 12 API handler checks, and four metadata/assets checks. Automated axe checks used WCAG-tagged rules at 390px and 1440px; this is not a conformance certification.

## Follow-up: preview, SEO and editorial (November 20, 2026)

- The new-project page now uses an upload-only source picker. Its **Preview** card uses a clearly labeled sample image and displays the selected format, crop, and caption style. The wizard and preferences now offer Bold, Karaoke, and Minimal only. Existing completed jobs and clips still display their historical Clean values. The summary shows only Estimated cost, with a `0` placeholder before a source is selected; known insufficiency is distinguished from missing verification or a failed balance read.
- Added route-specific titles, descriptions, and keyword metadata to eleven marketing pages. The How It Works, Examples, and Contact descriptions avoid promising link intake, real examples in an empty verified gallery, or a guaranteed reply time. All blog posts have an absolute title, a page-specific description and keywords, and the existing canonical, social image, and sitemap behavior.
- Added ten separate articles and ten optimized 16:9 illustrated covers. The new YouTube article is a numbered worked example and links to the existing source-to-asset guide. Comparisons use vendor documentation and clearly distinguish hypothetical examples and dated public prices from measured results. The Hootsuite article does not assert an unsupported industry-wide migration.
- Read-only Vercel review found the active production deployment at `6550eab`, with `DODO_CHECKOUT_ENABLED=0` scoped to Production and Preview. The implementation also intentionally blocks test checkout in Production. The Credits page now distinguishes those causes from an unavailable regional configuration; authorized admins can check per-pack configuration and see why R2 archive credentials do not connect source uploads. No provider settings were changed and no payment, production upload, or deployment was triggered. Isolated Preview needs its own trusted `APP_ORIGIN`, test keys and product IDs, the switch set to `1` only in that isolated scope, and a fresh deployment. Production selling needs a separately approved and verified live-mode flow and must not reuse test credentials or fulfillment assumptions.

Follow-up QA: lint, TypeScript, 31 contract tests, isolated PostgreSQL, and production build passed. Local Chromium covered the updated workspace behavior, the 19 sitemap articles, all 11 rendered page titles and keyword tags, nine responsive viewport widths, and the isolated zero/insufficient/sufficient/unknown wallet states. The new comparison/workflow articles are concise guides (approximately 455–555 body words each), not long-form expansions.
