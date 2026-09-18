import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const data = JSON.parse(await readFile(join(root, "src/seo/routes.json"), "utf8"));
const base = await readFile(join(dist, "index.html"), "utf8");
const serverDir = join(root, ".prerender");
const serverFile = (await readdir(serverDir)).find((file) => /^entry-server\.(m?js|cjs)$/.test(file));
if (!serverFile) throw new Error("Could not find the SSR entry build in .prerender");
const { renderMarketing } = await import(pathToFileURL(join(serverDir, serverFile)).href);

const routes = new Map(data.routes.map((route) => [route.path, route]));
const articles = data.routes.filter((route) => route.path.startsWith("/blog/") && route.ogType === "article");

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function abs(path) {
  return path.startsWith("http") ? path : `${data.siteUrl}${path}`;
}

function breadcrumb(path) {
  const items = [{ name: "Home", path: "/" }];
  if (path.startsWith("/features/")) items.push({ name: "Features", path: "/features" });
  if (path.startsWith("/blog/")) items.push({ name: "Blog", path: "/blog" });
  const route = routes.get(path);
  if (route && path !== "/") items.push({ name: route.title.split(" | ")[0].split(" & ")[0], path });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: abs(item.path),
    })),
  };
}

function baseGraph() {
  return [
    {
      "@type": "Organization",
      "@id": `${data.siteUrl}/#organization`,
      name: "Zybble",
      url: `${data.siteUrl}/`,
      logo: { "@type": "ImageObject", url: `${data.siteUrl}/zybble-mark.svg` },
      email: "hello@zybble.com",
      description: "Zybble provides AI lead generation and sales prospecting software for B2B teams.",
    },
    {
      "@type": "WebSite",
      "@id": `${data.siteUrl}/#website`,
      url: `${data.siteUrl}/`,
      name: "Zybble",
      publisher: { "@id": `${data.siteUrl}/#organization` },
      inLanguage: "en",
    },
  ];
}

function jsonLdFor(path, route) {
  if (path === "/") {
    return [
      {
        "@context": "https://schema.org",
        "@graph": [
          ...baseGraph(),
          {
            "@type": "SoftwareApplication",
            "@id": `${data.siteUrl}/#software`,
            name: "Zybble",
            url: data.siteUrl,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: "AI-powered lead generation and sales prospecting software for finding, enriching and reaching business leads.",
            creator: { "@id": `${data.siteUrl}/#organization` },
          },
        ],
      },
    ];
  }

  const schemas = [breadcrumb(path)];
  if (path === "/pricing") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        ["Is there a free plan?", "Yes. Zybble offers a Free plan with 100 new leads per month and core finding, enrichment and email verification features."],
        ["Can I cancel a paid plan?", "Yes. Paid plans can be cancelled and access continues through the current billing period."],
      ].map(([name, text]) => ({
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text },
      })),
    });
  } else if (path.startsWith("/features/")) {
    const featureFaq = {
      "/features/lead-finder": ["How many leads can I find per month?", "Free includes 100 new leads monthly, Growth 5,000 and Agency 20,000. Only genuinely new, deduplicated businesses count against the quota."],
      "/features/lead-enrichment": ["Does Zybble ever guess email addresses?", "Never. If an email pattern was not actually published by the business, it does not appear as a lead."],
      "/features/ai-lead-scoring": ["Can I see why a lead scored the way it did?", "Always. Every score stores its reasoning alongside it, written from the lead's actual data points."],
      "/features/ai-email-writer": ["Does it invent results for my company?", "No. The writer references only what the business itself can verify plus the sender name and company you set in your profile."],
      "/features/email-sequences": ["What happens when someone replies?", "The sequence stops for that recipient immediately, and the reply is logged in the campaign feed so you can take over the conversation personally."],
    }[path];
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: route.title,
      description: route.description,
      url: abs(path),
      isPartOf: { "@id": `${data.siteUrl}/#website` },
    });
    if (featureFaq) schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: featureFaq[0], acceptedAnswer: { "@type": "Answer", text: featureFaq[1] } }],
    });
  } else if (path === "/blog") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Zybble Blog",
      url: abs(path),
      publisher: { "@id": `${data.siteUrl}/#organization` },
      blogPost: articles.map((article) => ({
        "@type": "BlogPosting",
        headline: article.title.replace(/ \| Zybble$/, ""),
        description: article.description,
        url: abs(article.path),
        datePublished: article.lastmod,
        dateModified: article.lastmod,
      })),
    });
  } else if (path.startsWith("/blog/")) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: route.title.replace(/ \| Zybble$/, ""),
      description: route.description,
      url: abs(path),
      datePublished: route.lastmod,
      dateModified: route.lastmod,
      inLanguage: "en",
      image: abs(data.defaultImage),
      author: { "@id": `${data.siteUrl}/#organization` },
      publisher: { "@id": `${data.siteUrl}/#organization` },
      mainEntityOfPage: { "@type": "WebPage", "@id": abs(path) },
    });
  } else if (path === "/about") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: route.title,
      description: route.description,
      url: abs(path),
      isPartOf: { "@id": `${data.siteUrl}/#website` },
    });
  } else {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: route.title,
      description: route.description,
      url: abs(path),
      isPartOf: { "@id": `${data.siteUrl}/#website` },
    });
  }
  return [
    { "@context": "https://schema.org", "@graph": baseGraph() },
    ...schemas,
  ];
}

function seoHead(route, path, { notFound = false } = {}) {
  const title = notFound ? "Page not found | Zybble" : route.title;
  const description = notFound
    ? "The page you requested could not be found. Explore Zybble's features, pricing and lead generation guides."
    : route.description;
  const canonical = abs(path);
  const robots = notFound ? "noindex, follow, noarchive, nosnippet" : "index, follow, max-image-preview:large, max-snippet:-1";
  const image = abs(data.defaultImage);
  const jsonld = notFound ? [] : jsonLdFor(path, route);
  const verification = process.env.VITE_GOOGLE_SITE_VERIFICATION;
  return `<!-- SEO_START -->
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="robots" content="${robots}" />
    <meta name="googlebot" content="${robots}" />
    <meta name="author" content="Zybble, Inc." />
    ${notFound ? "" : `<link rel="canonical" href="${canonical}" />\n    <link rel="alternate" hreflang="en" href="${canonical}" />`}
    <meta name="theme-color" content="#f5f4f1" />
    <meta name="color-scheme" content="light" />
    <meta property="og:type" content="${route.ogType ?? "website"}" />
    <meta property="og:site_name" content="Zybble" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:alt" content="${esc(title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${image}" />
    <meta name="twitter:image:alt" content="${esc(title)}" />
    ${verification ? `<meta name="google-site-verification" content="${esc(verification)}" />` : ""}
    <script type="application/ld+json" data-static-seo-jsonld>${JSON.stringify(jsonld)}</script>
    <!-- SEO_END -->`;
}

function renderDocument(path, route, body, options = {}) {
  return base
    .replace(/<!-- SEO_START -->[\s\S]*?<!-- SEO_END -->/, seoHead(route, path, options))
    .replace("<!--app-html-->", body);
}

for (const route of data.routes) {
  const body = renderMarketing(route.path);
  const output = join(dist, route.path === "/" ? "index.html" : `${route.path.slice(1)}/index.html`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, renderDocument(route.path, route, body), "utf8");
}

const notFoundBody = renderMarketing("/404");
await writeFile(join(dist, "404.html"), renderDocument("/404", { ...data.routes[0], ogType: "website" }, notFoundBody, { notFound: true }), "utf8");
console.log(`prerender: ${data.routes.length} public routes + 404`);
