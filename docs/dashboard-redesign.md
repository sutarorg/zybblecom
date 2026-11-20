# Dashboard visual redesign

**Scope:** `/dashboard` on `arena/b0d00185-zybblecom`, from `68e4d58371aa541d19dbba8036f2076bdb388aeb`. No deployment or provider changes.

## Research and design decisions

- [Awwwards dashboard gallery](https://www.awwwards.com/websites/dashboard/) informed the emphasis on composition and a simple visual motif rather than visual effects. [Linear’s UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui) informed consistent alignment, clear density, and leaving familiar navigation in place.
- [Framer workspaces](https://www.framer.com/help/articles/organizations-workspaces-and-folders/), [Notion navigation](https://www.notion.com/help/navigate-with-the-sidebar) and [Frame.io panels](https://help.frame.io/en/articles/9101032-panel-overview) informed short paths back to projects, recognizable media cards, and separating creation from browsing. [Stripe Dashboard](https://docs.stripe.com/dashboard/basics) informed separating a compact credit summary from detailed activity.
- [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) informed prioritizing file selection and leaving settings for the existing project setup page. [WCAG focus guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) informed keyboard outlines. Text distinguishes unavailable, empty, error, and nonzero or zero balances without relying on color.
- [Next.js server/client boundaries](https://nextjs.org/docs/app/getting-started/server-and-client-components), [React Server Components](https://react.dev/reference/rsc/server-components), [Tailwind states](https://tailwindcss.com/docs/hover-focus-and-other-states), and [Lucide React](https://lucide.dev/guide/react/) informed keeping the dashboard server-rendered, using only CSS for new interactions, and reusing existing SVG icons. No package changes.

The baseline had a large illustrated introduction competing with file selection and equal-weight panels for unrelated work. The redesign uses a compact welcome, an asymmetric upload and guide row, a quieter metrics strip, and separate library and credit surfaces. Decorative film frames and folder tiles are SVG/CSS, not output thumbnails or progress indicators. Container queries respond to the space left by the existing sidebar (including when collapsed). At tablet sizes the library can stack independently of the upload row. All dashboard styles are scoped to `.ws-dashboard`; removed rules were used only by the former dashboard.

## Functionality and evidence

- Unchanged: dashboard Server Component and all six parallel reads; project and activity previews capped at three; actual source images, titles, metadata, statuses, and the existing project open/delete controls; original picker, policy input, and local-draft routing; shell, account menu, logout code, realtime, loading/error model, service contracts, and command adapters.
- Baseline and final production-build Chromium workspace suites: **13 route states × 8 widths**, **19 destinations**, selected axe WCAG checks at 390 and 1440, sidebar collapse/expand, keyboard drawer open/close/focus return, account menu, native chooser, validation, draft persistence/removal, filters and help. No browser console errors or mutation requests. Thirty-six non-dashboard workspace captures at 390/768/1440 were pixel-identical before and after, including project and clip detail unavailable states.
- Dedicated dashboard suite: **320, 375, 390, 430, 768, 1024, 1280, 1440 px**. Checked overflow, 44px browse target within the first viewport, create/project/billing destinations, breadcrumbs, drag feedback, invalid drop, accepted local draft handoff and removal, and truthful disconnected data. Reviewed captures and corrected metric list accessibility, narrow workflow heading wrap, and credit-header alignment before recapturing.
- Lint, TypeScript, Next production build, 14 contract tests, and `git diff --check` passed. The file validation unit test exercises the supplied size cap. No real upload cap was returned by the local service.
- Three cold mobile lab loads per check (390 px, Chromium, 4× CPU throttle, 150 ms RTT, ~1.6 Mbps down). Before median LCP **1048 ms**, final uncontended sample **1020 ms**, CLS **0** in both samples. This is a local smoke check, not proof of a speedup or connected/field metrics.

**Not browser-verified:** authenticated logout, real profiles or populated projects/thumbnail/deletion, real upload policy, successfully empty signed-in accounts, and real credit balances/ledger records. The local build lacked a configured session and the existing server adapter does not supply project/overview/upload data. No account or records were created and no services were changed to produce these states. No Safari, Firefox, or physical device verification.

## Screenshots and reproduction

Final local preview captures, with services unconfigured: [390 px mobile](dashboard-screenshots/390.png), [768 px tablet](dashboard-screenshots/768.png), [1440 px desktop](dashboard-screenshots/1440.png). The eight baseline and final full-size captures were collected in ignored `test-results/dashboard-baseline/` and `test-results/dashboard/`, respectively.

```sh
npm ci
npm run build
npm run start -- --hostname 0.0.0.0 --port 3099
# From another terminal, point ORIGIN and the existing browser harness at local Chromium:
ORIGIN=http://localhost:3099 node scripts/qa/dashboard.mjs
ORIGIN=http://localhost:3099 node scripts/qa/workspace.mjs
```

Changed files: `src/app/(workspace)/dashboard/page.tsx`, `src/styles/workspace.css`, `scripts/qa/dashboard.mjs`, this report, and the three screenshot PNGs linked above.
