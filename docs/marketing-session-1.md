# Zybble marketing — Session 1 handoff

## Pages

| Route             | What’s built                                                                                                                                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`               | Hero with a labeled product illustration, manual publishing destinations, illustrated three-step workflow, feature grid, editing showcase, six audiences, three credit packs and trust indicators, FAQ, and closing CTA. No unverified social proof. |
| `/features`       | Six capability explanations, an anchor index, and a labeled workflow illustration.                                                                                                                                                                   |
| `/how-it-works`   | Three illustrated steps, preparation and review advice, publishing destinations, and workflow FAQs.                                                                                                                                                  |
| `/use-cases`      | Dedicated sections for podcasters, YouTubers, coaches, consultants, agencies, and businesses.                                                                                                                                                        |
| `/examples`       | Gallery renders only verified clips. Until supplied, shows an honest empty state, illustrated workflow, and evaluation checklist.                                                                                                                    |
| `/pricing`        | Exactly three one-time packs, approved INR/USD prices, credits and inclusions, conditions, and purchase FAQs.                                                                                                                                        |
| `/pricing/[pack]` | Review the chosen pack and its local price. Checkout availability is communicated explicitly.                                                                                                                                                        |
| `/blog`           | Query-string search, category filters, featured placement, article cards, pagination, and empty/no-match states.                                                                                                                                     |
| `/blog/[slug]`    | Published article template with author, publication date, reading time, contents, sharing, related articles, metadata and BlogPosting schema. Without approved articles, unregistered slugs return a real 404.                                       |
| `/resources`      | Guide directory and a publishing checklist.                                                                                                                                                                                                          |
| `/help`           | Searchable, filterable help centre with expandable answers.                                                                                                                                                                                          |
| `/contact`        | Required fields, browser validation, local draft confirmation, and an integration seam for real delivery. No draft is sent or persisted.                                                                                                             |
| `/faq`            | Accessible accordion groups for workflow, exports, and pricing.                                                                                                                                                                                      |
| `/login`          | Honest account-access information until authentication exists. No credential collection.                                                                                                                                                             |

## Structure and shared components

```text
src/
  app/                 root layout, metadata routes, error handling
    (marketing)/       public routes and shared navigation shell
  components/
    marketing/         product illustrations, article cards, help search, contact form
    navigation/        wordmark navigation, mobile menu, footer
    pricing/           server-rendered pack grid and PriceDisplay
    sections/          workflow, feature and audience grids, showcase, FAQs, CTA
    shared/            page intro, breadcrumbs, resource cards, empty states, JSON-LD
    ui/                buttons/links, label pills, icon tiles, headings, native accordions
  config/              site, packs, product capabilities, FAQ, editorial inventory
  lib/{pricing,seo,utils}/
  styles/              Tailwind tokens, foundation, and route/section styles
  types/               approved article and video contracts
