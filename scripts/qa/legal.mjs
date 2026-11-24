// Run against `next start` or the production domain. No account or payments needed.
import assert from "node:assert/strict";
import { launchBrowser } from "./browser.mjs";

const origin = new URL(process.env.ORIGIN ?? "http://localhost:3100").origin;
const canonical = "https://zybble.com";
const policies = [
  ["/terms", "Terms of Service", "Terms of Service", 17],
  ["/privacy", "Privacy Policy", "Privacy Policy", 13],
  ["/refund-policy", "Refund & Cancellation Policy", "Refund Policy", 8],
];
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const sitemapResponse = await page.request.get(`${origin}/sitemap.xml`);
  assert.equal(sitemapResponse.status(), 200);
  const sitemap = await sitemapResponse.text();
  const publicPaths = [
    ...sitemap.matchAll(/<loc>https:\/\/zybble\.com([^<]+)<\/loc>/g),
  ].map(([, path]) => path);
  assert(publicPaths.includes("/"), "canonical public sitemap");
  const titles = new Set();
  const descriptions = new Set();
  const bodyTargets = new Set();
  for (const [path, heading, , sections] of policies) {
    const raw = await page.request.get(`${origin}${path}`, {
      maxRedirects: 0,
      headers: { "user-agent": "Googlebot" },
    });
    assert.equal(raw.status(), 200, path);
    assert.doesNotMatch(
      raw.headers()["x-robots-tag"] ?? "",
      /noindex|nofollow|none/i,
      path,
    );
    const html = await raw.text();
    assert.match(html, /<h1>/i, "heading appears without JS");
    assert(
      !/preview (?:terms|privacy) notice|this notice isn[’']t a production/i.test(
        html,
      ),
      path,
    );
    assert.equal(publicPaths.filter((value) => value === path).length, 1, path);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      const response = await page.goto(`${origin}${path}`, {
        waitUntil: "load",
      });
      assert.equal(response?.status(), 200, path);
      assert.equal(new URL(page.url()).pathname, path);
      const main = page.getByRole("main");
      assert.equal(
        await main.getByRole("heading", { level: 1 }).count(),
        1,
        path,
      );
      await main.getByRole("heading", { name: heading, exact: true }).waitFor();
      assert.equal(
        await main.getByRole("heading", { level: 2 }).count(),
        sections,
        path,
      );
      assert.match(
        await main.locator("time").getAttribute("datetime"),
        /^\d{4}-\d{2}-\d{2}$/,
      );
      assert.equal(
        await page.locator('link[rel="canonical"]').getAttribute("href"),
        `${canonical}${path}`,
      );
      assert.equal(
        await page.locator('meta[property="og:url"]').getAttribute("content"),
        `${canonical}${path}`,
      );
      const title = await page.title();
      const description = await page
        .locator('meta[name="description"]')
        .getAttribute("content");
      assert.equal(title, `Zybble ${heading}`);
      assert.equal(
        await page.locator('meta[property="og:title"]').getAttribute("content"),
        title,
      );
      assert.equal(
        await page
          .locator('meta[property="og:description"]')
          .getAttribute("content"),
        description,
      );
      assert(description.length > 50, path);
      titles.add(title);
      descriptions.add(description);
      for (const robots of await page.locator('meta[name="robots"]').all()) {
        assert.doesNotMatch(
          (await robots.getAttribute("content")) ?? "",
          /noindex|nofollow|none/i,
          path,
        );
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `${path} overflow at ${width}`,
      );
      for (const [href, , label] of policies) {
        const link = page
          .getByRole("navigation", { name: "Legal links" })
          .getByRole("link", { name: label, exact: true });
        assert.equal(await link.count(), 1, label);
        assert.equal(await link.isVisible(), true, `${label} at ${width}`);
        assert.equal(await link.getAttribute("href"), href);
      }
    }
    for (const href of await page
      .getByRole("main")
      .locator("a[href]")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")))) {
      if (href.startsWith("#")) bodyTargets.add(path + href);
      if (href.startsWith("/")) bodyTargets.add(href);
    }
    const text = await page.getByRole("main").innerText();
    if (path === "/terms") {
      for (const [name, number, price] of [
        ["Starter", 30, 9],
        ["Creator", 120, 19],
        ["Studio", 300, 39],
      ]) {
        assert.match(
          text,
          new RegExp(`${name}\\s+${number} credits · \\$${price}\\b`),
        );
      }
      assert.match(text, /one-time purchases/i);
      assert.match(
        text,
        /Paid generation is not currently available for new jobs/i,
      );
    }
    if (path === "/refund-policy") {
      await page
        .getByRole("heading", {
          name: "No Refunds on Completed Credit Purchases",
        })
        .waitFor();
      assert.match(text, /does not limit your mandatory consumer rights/i);
      assert.match(text, /no recurring subscription to cancel/i);
    }
  }
  assert.equal(titles.size, 3);
  assert.equal(descriptions.size, 3);
  for (const href of bodyTargets) {
    const [path, fragment] = href.split("#");
    const response = await page.request.get(`${origin}${path}`, {
      maxRedirects: 0,
    });
    if (path === "/credits/history") {
      assert(
        response.ok() ||
          /\/login(?:[?#]|$)/.test(response.headers().location ?? ""),
        href,
      );
    } else {
      assert.equal(response.status(), 200, href);
      if (fragment)
        assert((await response.text()).includes(`id="${fragment}"`), href);
    }
  }
  const footerMarkup = await Promise.all(
    publicPaths.map(async (path) => {
      const response = await page.request.get(`${origin}${path}`);
      assert.equal(response.status(), 200, path);
      return [
        path,
        (await response.text()).match(
          /<nav aria-label="Legal links">[\s\S]*?<\/nav>/,
        )?.[0],
      ];
    }),
  );
  for (const [path, nav] of footerMarkup) {
    assert(nav, `shared legal footer not found: ${path}`);
    for (const [href] of policies)
      assert.equal(nav.split(`href="${href}"`).length, 2, path + href);
  }
  for (const [width, [path, , label]] of [390, 768, 1440].map(
    (width, index) => [width, policies[index]],
  )) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${origin}/`);
    const link = page
      .getByRole("navigation", { name: "Legal links" })
      .getByRole("link", { name: label, exact: true });
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(`${origin}${path}`);
  }
  await page.goto(`${origin}/pricing`);
  const studio = page.getByRole("button", {
    name: "Are bulk and priority processing guaranteed in Studio?",
  });
  const summary = page.getByText(
    "Are bulk and priority processing guaranteed in Studio?",
    { exact: true },
  );
  // The shared FAQ may use a native summary rather than a button.
  await ((await studio.count()) ? studio : summary).click();
  await page.getByText(/Studio is a fixed pack of 300 credits/).waitFor();
  await page.goto(`${origin}/contact`);
  assert.match(
    await page
      .getByRole("link", { name: "Email Zybble support" })
      .getAttribute("href"),
    /^mailto:/,
  );
  assert.deepEqual(errors, []);
  console.log(
    `Verified legal pages, metadata, indexability, internal links and ${publicPaths.length} shared footers; keyboard navigation and readable layouts across four widths.`,
  );
} finally {
  await browser.close();
}
