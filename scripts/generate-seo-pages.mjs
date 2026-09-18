import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Vite ships one browser entry because the product is an SPA. Generate small,
// route-specific HTML shells after the build so crawlers and social unfurlers
// receive the correct title, description, canonical and JSON-LD without
// waiting for client-side JavaScript. The app still hydrates normally and the
// existing visual design and routing are unchanged.
const pages = [
  ["/", "Zybble — Find the businesses that need you", "Zybble is the AI-powered lead generation platform that finds, enriches and researches your next customers — then helps you reach them. Free plan included."],
  ["/features", "Features — Zybble | Find, enrich, score and reach customers", "Explore Zybble's six-step lead engine: local lead finder, enrichment, email verification, AI research and scoring, AI email writer and automated follow-up sequences."],
  ["/features/lead-finder", "Local Lead Finder — Find Businesses to Sell To | Zybble", "Search local businesses by industry, location and signals that matter. Zybble's lead finder returns enriched, deduplicated prospects in seconds — free 100 leads/month."],
  ["/features/lead-enrichment", "Lead Enrichment & Email Verification | Zybble", "Enrich leads with verified public data and find business-published emails with honest statuses: verified, risky, invalid or unknown — never invented addresses."],
  ["/features/ai-lead-scoring", "AI Lead Scoring Software, Explained | Zybble", "Score leads 0–100 with transparent, explainable AI. See exactly why each lead earned its score — reputation, reachability, web presence — and focus on the top 5%."],
  ["/features/ai-email-writer", "AI Cold Email Writer — No Templates, Real Research | Zybble", "Write personalized cold outreach with AI that's grounded only in real lead data. No hallucinated facts, no fake flattery, no templates — choose the tone and send as yourself."],
  ["/features/email-sequences", "Email Sequences & Follow-up Automation | Zybble", "Automated email sequences with stop-on-reply, bounce suppression and one-click unsubscribe built in. Send through your own SMTP and let follow-ups run themselves."],
  ["/pricing", "Pricing — Zybble | AI lead generation from $0", "Zybble pricing: Free with 100 leads/month, Growth at $49/month for 5,000 leads with AI research, scoring and email automation, Agency at $129/month for 20,000 leads. No contracts, cancel anytime."],
  ["/blog", "Blog — Zybble | Lead generation, deliverability & AI guides", "Practical guides on local lead generation, cold email deliverability and AI-powered prospecting from the Zybble team."],
  ["/blog/build-a-local-lead-list", "How to build a local lead list that actually converts in 2026 — Zybble Blog", "The exact process for turning every SMB in America into 200 businesses that are plausibly waiting for your pitch — without buying a stale database."],
  ["/blog/cold-email-deliverability-checklist", "The cold email deliverability checklist: land in the inbox, not spam (2026) — Zybble Blog", "Deliverability is decided before you write a word. The complete pre-send checklist — DNS records, warm-up math, bounce rules and unsubscribe mechanics — that keeps cold outreach out of the spam folder."],
  ["/blog/how-ai-lead-scoring-works", "What AI lead scoring actually measures — Zybble Blog", "Scores are compressed evidence, not prophecy. A clear-eyed look at the signals that predict fit, how to validate a scoring model and when to override it."],
  ["/about", "About Zybble — AI lead generation, simplified", "Zybble helps agencies, founders and sales teams find, understand and reach their next customers. Learn about our principles, data practices and how to contact us."],
  ["/privacy", "Privacy Policy — Zybble", "Read Zybble's privacy policy and learn how we handle account, business and product data."],
  ["/terms", "Terms of Service — Zybble", "Read the terms that govern use of the Zybble lead generation and outreach platform."],
];

const esc = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const json = (path, title, description) => JSON.stringify({
  "@context": "https://schema.org",
  "@type": path.startsWith("/blog/") ? "Article" : "WebPage",
  "@id": `https://zybble.com${path}#webpage`,
  url: `https://zybble.com${path}`,
  name: title,
  description,
  inLanguage: "en",
  isPartOf: { "@id": "https://zybble.com/#website" },
  publisher: { "@id": "https://zybble.com/#org" },
});

const source = await readFile("dist/index.html", "utf8");
for (const [path, title, description] of pages) {
  let html = source
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/, `$1${esc(description)}$2`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/?>)/, `$1https://zybble.com${path}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*("\s*\/?>)/, `$1${esc(title)}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*("\s*\/?>)/, `$1${esc(description)}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*("\s*\/?>)/, `$1https://zybble.com${path}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*("\s*\/?>)/, `$1${esc(title)}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*("\s*\/?>)/, `$1${esc(description)}$2`)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${json(path, title, description)}</script>`);
  const output = path === "/" ? "dist/index.html" : join("dist", path.slice(1), "index.html");
  await mkdir(join(output, ".."), { recursive: true });
  await writeFile(output, html);
}
console.log(`generate-seo-pages: generated ${pages.length} route shells`);