public/images/         optimized WebP photographs
scripts/qa/            reproducible browser, interaction, and lab checks
```

Server Components render content by default. Mobile navigation, help search, and contact validation use small client boundaries. `src/styles/` holds layout widths, type scale, color tokens, spacing and shared controls. Native disclosures avoid an extra UI runtime. Lucide icons are imported individually; platform marks describe manual publishing destinations, not partnerships or direct publishing integrations.

### Images

The four generated photos are illustrative only; none depicts a Zybble customer or endorsement:

- `public/images/podcast-host-portrait.webp` — portrait used in the hero and editor illustration.
- `public/images/two-person-podcast-studio.webp` — podcast use case.
- `public/images/educator-recording-tutorial.webp` — video-creator use case.
- `public/images/business-interview-studio.webp` — business use case.

The brand social card (`public/social-card.png`) and favicon (`src/app/icon.svg`) are original graphics built for the site, not generated photos. Images use explicit layout geometry and responsive Next.js Image sizing; the hero is preloaded and below-fold images are lazy-loaded. The variable Plus Jakarta Sans font is served locally via `next/font`.

## Pricing and integration contracts

- `src/config/credit-packs.ts` is the source for pack names, inclusions, credit counts, and fixed regional amounts. `PriceDisplay` receives a pack and display currency. `requestPricing` returns `{ countryCode, currency }` using Vercel’s `x-vercel-ip-country` when deployed there. No header or invalid header falls back to USD. A trusted non-Vercel ingress can opt in with `PRICING_COUNTRY_HEADER=1` only if it overwrites the header. No currency toggle, exchange-rate conversion, or client-side price switch.
- **Checkout:** replace the availability information in `/pricing/[pack]` with the approved secure checkout flow. Resolve market, pack, final price and credit grant independently on the server. Confirm taxes, payment methods, and any legal disclosures before accepting payments.
- **Authentication/workspace:** connect `/login` to the production identity and workspace routes. The frontend does not ask visitors for credentials.
- **Contact:** wire `ContactForm` to an approved same-origin endpoint. The form expects a JSON `POST` and treats 2xx as success. Implement server validation, abuse controls, and actual delivery; do not return success before acceptance by that service.
- **Editorial and examples:** put only approved articles and permission-cleared exports in `src/config/editorial.ts` (or connect it to the eventual CMS). Supply WebVTT captions for each clip. Add testimonial or customer proof sections only after permission and verification. Confirm input adapters and any direct publishing integrations before advertising them.
- **Deployment:** set `SITE_URL` to the verified production canonical origin; verify geo headers in production, submit the sitemap in Search Console, and measure live Core Web Vitals after launch.

## SEO and accessibility

- Each published route has its own title, description, self-canonical, Open Graph and social card metadata, one main heading, and descriptive internal links.
- Sitemap, robots.txt, favicon, site and breadcrumb structured data are in place. BlogPosting markup activates with published articles. Empty/filtered blog listings, pack review routes and account access are excluded from indexing; unpublished slugs are excluded from the sitemap and return 404.
- Vercel previews opt out of indexing. Verify canonical hostname and crawler behavior on the deployed production site.
- Semantics, skip link, visible keyboard focus, labeled forms, native details, explicit interactive states, alt text, reduced-motion styles, and forced-colors fallbacks are included. Automated checks do not replace a full WCAG audit.

## QA evidence

- `npm run lint`, `npm run typecheck`, and a regional-pricing production build passed.
- A Chromium run checked **16 route states** at **320, 390, 768, 1024, 1280, 1440, and 1600 px**. Captured 48 full-page screenshots at 390, 768, and 1440 px, plus three homepage viewport shots. Reviewed all routes and the full homepage, adjusted the mobile CTA fit and caption scaling, and reran the captures and checks.
- The final dev-server pass found no horizontal overflow, broken images, unexpected errors, or broken links among 30 discovered internal URLs and anchors. Automated axe checks on the 390 px and 1440 px views reported no violations in the configured WCAG ruleset.
- Interaction checks covered keyboard skip and menu behavior, expandable help answers, search filters, blog query navigation, contact validation and confirmation, pack navigation, all approved prices in both regions, SEO endpoints and 404 behavior. Real payment, account access, live geolocation and message delivery were out of scope.
- Production lab samples in mobile Chromium (390 px, 4× CPU slowdown, 150 ms latency, ~1.6 Mbps down): median LCP was **0.86 s** on `/`, **0.84 s** on `/pricing`, and **0.81 s** on `/help` across three runs per route. Observed CLS was **0.00**. These are local lab results, not field Core Web Vitals; production INP and real-user LCP/CLS are unverified. Safari, Firefox, and assistive-technology testing remain recommended before launch.

### Reproduce browser QA

Install QA tooling outside the app’s dependency tree. With Chromium available, set `CHROMIUM_PATH` if Playwright should use an existing executable instead of its managed browser.

```sh
QA_DEPS=$(mktemp -d)
npm install --prefix "$QA_DEPS" playwright-core axe-core
"$QA_DEPS/node_modules/.bin/playwright-core" install chromium
export NODE_PATH="$QA_DEPS/node_modules"
# In a second terminal:
# PRICING_COUNTRY_HEADER=1 npm run dev -- --port 3000
node scripts/qa/visual.mjs        # writes to ignored test-results/marketing/
node scripts/qa/interaction.mjs   # tests INR header support in the dev environment
# In a second terminal for lab measurements:
# PRICING_COUNTRY_HEADER=1 npm run build
# PRICING_COUNTRY_HEADER=1 npm run start -- --port 3099
node scripts/qa/perf.mjs
```

## Research decisions

- [NN/g: Visual hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/) and [cognitive load in forms](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/) informed the single clear primary action, restrained contrast, three-card comparison, and short labeled contact form. The [Awwwards SaaS directory](https://www.awwwards.com/websites/saas/) was a reference for varied section composition and strong artwork rather than repeated grids. [WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/) informed contrast, keyboard, and interaction decisions.
- [OpusClip](https://www.opus.pro/) and [Vizard pricing](https://vizard.ai/pricing) illustrated common category conventions: content-led workflow communication and credits as a comparison unit. Zybble’s design and copy are original, emphasize one-time billing, and present no unverified customer proof. Keyword intent maps “AI video repurposing” to the homepage, “AI clip generator” to features, “long videos into shorts” to the workflow, and podcast and Shorts queries to useful audience sections rather than thin pages.
- Implementation references: [Next.js App Router](https://nextjs.org/docs/app/getting-started/server-and-client-components), [images](https://nextjs.org/docs/app/getting-started/images), and [metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata); [React](https://react.dev/reference/rsc/server-components); [TypeScript strict](https://www.typescriptlang.org/tsconfig/strict.html); [Tailwind theme](https://tailwindcss.com/docs/theme); [Lucide React](https://lucide.dev/guide/react/); [shadcn/ui](https://ui.shadcn.com/docs); [Vercel request headers](https://vercel.com/docs/headers/request-headers); and [Google Search Central](https://developers.google.com/search/docs/fundamentals/seo-starter-guide). Native controls were sufficient for this scope, so shadcn/ui code was not added.
