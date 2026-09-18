import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const routes = [
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
];

function fail(message) {
  console.error(`verify-seo: FAIL — ${message}`);
  process.exitCode = 1;
}

function attr(html, name, value) {
  const match = html.match(new RegExp(`<meta\\s+${name}="${value}"\\s+content="([^"]*)"`, "i"));
  return match?.[1] ?? "";
}

function linkHref(html, rel) {
  return html.match(new RegExp(`<link\\s+rel="${rel}"\\s+href="([^"]+)"`, "i"))?.[1] ?? "";
}

for (const route of routes) {
  const file = route === "/" ? path.join(dist, "index.html") : path.join(dist, route.slice(1), "index.html");
  try {
    await access(file);
  } catch {
    fail(`missing prerendered document for ${route}`);
    continue;
  }
  const html = await readFile(file, "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "";
  const description = attr(html, "name", "description");
  const canonical = linkHref(html, "canonical");
  const robots = attr(html, "name", "robots");
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  const jsonScripts = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];

  if (!title) fail(`${route} has no title`);
  if (!description || description.length < 50) fail(`${route} has a missing or thin meta description`);
  if (canonical !== `https://zybble.com${route}`) fail(`${route} has wrong canonical: ${canonical}`);
  if (!robots.includes("max-image-preview:large") || !robots.includes("max-snippet:-1")) fail(`${route} is missing preview controls`);
  if (h1Count !== 1) fail(`${route} should have exactly one h1, found ${h1Count}`);
  if (html.includes('id="boot"')) fail(`${route} still ships the loading-only boot shell instead of HTML content`);
  if (!html.includes('data-prerendered="true"')) fail(`${route} is not marked for hydration`);
  if (jsonScripts.length !== 1) fail(`${route} should have one build-time JSON-LD graph, found ${jsonScripts.length}`);
  for (const script of jsonScripts) {
    try {
      const data = JSON.parse(script[1]);
      if (data["@context"] !== "https://schema.org" || !Array.isArray(data["@graph"])) {
        fail(`${route} has malformed JSON-LD graph`);
      }
    } catch {
      fail(`${route} has invalid JSON-LD`);
    }
  }
}

const notFound = await readFile(path.join(dist, "404.html"), "utf8");
if (!attr(notFound, "name", "robots").includes("noindex")) fail("404.html must be noindex");

const robots = await readFile(path.join(root, "public/robots.txt"), "utf8");
if (!robots.includes("Disallow: /api/")) fail("robots.txt must keep API endpoints out of the crawl queue");
if (!robots.includes("Disallow: /app")) fail("robots.txt must keep the authenticated app out of the crawl queue");
if (!robots.includes("Sitemap: https://zybble.com/sitemap.xml")) fail("robots.txt must reference the canonical sitemap");

const manifest = await readFile(path.join(root, "public/site.webmanifest"), "utf8");
if (!manifest.includes("/logo.svg")) fail("web manifest must use the supplied logo");
await access(path.join(root, "public/logo.svg"));
await access(path.join(root, "public/favicon.svg")).catch(() => fail("missing public/favicon.svg"));

const sitemap = await readFile(path.join(root, "public/sitemap.xml"), "utf8");
for (const route of routes) {
  if (!sitemap.includes(`<loc>https://zybble.com${route}</loc>`)) fail(`sitemap is missing ${route}`);
}
if (sitemap.includes("/404</loc>")) fail("sitemap must not include the noindex 404 document");

if (!process.exitCode) console.log(`verify-seo: OK — ${routes.length} prerendered routes, sitemap, robots, icons and JSON-LD checked`);
