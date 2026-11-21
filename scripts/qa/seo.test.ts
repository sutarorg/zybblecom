import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import manifest from "../../src/app/manifest";
import robots from "../../src/app/robots";
import sitemap from "../../src/app/sitemap";
import { generateMetadata } from "../../src/app/(marketing)/blog/page";
import { articles } from "../../src/config/editorial";
import { marketingSeo } from "../../src/config/marketing-seo";
import { site } from "../../src/config/site";
import { marketingMetadata } from "../../src/lib/seo/metadata";
import { publisher, websiteGraph } from "../../src/lib/seo/structured-data";

test("homepage title, brand and publisher agree across metadata and JSON-LD", () => {
  const metadata = marketingMetadata("/");
  const [website, organization] = websiteGraph["@graph"];
  const title = "AI Repurposing Tool for Creators & Teams";
  assert.deepEqual(metadata.title, { absolute: title });
  assert.equal(metadata.openGraph?.title, title);
  assert.equal(metadata.twitter?.title, title);
  assert.equal(website.name, "Zybble");
  assert.equal(website.alternateName, website.name);
  assert.equal(organization.name, website.name);
  assert.equal(metadata.openGraph?.siteName, website.name);
  assert.equal(website.url, metadata.alternates?.canonical);
  assert.equal(website.publisher["@id"], organization["@id"]);
});

test("sitemap lists exactly the intended landing pages and published articles", () => {
  const expected = [
    ...Object.keys(marketingSeo).map((path) => `${site.url}${path}`),
    ...articles.map(({ slug }) => `${site.url}/blog/${slug}`),
  ];
  assert.deepEqual(sitemap().map(({ url }) => url).sort(), expected.sort());
  assert.equal(robots().sitemap, `${site.url}/sitemap.xml`);
});

test("preview suppresses crawling, sitemap entries and indexing", () => {
  const previous = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "preview";
    assert.deepEqual(robots(), { rules: { userAgent: "*", disallow: "/" } });
    assert.deepEqual(sitemap(), []);
    assert.deepEqual(marketingMetadata("/").robots, { index: false, follow: false });
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
    const metadata = await generateMetadata({ searchParams: Promise.resolve(query) });
    assert.equal(metadata.alternates?.canonical, `${site.url}/blog${suffix}`);
    assert.equal(Boolean(metadata.robots), noindex);
    assert.equal(metadata.openGraph?.url, metadata.alternates?.canonical);
  }
});

test("manifest icons, favicon and schema logo are square and match declared sizes", async () => {
  const app = manifest();
  assert.equal(app.start_url, "/");
  assert.equal(app.name, site.name);
  assert.equal(app.short_name, site.name);
  assert(app.icons?.some(({ src }) => `${site.url}${src}` === publisher.logo.url));
  for (const { src, sizes } of [
    ...(app.icons ?? []),
    { src: "/icons/favicon-96.png", sizes: "96x96" },
    { src: "/icons/apple-touch-icon.png", sizes: "180x180" },
  ]) {
    const { width, height } = await sharp(`public${src}`).metadata();
    assert.equal(`${width}x${height}`, sizes, src);
    assert.equal(width, height, src);
  }
});
