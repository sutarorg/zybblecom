export const SITE_ORIGIN = "https://zybble.com";

export interface StaticSeo {
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article";
  robots?: string;
}

/** Public URLs intentionally kept in one place for prerendering, sitemaps and audits. */
export const PUBLIC_MARKETING_ROUTES = [
  "/",
  "/features",
  "/features/lead-finder",
  "/features/lead-enrichment",
  "/features/ai-lead-scoring",
  "/features/ai-email-writer",
  "/features/email-sequences",
  "/pricing",
  "/blog",
  "/blog/build-a-local-lead-list",
  "/blog/cold-email-deliverability-checklist",
  "/blog/how-ai-lead-scoring-works",
  "/about",
  "/privacy",
  "/terms",
] as const;

export const STATIC_SEO: Record<string, StaticSeo> = {
  "/": {
    path: "/",
    title: "Zybble — Find the businesses that need you",
    description:
      "Zybble is an AI-powered lead generation platform that helps you find, enrich and reach your next customers. Start with 100 free leads each month.",
  },
  "/features": {
    path: "/features",
    title: "Features — Zybble | Find, enrich, score and reach customers",
    description:
      "Explore Zybble's lead engine: local lead finder, enrichment, email verification, AI research and scoring, AI email writer and automated follow-up sequences.",
  },
  "/features/lead-finder": {
    path: "/features/lead-finder",
    title: "Local Lead Finder — Find Businesses to Sell To | Zybble",
    description:
      "Search local businesses by industry, location and useful public signals. Zybble returns enriched, deduplicated prospects with 100 free leads each month.",
  },
  "/features/lead-enrichment": {
    path: "/features/lead-enrichment",
    title: "Lead Enrichment & Email Verification | Zybble",
    description:
      "Enrich leads with public business data and find business-published emails with honest statuses: verified, risky, invalid or unknown — never invented addresses.",
  },
  "/features/ai-lead-scoring": {
    path: "/features/ai-lead-scoring",
    title: "AI Lead Scoring Software, Explained | Zybble",
    description:
      "Score leads from 0–100 with transparent, explainable AI. See why each lead earned its score across reputation, reachability and web presence.",
  },
  "/features/ai-email-writer": {
    path: "/features/ai-email-writer",
    title: "AI Cold Email Writer — No Templates, Real Research | Zybble",
    description:
      "Write personalized cold outreach with AI grounded in real lead data. No hallucinated facts, fake flattery or generic templates — edit and send as yourself.",
  },
  "/features/email-sequences": {
    path: "/features/email-sequences",
    title: "Email Sequences & Follow-up Automation | Zybble",
    description:
      "Automated email sequences with stop-on-reply, bounce suppression and one-click unsubscribe built in. Send through your own SMTP connection.",
  },
  "/pricing": {
    path: "/pricing",
    title: "Pricing — Zybble | AI lead generation from $0",
    description:
      "Zybble pricing: Free with 100 leads per month, Growth at $49 per month for 5,000 leads and Agency at $129 per month for 20,000 leads. No contracts.",
  },
  "/blog": {
    path: "/blog",
    title: "Blog — Zybble | Lead generation, deliverability & AI guides",
    description:
      "Practical guides on local lead generation, cold email deliverability and AI-powered prospecting from the Zybble team.",
  },
  "/blog/build-a-local-lead-list": {
    path: "/blog/build-a-local-lead-list",
    title: "How to Build a Local Lead List in 2026 — Zybble Blog",
    description:
      "A practical process for turning a broad market into a focused list of businesses to contact, without buying a stale database.",
    ogType: "article",
  },
  "/blog/cold-email-deliverability-checklist": {
    path: "/blog/cold-email-deliverability-checklist",
    title: "Cold Email Deliverability Checklist for 2026 — Zybble Blog",
    description:
      "A pre-send checklist for cold email deliverability: authentication, list hygiene, pacing, bounce handling and unsubscribe mechanics.",
    ogType: "article",
  },
  "/blog/how-ai-lead-scoring-works": {
    path: "/blog/how-ai-lead-scoring-works",
    title: "What AI Lead Scoring Measures — Zybble Blog",
    description:
      "A clear guide to the public signals behind AI lead scoring, how to validate a model against reply data and when to override it.",
    ogType: "article",
  },
  "/about": {
    path: "/about",
    title: "About Zybble — AI lead generation, simplified",
    description:
      "Zybble helps agencies, founders and sales teams find, understand and reach their next customers. Learn about our principles and data practices.",
  },
  "/privacy": {
    path: "/privacy",
    title: "Privacy Policy — Zybble",
    description:
      "How Zybble collects, uses and protects account data and public business data, including AI processing, subprocessors, retention and user rights.",
  },
  "/terms": {
    path: "/terms",
    title: "Terms of Service — Zybble",
    description:
      "The terms governing use of Zybble: acceptable use, anti-spam requirements, public-data practices, billing, termination and liability.",
  },
  "/404": {
    path: "/404",
    title: "Page not found — Zybble",
    description:
      "The page you're looking for doesn't exist. Explore Zybble's features, pricing or blog instead.",
    robots: "noindex, follow",
  },
};

export function getStaticSeo(path: string): StaticSeo {
  return STATIC_SEO[path] ?? STATIC_SEO["/404"];
}
