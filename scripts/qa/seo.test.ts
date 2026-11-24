import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import sharp from "sharp";
import nextConfig from "../../next.config";
import manifest from "../../src/app/manifest";
import robots from "../../src/app/robots";
import sitemap from "../../src/app/sitemap";
import { generateMetadata } from "../../src/app/(marketing)/blog/page";
import { articles } from "../../src/config/editorial";
import { marketingSeo } from "../../src/config/marketing-seo";
import { site } from "../../src/config/site";
import { faviconMetadata, marketingMetadata } from "../../src/lib/seo/metadata";
import { publisher, websiteGraph } from "../../src/lib/seo/structured-data";

test("homepage title, brand and publisher agree across metadata and JSON-LD", () => {
  const metadata = marketingMetadata("/");
  const title = "AI Repurposing Tool for Creators & Teams";
  const description =
    "Turn one long video or podcast into shorts, clips, captions, blog posts and carousels in minutes. Repurpose your content with AI using Zybble.";
  const canonical = "https://zybble.com/";
  assert.deepEqual(metadata.title, { absolute: title });
  assert.equal(metadata.description, description);
  assert.equal(metadata.alternates?.canonical, canonical);
  assert.equal(metadata.openGraph?.title, title);
  assert.equal(metadata.twitter?.title, title);
  assert.equal(websiteGraph["@context"], "https://schema.org");
  const websites = websiteGraph["@graph"].filter(
    (node) => node["@type"] === "WebSite",
  );
  const organizations = websiteGraph["@graph"].filter(
    (node) => node["@type"] === "Organization",
  );
  assert.equal(websites.length, 1);
  assert.equal(organizations.length, 1);
  const [website] = websites;
  const [organization] = organizations;
  assert.equal(website["@id"], `${canonical}#website`);
  assert.equal(website.name, "Zybble");
  assert(!("alternateName" in website));
  assert.equal(organization.name, website.name);
  assert.equal(organization["@id"], `${canonical}#organization`);
  assert.equal(organization.url, canonical);
  assert.equal(metadata.openGraph?.siteName, website.name);
  assert.equal(website.url, canonical);
  assert.equal(website.publisher["@id"], organization["@id"]);
});

test("sitemap lists exactly the intended landing pages and published articles", () => {
  const expected = [
    ...Object.keys(marketingSeo).map((path) => `${site.url}${path}`),
    ...articles.map(({ slug }) => `${site.url}/blog/${slug}`),
  ];
  assert.deepEqual(
    sitemap()
      .map(({ url }) => url)
      .sort(),
    expected.sort(),
  );
  assert.equal(robots().sitemap, `${site.url}/sitemap.xml`);
});

test("preview suppresses crawling, sitemap entries and indexing", () => {
  const previous = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "preview";
    assert.deepEqual(robots(), { rules: { userAgent: "*", disallow: "/" } });
    assert.deepEqual(sitemap(), []);
    assert.deepEqual(marketingMetadata("/").robots, {
      index: false,
      follow: false,
    });
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
});

test("production lets Googlebot and Googlebot-Image crawl and does not send a noindex header", async () => {
  const previous = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "production";
    assert.deepEqual(robots(), {
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://zybble.com/sitemap.xml",
    });
    assert(sitemap().some(({ url }) => url === "https://zybble.com/"));
    assert.equal(marketingMetadata("/").robots, undefined);
    const headers = await nextConfig.headers?.();
    assert(!JSON.stringify(headers).match(/x-robots-tag|noindex|nofollow/i));
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
});

test("unique journal pages self-canonicalize while search and malformed variants stay noindex", async () => {
  const cases: [Record<string, string | string[]>, string, boolean][] = [
    [{ page: "2" }, "?page=2", false],
    [{ page: "3" }, "?page=3", false],
    [{ page: "1" }, "", false],
    [{ page: "2", q: "clips" }, "", true],
    [{ category: "unknown" }, "", true],
    [{ page: "99" }, "", true],
    [{ page: ["2", "3"] }, "", true],
    [{ page: "02" }, "", true],
  ];
  for (const [query, suffix, noindex] of cases) {
    const metadata = await generateMetadata({
      searchParams: Promise.resolve(query),
    });
    assert.equal(metadata.alternates?.canonical, `${site.url}/blog${suffix}`);
    assert.equal(Boolean(metadata.robots), noindex);
    assert.equal(metadata.openGraph?.url, metadata.alternates?.canonical);
  }
});

