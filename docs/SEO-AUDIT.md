# Zybble SEO audit and implementation record

Audit date: 2026-09-18 (UTC)

## Baseline findings

- The site was a Vite/React single-page application. Every direct marketing URL initially returned the same home HTML document, so non-JavaScript crawlers saw the home title, description and canonical URL for every route.
- Route metadata and JSON-LD were applied only in a client `useEffect`. That was not reliable for first-response search appearance or AI crawlers.
- The existing single-file build inlined roughly 900 KB of HTML, CSS and JavaScript and prevented normal immutable asset caching.
- Marketing routes had a manually maintained sitemap and robots policy, but private API/auth paths were not comprehensively excluded from crawling.
- The prior logo/favicon references used a different inline mark from the supplied Zybble SVG.
- Several presentation mocks and marketing sentences used unqualified example numbers or outcome language. Those were changed to descriptive UI labels or qualified guidance; real plan limits remain because they are backed by the product plan definitions.

## Shipped controls

- Production prerendering for all 15 public marketing URLs plus a noindex 404 document. Each response has unique title, description, canonical, robots preview directives, visible HTML content and one validated JSON-LD graph.
- JSON-LD for Organization, WebSite, SoftwareApplication/offers, WebPage/AboutPage/CollectionPage, BreadcrumbList, Blog, Article and relevant FAQPage entities. No ratings, reviews, aggregate scores or testimonials were invented.
- Crawl policy allowing public marketing pages while disallowing `/api/`, authenticated app/auth paths and unsubscribe URLs. The canonical XML sitemap lists only public indexable routes.
- Route-aware Open Graph/Twitter metadata, `metadataBase`-equivalent canonical origin, favicon, Apple touch icon and manifest using the supplied mark.
- Vite production output now uses cacheable chunks instead of a single inlined document. The build includes SSR rendering and an SEO verification gate.
- Static HTML is hydrated with React on the client; existing interactions and visual components remain client-side. A skip link, focus-visible styles, semantic `main` landmarks and crawlable internal links improve accessibility and discovery.
- No `llms.txt` or special AI markup was added: Google’s current guidance says there are no extra AI Overview/AI Mode requirements and that foundational SEO, crawlability, visible text, internal links and page experience remain the correct approach.

## Automated checks

`npm run build` now runs type checking, API emission verification, client build, SSR build, prerendering and `scripts/verify-seo.mjs`. The SEO gate checks route files, unique canonical URLs, titles/descriptions, one H1, robots controls, JSON-LD parseability, sitemap membership, robots exclusions and the new icons.

The frontend/API test suite passes. The worker test suite passes when its documented Python dependencies are installed in the project virtualenv; a bare system Python without `requests` and `dnspython` cannot import the worker tests.
