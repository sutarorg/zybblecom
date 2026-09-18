import { renderToStaticMarkup } from "react-dom/server";
import { MarketingRouter } from "./App";
import { ARTICLES } from "./marketing/BlogPages";
import { FEATURES } from "./marketing/FeaturesPages";
import {
  getStaticSeo,
  PUBLIC_MARKETING_ROUTES,
  SITE_ORIGIN,
  type StaticSeo,
} from "./seo/siteMetadata";

export { PUBLIC_MARKETING_ROUTES };

export function renderMarketing(path: string): string {
  return renderToStaticMarkup(<MarketingRouter path={path} />);
}

const organization = {
  "@type": "Organization",
  "@id": `${SITE_ORIGIN}/#org`,
  name: "Zybble",
  url: `${SITE_ORIGIN}/`,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_ORIGIN}/logo.svg`,
    width: 938,
    height: 938,
  },
  email: "hello@zybble.com",
  description:
    "Zybble is an AI-powered lead generation and outreach platform that helps businesses find, enrich and reach their next customers.",
};

const website = {
  "@type": "WebSite",
  "@id": `${SITE_ORIGIN}/#website`,
  url: `${SITE_ORIGIN}/`,
  name: "Zybble",
  publisher: { "@id": `${SITE_ORIGIN}/#org` },
  inLanguage: "en",
};

const software = {
  "@type": "SoftwareApplication",
  "@id": `${SITE_ORIGIN}/#software`,
  name: "Zybble",
  url: `${SITE_ORIGIN}/`,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Lead generation software",
  operatingSystem: "Web",
  description:
    "AI-powered lead generation and outreach platform for finding, enriching, researching, scoring and contacting businesses.",
  creator: { "@id": `${SITE_ORIGIN}/#org` },
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      description:
        "100 new leads per month with lead finder, database, email finder and enrichment.",
    },
    {
      "@type": "Offer",
      name: "Growth",
      price: "49",
      priceCurrency: "USD",
      description:
        "5,000 new leads per month plus AI research, scoring, email writing and sequences.",
    },
    {
      "@type": "Offer",
      name: "Agency",
      price: "129",
      priceCurrency: "USD",
      description:
        "20,000 new leads per month with the Growth feature set.",
    },
  ],
};

function breadcrumb(path: string) {
  const parts = path.split("/").filter(Boolean);
  const items = [{ name: "Home", path: "/" }];
  if (parts[0] === "features") items.push({ name: "Features", path: "/features" });
  if (parts[0] === "blog") items.push({ name: "Blog", path: "/blog" });
  if (path === "/pricing") items.push({ name: "Pricing", path: "/pricing" });
  if (path === "/about") items.push({ name: "About", path: "/about" });
  if (path === "/privacy") items.push({ name: "Privacy Policy", path: "/privacy" });
  if (path === "/terms") items.push({ name: "Terms of Service", path: "/terms" });
  if (parts.length > 1 || ["/pricing", "/about", "/privacy", "/terms"].includes(path)) {
    const label = path.startsWith("/features/")
      ? FEATURES.find((feature) => feature.slug === path)?.kicker ?? parts.at(-1)
      : path.startsWith("/blog/")
        ? ARTICLES.find((article) => article.slug === path)?.title ?? parts.at(-1)
        : undefined;
    if (label) items.push({ name: label, path });
  }
  return {
    "@type": "BreadcrumbList",
    "@id": `${SITE_ORIGIN}${path}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_ORIGIN}${item.path}`,
    })),
  };
}

function pageEntity(seo: StaticSeo) {
  const type = seo.path === "/about" ? "AboutPage" : seo.path === "/blog" ? "CollectionPage" : "WebPage";
  return {
    "@type": type,
    "@id": `${SITE_ORIGIN}${seo.path}#webpage`,
    name: seo.title,
    description: seo.description,
    url: `${SITE_ORIGIN}${seo.path}`,
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    inLanguage: "en",
  };
}

function jsonLdFor(path: string, seo: StaticSeo): Record<string, unknown>[] {
  const graph: Record<string, unknown>[] = [organization, website, pageEntity(seo)];
  if (path === "/") graph.push(software);
  graph.push(breadcrumb(path));

  if (path === "/blog") {
    graph.push({
      "@type": "Blog",
      "@id": `${SITE_ORIGIN}/blog#blog`,
      name: "Zybble Blog",
      url: `${SITE_ORIGIN}/blog`,
      publisher: { "@id": `${SITE_ORIGIN}/#org` },
      blogPost: ARTICLES.map((article) => ({
        "@type": "BlogPosting",
        headline: article.title,
        description: article.desc,
        url: `${SITE_ORIGIN}${article.slug}`,
        datePublished: article.dateISO,
        author: { "@id": `${SITE_ORIGIN}/#org` },
      })),
    });
  }

  const article = ARTICLES.find((candidate) => candidate.slug === path);
  if (article) {
    graph.push({
      "@type": "Article",
      "@id": `${SITE_ORIGIN}${path}#article`,
      headline: article.title,
      description: article.desc,
      url: `${SITE_ORIGIN}${path}`,
      datePublished: article.dateISO,
      dateModified: "2026-09-18",
      inLanguage: "en",
      image: `${SITE_ORIGIN}/og.png`,
      author: { "@id": `${SITE_ORIGIN}/#org` },
      publisher: { "@id": `${SITE_ORIGIN}/#org` },
      mainEntityOfPage: { "@id": `${SITE_ORIGIN}${path}#webpage` },
      articleSection: article.category,
    });
  }

  const feature = FEATURES.find((candidate) => candidate.slug === path);
  if (feature) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${SITE_ORIGIN}${path}#faq`,
      mainEntity: feature.faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    });
  }

  return graph;
}

export function getStaticHead(path: string): { seo: StaticSeo; jsonLd: Record<string, unknown>[] } {
  const seo = getStaticSeo(path);
  return { seo, jsonLd: jsonLdFor(path, seo) };
}
