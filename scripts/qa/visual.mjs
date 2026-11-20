import fs from "node:fs";
import { launchBrowser, loadTool } from "./browser.mjs";
const axe = loadTool("axe-core");
const origin = process.env.ORIGIN || "http://localhost:3000";
const routes = [
  "/",
  "/features",
  "/how-it-works",
  "/use-cases",
  "/examples",
  "/pricing",
  "/pricing/starter",
  "/pricing/creator",
  "/pricing/studio",
  "/blog",
  "/blog/unpublished",
  "/blog/repurpose-youtube-video",
  "/resources",
  "/help",
  "/contact",
  "/faq",
  "/login",
];
const dims = [
  [320, 780],
  [390, 844],
  [768, 1024],
  [1024, 900],
  [1280, 900],
  [1440, 900],
  [1600, 1000],
];
(async () => {
  const browser = await launchBrowser();
  const output = process.env.SHOTS || "test-results/marketing";
  fs.mkdirSync(output, { recursive: true });
  const errors = [],
    links = new Set();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push([page.url(), e.message]));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("404 (Not Found)"))
      errors.push([page.url(), m.text()]);
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("/blog/unpublished"))
      errors.push([r.url(), r.status()]);
  });
  for (const [width, height] of dims) {
    await page.setViewportSize({ width, height });
    for (const route of routes) {
      const response = await page.goto(origin + route, { waitUntil: "load" });
      if (response.status() !== (route.endsWith("unpublished") ? 404 : 200))
        errors.push([route, response.status()]);
      await page.evaluate(() => document.fonts.ready);
      for (const image of await page.locator("main img:visible").all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate((i) => i.decode().catch(() => {}));
      }
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      const data = await page.evaluate(() => {
        const imgs = [...document.images].filter(
          (i) => i.getClientRects().length,
        );
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          h1: document.querySelectorAll("h1").length,
          broken: imgs.filter((i) => !i.naturalWidth).map((i) => i.src),
          links: [...document.querySelectorAll("a[href]")].map((a) =>
            a.getAttribute("href"),
          ),
        };
      });
      if (data.overflow || data.h1 !== 1 || data.broken.length)
        errors.push([width, route, { ...data, links: undefined }]);
      data.links.forEach((link) => {
        if (link.startsWith("/") && !link.startsWith("//")) links.add(link);
      });
      if ([390, 768, 1440].includes(width)) {
        const file = `${width}-${route.slice(1).replaceAll("/", "-") || "home"}`;
        await page.screenshot({
          path: `${output}/${file}.jpg`,
          type: "jpeg",
          quality: 78,
          fullPage: true,
          animations: "disabled",
          caret: "initial",
        });
        if (route === "/")
          await page.screenshot({
            path: `${output}/${file}-fold.png`,
            animations: "disabled",
            caret: "initial",
          });
      }
      if (width === 1440 || width === 390) {
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
          ).violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => [n.target, n.failureSummary]),
          })),
        );
        if (violations.length) errors.push([width, route, violations]);
      }
    }
    console.log("Completed", width);
  }
  for (const link of links) {
    const url = new URL(link, origin);
    const res = await ctx.request.get(url.href);
    if (!res.ok()) errors.push([link, res.status()]);
    if (url.hash && !(await res.text()).includes(`id="${url.hash.slice(1)}"`))
      errors.push([link, "Missing anchor"]);
  }
  await browser.close();
  console.log(
    "Checked links:",
    links.size,
    "| Errors:",
    JSON.stringify(errors),
  );
  if (errors.length) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
