import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
const data = JSON.parse(await readFile(join(root, "src/seo/routes.json"), "utf8"));
const failures = [];
const seenTitles = new Set();
const must = (condition, message) => { if (!condition) failures.push(message); };

for (const route of data.routes) {
  const file = join(dist, route.path === "/" ? "index.html" : `${route.path.slice(1)}/index.html`);
  let html = "";
  try { html = await readFile(file, "utf8"); } catch { failures.push(`${route.path}: missing prerendered HTML`); continue; }
  const decode = (value) => value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">");
  const title = decode(html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "");
  const description = decode(html.match(/<meta name="description" content="([^"]+)"/)?.[1] ?? "");
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? "";
  const robots = html.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? "";
  must(title === route.title, `${route.path}: title mismatch`);
  must(!seenTitles.has(title), `${route.path}: duplicate title`);
  seenTitles.add(title);
  must(description === route.description, `${route.path}: description mismatch`);
  must(canonical === `${data.siteUrl}${route.path}`, `${route.path}: canonical mismatch`);
  must(/\bindex\b/.test(robots) && !/noindex/.test(robots), `${route.path}: unexpectedly non-indexable`);
  const jsonScripts = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  must(jsonScripts.length > 0, `${route.path}: missing JSON-LD`);
  for (const match of jsonScripts) {
    try {
      const parsed = JSON.parse(match[1]);
      must(Array.isArray(parsed) || parsed["@context"] || parsed["@graph"], `${route.path}: JSON-LD has no schema context`);
    } catch { failures.push(`${route.path}: invalid JSON-LD`); }
  }
}

const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
must(sitemapUrls.length === data.routes.length, "sitemap: URL count does not match the public route manifest");
for (const route of data.routes) must(sitemapUrls.includes(`${data.siteUrl}${route.path}`), `sitemap: missing ${route.path}`);
const robots = await readFile(join(dist, "robots.txt"), "utf8");
must(robots.includes(`Sitemap: ${data.siteUrl}/sitemap.xml`), "robots: missing sitemap directive");
for (const privatePath of ["/app/", "/api/", "/unsubscribe"]) must(robots.includes(`Disallow: ${privatePath}`), `robots: missing ${privatePath} disallow`);
const notFound = await readFile(join(dist, "404.html"), "utf8");
must(/noindex/.test(notFound) && !/<link rel="canonical"/.test(notFound), "404: should be noindex without a canonical");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`static SEO verification: OK — ${data.routes.length} prerendered routes, JSON-LD, sitemap, robots and 404 checked`);
