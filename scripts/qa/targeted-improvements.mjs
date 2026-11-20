import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launchBrowser } from "./browser.mjs";

const origin = process.env.ORIGIN ?? "http://localhost:3000";
const shots = process.env.SHOTS ?? "test-results/targeted-improvements/after";
const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1600];
const routes = [
  "",
  "dashboard",
  "projects/new",
  "credits",
  "pricing",
  "settings/profile",
  "contact",
  "blog",
  "blog/repurpose-youtube-video",
];
mkdirSync(shots, { recursive: true });
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("request", (request) => {
    if (!request.url().startsWith(origin) && /^https?:/.test(request.url()))
      failures.push(`Unexpected network: ${request.url()}`);
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()))
      failures.push(`Unexpected write: ${request.method()} ${request.url()}`);
  });
  const capture = (name, locator, fullPage = true) =>
    (locator ?? page).screenshot({
      path: `${shots}/${name}.png`,
      animations: "disabled",
      ...(locator ? {} : { fullPage }),
    });
  const go = async (route) => {
    assert.equal((await page.goto(`${origin}/${route}`)).status(), 200);
    await page.evaluate(() => document.fonts.ready);
  };
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 960 });
    for (const route of routes) {
      await go(route);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Viewport overflow: ${route} at ${width}px`,
      );
      if (route === "") {
        assert.equal(
          await page.getByText("SHORT PREVIEW", { exact: true }).count(),
          0,
        );
        assert.equal(await page.locator(".phone-top").textContent(), "9:16");
      }
      if (
        [390, 1440].includes(width) ||
        (width === 768 &&
          ["dashboard", "projects/new", "credits", "blog"].includes(route))
      ) {
        await capture(`${width}-${route.replaceAll("/", "-") || "home"}`);
      }
    }
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await go("dashboard");
    const picker = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Browse files" }).click();
    await (await picker).setFiles("tests/fixtures/estimate-61s.webm");
    await page.waitForURL("**/projects/new");
    await page
      .getByText("2 credits (local estimate)", { exact: true })
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "Generate My Shorts" })
        .isDisabled(),
    );
    const summary = page.locator(".ws-generation-side");
    const stage = summary.locator(".ws-preview-stage");
    await capture(`${width}-step-3`, summary);
    if (width === 390) {
      await page.getByRole("radio", { name: "4:5 · Portrait" }).check();
      await capture("390-aspect-portrait", stage);
      await page
        .getByRole("radio", { name: "Full frame", exact: true })
        .check();
      await capture("390-full-frame", stage);
      await page.getByRole("radio", { name: "Minimal", exact: true }).check();
      await capture("390-minimal-captions", stage);
    }
    if (width === 1440)
      await page.getByRole("button", { name: "Collapse sidebar" }).click();
    else await page.getByRole("button", { name: "Open navigation" }).click();
    await capture(`${width}-navigation`, undefined, false);
    if (width === 390)
      await page.getByRole("button", { name: "Close navigation" }).click();
    else await page.getByRole("button", { name: "Expand sidebar" }).click();
    await page.getByRole("button", { name: "Remove video" }).click();
  }
  const sitemap = await (
    await page.request.get(`${origin}/sitemap.xml`)
  ).text();
  const paths = [
    ...sitemap.matchAll(/<loc>https?:\/\/[^/]+(\/blog\/[^<]+)<\/loc>/g),
  ].map(([, path]) => path);
  assert.equal(paths.length, 19);
  for (const path of paths) {
    await go(path.slice(1));
    const thumbnail = page.locator(".article-cover");
    await thumbnail.scrollIntoViewIfNeeded();
    const image = await thumbnail.evaluate(async (img) => {
      await img.decode();
      return {
        width: img.naturalWidth,
        height: img.naturalHeight,
        alt: img.alt,
      };
    });
    assert(
      Math.abs(image.width / image.height - 16 / 9) < 0.02 &&
        image.alt.length > 0,
      path,
    );
    const structured = (
      await page.locator('script[type="application/ld+json"]').allTextContents()
    ).map(JSON.parse);
    assert(
      structured.some(
        ({ "@type": type, image }) =>
          type === "BlogPosting" &&
          image.endsWith(`${path.replace("/blog/", "/images/blog/")}.webp`),
      ),
      path,
    );
    assert(
      structured.some(({ "@type": type }) => type === "BreadcrumbList"),
      path,
    );
    assert((await page.locator(".article-meta time").count()) >= 1);
  }
  assert(!sitemap.includes("/blog/unpublished"));
  assert.deepEqual(failures, []);
  console.log(
    `Targeted UI: ${widths.length} viewport widths × ${routes.length} routes, actual file metadata, preview, navigation and all ${paths.length} published articles.`,
  );
} finally {
  await browser.close();
}