test("favicon metadata declares the official PNG first and keeps ICO and SVG fallbacks", () => {
  assert.deepEqual(faviconMetadata("png"), {
    icon: [
      { url: "/icons/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  });
});

test("non-home pages retain the existing icon declarations and order", () => {
  assert.deepEqual(
    faviconMetadata().icon.map(({ url }) => url),
    ["/favicon.ico", "/icons/favicon-96.png", "/icon.svg"],
  );
});

test("manifest icons, favicon and schema logo are square and match declared sizes", async () => {
  const app = manifest();
  assert.equal(app.start_url, "/");
  assert.equal(app.name, site.name);
  assert.equal(app.short_name, site.name);
  assert.deepEqual(app.icons, [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
  ]);
  assert(
    app.icons?.some(({ src }) => `${site.url}${src}` === publisher.logo.url),
  );
  for (const { src, sizes } of [
    ...(app.icons ?? []),
    { src: "/icons/favicon-96.png", sizes: "96x96" },
    { src: "/icons/apple-touch-icon.png", sizes: "180x180" },
  ]) {
    const asset = await readFile(`public${src}`);
    assert.deepEqual(asset.subarray(0, 8), pngSignature, src);
    const { width, height, format } = await sharp(asset).metadata();
    assert.equal(format, "png", src);
    assert.equal(`${width}x${height}`, sizes, src);
    assert.equal(width, height, src);
    await assertOfficialArtwork(asset, width!, src);
  }
});

const pngSignature = Buffer.from("89504e470d0a1a0a", "hex");

// Compare the silhouettes (transparent corners, purple tile, white bolt) without
// locking tests to a particular antialiasing or PNG compression implementation.
async function assertOfficialArtwork(
  asset: Buffer,
  size: number,
  label: string,
) {
  const logo = await readFile("public/icon.svg");
  const rgba = (buffer: Buffer) =>
    sharp(buffer).resize(size, size).ensureAlpha().raw().toBuffer();
  const [actual, reference] = await Promise.all([rgba(asset), rgba(logo)]);
  const kind = (pixels: Buffer, i: number) => {
    const [r, g, b, alpha] = pixels.subarray(i, i + 4);
    if (alpha < 128) return "transparent";
    if (r > 175 && g > 175 && b > 175) return "white";
    return b > r && r > g ? "purple" : "other";
  };
  let matching = 0;
  for (let i = 0; i < actual.length; i += 4) {
    if (kind(actual, i) === kind(reference, i)) matching++;
  }
  assert(
    matching / (size * size) >= 0.98,
    `${label} differs from the official SVG artwork`,
  );
}

test("SVG and all three ICO frames are valid square versions of the official logo", async () => {
  const svg = await readFile("public/icon.svg");
  assert.match(svg.toString(), /<svg[^>]*viewBox="0 0 48 48"/);
  assert.match(svg.toString(), /<rect[^>]*fill="#6338f5"/);
  assert.match(
    svg.toString(),
    /<path[^>]*fill="white"[^>]*d="M27 7 12 26h11l-2 15 15-21H25l2-13Z"/,
  );
  const { format, width, height } = await sharp(svg).metadata();
  assert.deepEqual(
    { format, width, height },
    { format: "svg", width: 48, height: 48 },
  );

  const ico = await readFile("public/favicon.ico");
  assert.deepEqual(ico.subarray(0, 6), Buffer.from([0, 0, 1, 0, 3, 0]));
  for (const [index, size] of [16, 32, 48].entries()) {
    const entry = 6 + index * 16;
    assert.equal(ico[entry], size);
    assert.equal(ico[entry + 1], size);
    const length = ico.readUInt32LE(entry + 8);
    const start = ico.readUInt32LE(entry + 12);
    assert(start >= 54 && length > 8 && start + length <= ico.length);
    const frame = ico.subarray(start, start + length);
    assert.deepEqual(frame.subarray(0, 8), pngSignature);
    const { width, height } = await sharp(frame).metadata();
    assert.equal(width, size);
    assert.equal(height, size);
    await assertOfficialArtwork(frame, size, `ICO ${size}x${size}`);
  }
});
