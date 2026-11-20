import assert from "node:assert/strict";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { launchBrowser, loadTool } from "../../scripts/qa/browser.mjs";

const origin = new URL(process.env.ORIGIN ?? "http://127.0.0.1:3000");
assert(
  ["127.0.0.1", "localhost"].includes(origin.hostname),
  "Route matrix is local-only",
);
const out = process.env.SHOTS ?? "test-results/launch-readiness/routes";
const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1600];
const capture = new Set([320, 390, 768, 1024, 1280, 1440]);
const axe = loadTool("axe-core");
const sample = {
  "/blog/[slug]": [["/blog/unpublished", 404]],
  "/pricing/[pack]": [
    ["/pricing/starter", 200],
    ["/pricing/creator", 200],
    ["/pricing/studio", 200],
    ["/pricing/invalid", 404],
  ],
  "/projects/[projectId]": [["/projects/unavailable", 200]],
  "/projects/[projectId]/clips/[clipId]": [
    ["/projects/unavailable/clips/unavailable", 200],
  ],
  "/admin/users/[userId]": [["/admin/users/unavailable", 200]],
  "/admin/jobs/[jobId]": [["/admin/jobs/unavailable", 200]],
};
const handlers = {
  "/api/admin/jobs/[jobId]/provider": [
    "GET",
    "/api/admin/jobs/unavailable/provider",
    503,
  ],
  "/api/clips/download": ["POST", "/api/clips/download", 503],
  "/api/webhooks/clipsdk": ["POST", "/api/webhooks/clipsdk", 503],
  "/api/auth/[operation]": ["POST", "/api/auth/login", 503],
  "/api/auth/callback": ["GET", "/api/auth/callback", 503],
  "/api/checkout": ["POST", "/api/checkout", 503],
  "/api/credits/history": ["GET", "/api/credits/history", 503],
  "/api/credits/wallet": ["GET", "/api/credits/wallet", 503],
  "/api/settings/[section]": ["POST", "/api/settings/preferences", 503],
  "/api/webhooks/dodo": ["POST", "/api/webhooks/dodo", 503],
};
const app = "src/app";
const pages = [];
const api = [];
for (const file of (await readdir(app, { recursive: true })).sort()) {
  const parts = file.split("/");
  const basename = parts.pop();
  const path = `/${parts.filter((part) => !part.startsWith("(")).join("/")}`;
  if (basename === "page.tsx") {
    if (path.includes("[")) {
      assert(sample[path], `Provide a test case for dynamic route ${path}`);
      pages.push(...sample[path]);
    } else pages.push([path, path === "/404" ? 404 : 200]);
  }
  if (basename === "route.ts") {
    assert(handlers[path], `Provide a test case for handler ${path}`);
    api.push(handlers[path]);
  }
}
// Use actual published slugs if present, without seeding editorial records.
const prerender = JSON.parse(
  await readFile(".next/prerender-manifest.json", "utf8"),
);
for (const path of Object.keys(prerender.routes).filter((path) =>
  path.startsWith("/blog/"),
)) {
  if (!pages.some(([current]) => current === path)) pages.push([path, 200]);
}
pages.push(["/qa-unknown-page", 404]);
await mkdir(out, { recursive: true });
const browser = await launchBrowser();
const context = await browser.newContext({ reducedMotion: "reduce" });
const issues = [];
const completed = [];
let location = "setup";
try {
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  page.on("pageerror", (error) => issues.push([location, error.message]));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("404 (Not Found)"))
      issues.push([location, m.text()]);
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && r.request().resourceType() !== "document")
      issues.push([location, r.status(), new URL(r.url()).pathname]);
  });
  for (const [method, path, status] of api) {
    const r = await context.request.fetch(new URL(path, origin).href, {
      method,
      maxRedirects: 0,
      ...(method === "POST" ? { data: {} } : {}),
    });
    assert.equal(r.status(), status, path);
    assert.match(r.headers()["cache-control"], /no-store/, path);
  }
  for (const path of [
    "/robots.txt",
    "/sitemap.xml",
    "/icon.svg",
    "/social-card.png",
  ]) {
    assert.equal(
      (await context.request.get(new URL(path, origin).href)).status(),
      200,
      path,
    );
  }
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 960 });
    for (const [path, status] of pages) {
      location = `${width} ${path}`;
      try {
        const response = await page.goto(new URL(path, origin).href, {
          waitUntil: "load",
        });
        assert.equal(response?.status(), status);
        assert.equal(new URL(page.url()).origin, origin.origin);
        if (path === "/dashboard/purchases")
          assert.equal(new URL(page.url()).pathname, "/credits/history");
        const heading = page.locator("main h1");
        await heading.waitFor({ timeout: 8000 });
        assert.equal(await heading.count(), 1);
        assert.match(await page.title(), /\S/);
        await page.evaluate(async () => {
          await document.fonts.ready;
          const images = [...document.images].filter(
            (i) => i.getClientRects().length,
          );
          await Promise.all(
            images.map((image) => {
              image.loading = "eager";
              return image.decode().catch(() => {});
            }),
          );
          window.scrollTo(0, 0);
        });
        assert.deepEqual(
          await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > innerWidth,
            broken: [...document.images]
              .filter((i) => i.getClientRects().length && !i.naturalWidth)
              .map((i) => i.getAttribute("src")),
          })),
          { overflow: false, broken: [] },
        );
        if (width === 390 || width === 1440) {
          await page.evaluate(axe.source);
          const violations = await page.evaluate(async () =>
            (
              await axe.run({
                runOnly: {
                  type: "tag",
                  values: [
                    "wcag2a",
                    "wcag2aa",
                    "wcag21a",
                    "wcag21aa",
                    "wcag22aa",
                  ],
                },
              })
            ).violations.map(({ id, nodes }) => ({
              id,
              targets: nodes.map((n) => n.target),
            })),
          );
          if (violations.length) issues.push([location, violations]);
        }
        if (capture.has(width))
          await page.screenshot({
            path: join(
              out,
              `${width}-${path.slice(1).replaceAll("/", "-") || "home"}.jpg`,
            ),
            fullPage: true,
            quality: 83,
            animations: "disabled",
          });
        completed.push({ width, path, status });
      } catch (error) {
        issues.push([location, error.message]);
      }
    }
  }
  await writeFile(
    join(out, "report.json"),
    JSON.stringify(
      { pages: pages.length, api: api.length, widths, completed, issues },
      null,
      2,
    ),
  );
  if (issues.length) {
    const first = issues.slice(0, 12);
    throw new Error(
      `${issues.length} route-matrix failures: ${JSON.stringify(first)} (see report.json)`,
    );
  }
  console.log(
    `${pages.length} page states × ${widths.length} widths; ${api.length} handlers; 4 metadata/assets; WCAG-tagged axe at 390/1440.`,
  );
} finally {
  await context.tracing.stop(
    issues.length || completed.length !== pages.length * widths.length
      ? { path: join(out, "failure-trace.zip") }
      : {},
  );
  await browser.close();
}
