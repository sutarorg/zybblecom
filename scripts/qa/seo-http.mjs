// Check the raw response from a production build, not a hydrated browser DOM.
// Run with ORIGIN=https://zybble.com after deployment to check the public site.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const origin = new URL(process.env.ORIGIN ?? "http://localhost:3000").origin;
const canonical = "https://zybble.com/";
const title = "AI Repurposing Tool for Creators &amp; Teams";
const description =
  "Turn one long video or podcast into shorts, clips, captions, blog posts and carousels in minutes. Repurpose your content with AI using Zybble.";
const googlebot =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const googlebotImage = "Googlebot-Image/1.0";
const blocked = /\b(?:noindex|nofollow|none)\b/i;
const fileTypes = {
  "/favicon.ico": /^image\/(?:x-icon|vnd\.microsoft\.icon)\b/i,
  "/icons/favicon-96.png": /^image\/png\b/i,
  "/icon.svg": /^image\/svg\+xml\b/i,
  "/icons/apple-touch-icon.png": /^image\/png\b/i,
  "/icons/icon-192.png": /^image\/png\b/i,
  "/icons/icon-512.png": /^image\/png\b/i,
};

async function get(path, type, userAgent) {
  const response = await fetch(new URL(path, origin), {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    headers: { "User-Agent": userAgent },
  });
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get("content-type") ?? "", type, path);
  assert.doesNotMatch(
    response.headers.get("x-robots-tag") ?? "",
    blocked,
    path,
  );
  return response;
}

function tags(html, name) {
  // React's server renderer quotes attributes; consume whole quoted values.
  const pattern = new RegExp(`<${name}\\b(?:"[^"]*"|'[^']*'|[^'"<>])*>`, "gi");
  return [...html.matchAll(pattern)].map(([tag]) =>
    Object.fromEntries(
      [...tag.matchAll(/([^\s=<>]+)=(?:"([^"]*)"|'([^']*)')/g)].map(
        ([, key, double, single]) => [key.toLowerCase(), double ?? single],
      ),
    ),
  );
}

function nodes(value) {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object") return [];
  return [value, ...Object.values(value).flatMap(nodes)];
}

for (const agent of [googlebot, "Zybble SEO QA"]) {
  const html = await (await get("/", /^text\/html\b/i, agent)).text();
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const head = markup.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  assert.deepEqual(
    [...markup.matchAll(/<title>([^<]*)<\/title>/gi)].map(([, text]) => text),
    [title],
  );
  assert(
    head.includes(`<title>${title}</title>`),
    "title must be in the server-generated head",
  );

  for (const [attribute, name, value] of [
    ["name", "description", description],
    ["property", "og:site_name", "Zybble"],
    ["property", "og:title", title],
    ["name", "twitter:title", title],
  ]) {
    const values = (part) =>
      tags(part, "meta")
        .filter((tag) => tag[attribute] === name)
        .map((tag) => tag.content);
    assert.deepEqual(values(markup), [value], `${name} must appear once`);
    assert.deepEqual(values(head), [value], `${name} must be in the head`);
  }
  for (const meta of tags(markup, "meta")) {
    if (/^(?:robots|googlebot(?:-image)?)$/i.test(meta.name ?? ""))
      assert.doesNotMatch(meta.content ?? "", blocked);
  }
  const linkTags = (part, rel) =>
    tags(part, "link").filter((tag) =>
      tag.rel?.toLowerCase().split(/\s+/).includes(rel),
    );
  assert.deepEqual(
    linkTags(markup, "canonical").map(({ href }) => href),
    [canonical],
  );
  assert.deepEqual(
    linkTags(head, "canonical").map(({ href }) => href),
    [canonical],
  );
  assert.deepEqual(
    linkTags(head, "manifest").map(({ href }) => href),
    ["/manifest.webmanifest"],
  );
  const icons = [
    {
      rel: "icon",
      href: "/icons/favicon-96.png",
      sizes: "96x96",
      type: "image/png",
    },
    {
      rel: "icon",
      href: "/favicon.ico",
      sizes: "16x16 32x32 48x48",
      type: "image/x-icon",
    },
    { rel: "icon", href: "/icon.svg", sizes: "any", type: "image/svg+xml" },
  ];
  assert.deepEqual(
    linkTags(markup, "icon"),
    icons,
    "one declaration per official icon, PNG first",
  );
  assert.deepEqual(linkTags(head, "icon"), icons);
  assert.deepEqual(
    linkTags(head, "apple-touch-icon").map(({ href, sizes }) => [href, sizes]),
    [["/icons/apple-touch-icon.png", "180x180"]],
  );

  const schema = [
    ...html.matchAll(
      /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map(([, data]) => JSON.parse(data));
  const typed = (type) =>
    schema
      .flatMap(nodes)
      .filter((node) => [node["@type"]].flat().includes(type));
  const websites = typed("WebSite");
  const organizations = typed("Organization");
  assert.equal(websites.length, 1);
  assert.equal(organizations.length, 1);
  const [website] = websites;
  const [organization] = organizations;
  assert(
    schema.some(
      (script) =>
        script["@context"] === "https://schema.org" &&
        script["@graph"]?.includes(website),
    ),
  );
  assert.equal(website["@id"], `${canonical}#website`);
  assert.equal(website.name, "Zybble");
  assert.equal(website.url, canonical);
  assert(!("alternateName" in website));
  assert.equal(organization["@id"], `${canonical}#organization`);
  assert.equal(organization.name, "Zybble");
  assert.equal(organization.url, canonical);
  assert.deepEqual(website.publisher, { "@id": organization["@id"] });
  console.log(
    `GET /: 200, one server-rendered canonical, exact metadata, icons and WebSite graph (${agent})`,
  );
}

const robots = await (
  await get("/robots.txt", /^text\/plain\b/i, googlebot)
).text();
assert.match(robots, /^User-Agent: \*\s+Allow: \/\s*$/im);
assert.doesNotMatch(robots, /^Disallow:\s*\//im);
assert.match(robots, /^Sitemap: https:\/\/zybble\.com\/sitemap\.xml\s*$/im);
const sitemap = await (
  await get("/sitemap.xml", /^(?:application|text)\/xml\b/i, googlebot)
).text();
assert.equal(sitemap.match(/<loc>https:\/\/zybble\.com\/<\/loc>/g)?.length, 1);

for (const [path, type] of Object.entries(fileTypes)) {
  const response = await get(path, type, googlebotImage);
  const actual = Buffer.from(await response.arrayBuffer());
  const expected = await readFile(
    new URL(`../../public${path}`, import.meta.url),
  );
  assert.deepEqual(
    actual,
    expected,
    `${path}: response must match the official asset`,
  );
  console.log(
    `GET ${path}: 200 ${response.headers.get("content-type")}; ${actual.length} official bytes`,
  );
}
const manifest = await (
  await get(
    "/manifest.webmanifest",
    /^application\/manifest\+json\b/i,
    googlebot,
  )
).json();
assert.equal(manifest.name, "Zybble");
assert.equal(manifest.short_name, "Zybble");
assert.equal(manifest.start_url, "/");
assert.deepEqual(manifest.icons, [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
]);
console.log(
  "GET /robots.txt, /sitemap.xml and /manifest.webmanifest: 200; crawl rules and canonical URLs verified",
);
