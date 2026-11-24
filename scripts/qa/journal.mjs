import assert from "node:assert/strict";
import sharp from "sharp";
import { launchBrowser } from "./browser.mjs";

const origin = process.env.ORIGIN ?? "http://localhost:3100";
const custom = {
  "opusclip-vs-descript": "comparison-desk",
  "short-video-captions": "timing-clinic",
  "vertical-video-framing": "framing-field-guide",
  "repurpose-youtube-video": "production-bench",
  "youtube-video-twenty-posts": "editorial-slate",
};
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const sitemap = await (
    await page.request.get(`${origin}/sitemap.xml`)
  ).text();
  const paths = [...sitemap.matchAll(/<loc>[^<]+(\/blog\/[^<]+)<\/loc>/g)].map(
    ([, path]) => path,
  );
  assert.equal(paths.length, 19);
  assert.equal(new Set(paths).size, paths.length);
  const metadata = { titles: new Set(), descriptions: new Set() };
  const internal = new Set();
  for (const path of paths) {
    const slug = path.slice(6);
    const response = await page.request.get(`${origin}${path}`, {
      headers: { "user-agent": "Googlebot" },
    });
    assert.equal(response.status(), 200, path);
    const raw = await response.text();
    assert.equal([...raw.matchAll(/<h1(?:\s|>)/g)].length, 1, path);
    assert.deepEqual(
      [...raw.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(
        ([, url]) => url,
      ),
      [`https://zybble.com${path}`],
      path,
    );
    const expectedImage = `/images/blog/${slug}.webp`;
    const image = await page.request.get(`${origin}${expectedImage}`);
    assert.equal(image.status(), 200, expectedImage);
    const { width, height, format } = await sharp(
      await image.body(),
    ).metadata();
    assert.deepEqual(
      [width, height, format],
      [1200, 675, "webp"],
      expectedImage,
    );

    await page.goto(`${origin}${path}`);
    const article = page.locator("main article").first();
    const title = (await article.locator("h1").textContent()).trim();
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    assert.equal(await page.title(), title, path);
    assert.equal(
      await page.locator('meta[property="og:title"]').getAttribute("content"),
      title,
      path,
    );
    assert.equal(
      await page.locator('meta[name="twitter:title"]').getAttribute("content"),
      title,
      path,
    );
    assert.equal(
      await page
        .locator('meta[property="og:description"]')
        .getAttribute("content"),
      description,
      path,
    );
    assert.equal(
      await page
        .locator('meta[name="twitter:description"]')
        .getAttribute("content"),
      description,
      path,
    );
    assert(
      (
        await page.locator('meta[name="keywords"]').getAttribute("content")
      ).split(",").length >= 4,
      path,
    );
    metadata.titles.add(title);
    metadata.descriptions.add(description);
    const data = (
      await page.locator('script[type="application/ld+json"]').allTextContents()
    ).map(JSON.parse);
    const postings = data.filter((entry) => entry["@type"] === "BlogPosting");
    assert.equal(postings.length, 1, path);
    const [post] = postings;
    assert.equal(post.headline, title, path);
    assert.equal(post.description, description, path);
    assert.equal(post.datePublished, "2026-11-20", path);
    assert.equal(post.mainEntityOfPage["@id"], post.url, path);
    assert.equal(post.image.url, `https://zybble.com${expectedImage}`, path);
    assert.equal(post.author.name, "Zybble Editorial Team", path);
    assert.equal(post.publisher.name, "Zybble", path);
    assert(
      data.some((entry) => entry["@type"] === "BreadcrumbList"),
      path,
    );
    assert.equal(
      (await article.locator("img.article-cover").getAttribute("alt")).length >
        10,
      true,
      path,
    );
    for (const href of await article
      .locator("a[href]")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
      if (href.startsWith("/")) internal.add(href);
      if (href.startsWith("#"))
        assert.equal(
          await page.locator(`[id="${href.slice(1)}"]`).count(),
          1,
          `${path}${href}`,
        );
    }
    if (Object.hasOwn(custom, slug)) {
      assert(post.dateModified >= post.datePublished, path);
      assert.equal(
        await page
          .locator('meta[property="article:modified_time"]')
          .getAttribute("content"),
        post.dateModified,
        path,
      );
      assert.equal(
        await article.getAttribute("data-editorial-view"),
        custom[slug],
        path,
      );
      await article.locator("img.article-cover").scrollIntoViewIfNeeded();
      await article
        .locator("img.article-cover")
        .evaluate((node) => node.decode());
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        const dimensions = await page.evaluate(() => [
          document.documentElement.scrollWidth,
          innerWidth,
        ]);
        assert(
          dimensions[0] <= dimensions[1],
          `${path} overflows at ${width}: ${dimensions}`,
        );
      }
      await page.setViewportSize({ width: 320, height: 844 });
      if (slug === "youtube-video-twenty-posts") {
        const sections = article.locator(
          'section[aria-labelledby^="slate-"]:has(ol[start])',
        );
        assert.equal(await sections.count(), 4);
        assert.deepEqual(
          await sections
            .locator("ol[start]")
            .evaluateAll((nodes) => nodes.map((node) => node.start)),
          [1, 6, 11, 16],
        );
        assert.equal(await sections.locator("ol > li").count(), 20);
      }
      if (slug === "short-video-captions") {
        assert.equal(
          await article
            .getByRole("list", { name: "Corrected caption cues" })
            .getByRole("listitem")
            .count(),
          2,
        );
      }
      if (slug === "vertical-video-framing") {
        assert.equal(await article.locator("figure:has(svg)").count(), 3);
      }
      if (slug === "repurpose-youtube-video") {
        assert.equal(
          await article
            .getByRole("navigation", { name: "Production steps" })
            .getByRole("link")
            .count(),
          5,
        );
      }
      if (slug === "opusclip-vs-descript") {
        const table = article.getByRole("region", {
          name: /Scrollable OpusClip/,
        });
        assert(
          await table.evaluate((node) => node.scrollWidth > node.clientWidth),
          "table stays inside its own scroll region",
        );
        await table.focus();
        await page.keyboard.press("ArrowRight");
        await page.waitForFunction(() => document.activeElement.scrollLeft > 0);
      }
      await page.setViewportSize({ width: 390, height: 844 });
    }
  }
  assert.equal(metadata.titles.size, 19);
  assert.equal(metadata.descriptions.size, 19);
  for (const href of internal) {
    const response = await page.request.get(`${origin}${href}`);
    assert(response.ok(), `${href}: ${response.status()}`);
  }
  await page.goto(`${origin}/blog`);
  await page.getByRole("link", { name: "Next page" }).click();
  await page.waitForURL("**/blog?page=2");
  await page
    .getByRole("link", { name: "Video repurposing", exact: true })
    .click();
  await page.waitForURL("**/blog?category=Video+repurposing");
  await page.getByRole("searchbox").fill("captions");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("heading", { name: "Search results" }).waitFor();
  await page
    .getByRole("link", { name: /^Read article: Short video captions/ })
    .click();
  await page.waitForURL("**/blog/short-video-captions");
  await page.getByRole("heading", { name: "Related articles" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    `Verified 19 raw routes and cover files, ${internal.size} internal targets, ${Object.keys(custom).length} article layouts at four widths, keyboard table, and listing/search/filter.`,
  );
} finally {
  await browser.close();
}
