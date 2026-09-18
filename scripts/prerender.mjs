import { mkdir, readFile, writeFile, cp } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const dist = path.join(root, "dist");
const template = await readFile(path.join(dist, "index.html"), "utf8");
const renderer = await import(pathToFileURL(path.join(root, ".ssr-build", "prerender.mjs")));

const routes = [...renderer.PUBLIC_MARKETING_ROUTES, "/404"];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceTag(html, pattern, replacement) {
  return html.replace(pattern, replacement);
}

function replaceRoot(html, body) {
  const open = '<div id="root">';
  const start = html.indexOf(open);
  if (start === -1) throw new Error("prerender: root element not found");
  let depth = 0;
  let cursor = start;
  const tag = /<\/?div\b[^>]*>/gi;
  let match;
  while ((match = tag.exec(html.slice(start))) !== null) {
    if (match[0].startsWith("</")) depth -= 1;
    else depth += 1;
    if (depth === 0) {
      cursor = start + match.index + match[0].length;
      break;
    }
  }
  if (depth !== 0) throw new Error("prerender: root element is not balanced");
  return `${html.slice(0, start)}<div id="root" data-prerendered="true">${body}</div>${html.slice(cursor)}`;
}

function withHead(html, pathName) {
  const { seo, jsonLd } = renderer.getStaticHead(pathName);
  const title = escapeHtml(seo.title);
  const description = escapeHtml(seo.description);
  const canonical = `https://zybble.com${seo.path}`;
  const robots = seo.robots ?? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  let output = html;

  output = replaceTag(output, /<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  output = replaceTag(output, /<meta name="description"[^>]*>/i, `<meta name="description" content="${description}" />`);
  output = replaceTag(output, /<meta name="robots"[^>]*>/i, `<meta name="robots" content="${escapeHtml(robots)}" />`);
  output = replaceTag(output, /<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${title}" />`);
  output = replaceTag(output, /<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${description}" />`);
  output = replaceTag(output, /<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${canonical}" />`);
  output = replaceTag(output, /<meta property="og:type"[^>]*>/i, `<meta property="og:type" content="${seo.ogType ?? "website"}" />`);
  output = replaceTag(output, /<meta name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${title}" />`);
  output = replaceTag(output, /<meta name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${description}" />`);
  output = replaceTag(output, /<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}" />`);
  output = output.replace(/<!-- STATIC_JSON_LD_START -->[\s\S]*?<!-- STATIC_JSON_LD_END -->/i, `<!-- STATIC_JSON_LD_START --><script type="application/ld+json" data-static-jsonld="true">${JSON.stringify({ "@context": "https://schema.org", "@graph": jsonLd })}</script><!-- STATIC_JSON_LD_END -->`);
  return output;
}

for (const route of routes) {
  const markup = renderer.renderMarketing(route);
  const page = withHead(replaceRoot(template, markup), route);
  if (route === "/") {
    await writeFile(path.join(dist, "index.html"), page);
    continue;
  }
  const directory = path.join(dist, route.slice(1));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), page);
}

// Vercel serves this file for unknown URLs instead of returning the home page.
await cp(path.join(dist, "404", "index.html"), path.join(dist, "404.html"));
console.log(`prerender: wrote ${routes.length} public HTML documents`);
