import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const outDir = process.argv[2] ? join(root, process.argv[2]) : join(root, "dist");
const data = JSON.parse(await readFile(join(root, "src/seo/routes.json"), "utf8"));
const xml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const urls = data.routes.map((route) => `  <url>
    <loc>${xml(`${data.siteUrl}${route.path}`)}</loc>
    <lastmod>${route.lastmod}</lastmod>${route.changefreq ? `
    <changefreq>${route.changefreq}</changefreq>` : ""}${route.priority ? `
    <priority>${route.priority}</priority>` : ""}
  </url>`).join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const robots = `# Zybble robots.txt — public marketing URLs are crawlable.
User-agent: *
Allow: /

# Private application, authentication, unsubscribe tokens and API responses.
Disallow: /app/
Disallow: /login
Disallow: /signup
Disallow: /forgot
Disallow: /reset
Disallow: /unsubscribe
Disallow: /api/
Disallow: /*?

Sitemap: ${data.siteUrl}/sitemap.xml
`;

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "sitemap.xml"), sitemap, "utf8");
await writeFile(join(outDir, "robots.txt"), robots, "utf8");
console.log(`seo: generated sitemap.xml (${data.routes.length} canonical URLs) and robots.txt`);
