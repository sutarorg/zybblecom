import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launchBrowser, loadTool } from "./browser.mjs";
const base = process.env.ORIGIN ?? "http://localhost:3099";
const shots = process.env.SHOTS ?? "test-results/admin";
const routes = [
  "/admin",
  "/admin/users",
  "/admin/users/unavailable",
  "/admin/projects",
  "/admin/jobs",
  "/admin/jobs/unavailable",
  "/admin/payments",
  "/admin/credits",
  "/admin/webhooks",
  "/admin/settings",
  "/admin/audit-logs",
];
const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440];
const axe = loadTool("axe-core");
const browser = await launchBrowser();
mkdirSync(shots, { recursive: true });
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const errors = [],
    mutations = [],
    links = new Set();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  page.on("request", (r) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(r.method()))
      mutations.push(r.url());
  });
  async function audit() {
    await page.evaluate(axe.source);
    return page.evaluate(async () =>
      (
        await axe.run({
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
          },
        })
      ).violations.map(({ id, nodes }) => ({
        id,
        nodes: nodes.map((n) => n.target),
      })),
    );
  }
  async function shot(width, name) {
    await page.screenshot({
      path: `${shots}/${width}-${name}.png`,
      fullPage: true,
      animations: "disabled",
      caret: "initial",
    });
  }
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 960 });
    for (const route of routes) {
      const r = await page.goto(base + route, { waitUntil: "load" });
      assert.equal(r.status(), 200, route);
      assert.equal(r.headers()["cache-control"], "private, no-store");
      assert.equal(r.headers()["referrer-policy"], "no-referrer");
      await page.locator("main h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.deepEqual(
        await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          headings: document.querySelectorAll("main h1").length,
          records: document.querySelectorAll("main table tbody tr").length,
          robots: document.querySelector("meta[name=robots]")?.content,
        })),
        {
          overflow: false,
          headings: 1,
          records: 0,
          robots: "noindex, nofollow",
        },
        `${route} ${width}`,
      );
      if (width === 390 || width === 1440)
        assert.deepEqual(await audit(), [], `${route} ${width}`);
      if (width === 390)
        for (const href of await page
          .locator('.ad-shell a[href^="/"]')
          .evaluateAll((a) => a.map((e) => e.getAttribute("href"))))
          links.add(href);
      if ([390, 768, 1440].includes(width))
        await shot(width, route.slice(1).replaceAll("/", "-"));
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/admin");
  const nav = page.getByRole("button", { name: "Open navigation" });
  await nav.focus();
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog", {
    name: "Administrative navigation",
  });
  await drawer.waitFor();
  assert.deepEqual(await audit(), []);
  await shot(390, "navigation");
  await page.keyboard.press("Escape");
  assert.equal(await drawer.isVisible(), false);
  assert.equal(await nav.evaluate((e) => document.activeElement === e), true);
  await nav.click();
  await drawer.getByRole("link", { name: "Users", exact: true }).click();
  await page.waitForURL("**/admin/users");
  assert.equal(await drawer.isVisible(), false);
  const open = page.getByRole("button", { name: "Filters", exact: true });
  await open.click();
  const f = page.getByRole("dialog", { name: "Filter records" });
  await f.waitFor();
  assert.deepEqual(await audit(), []);
  await shot(390, "filters");
  await page.keyboard.press("Escape");
  assert.equal(await open.evaluate((e) => document.activeElement === e), true);
  await open.click();
  await f.getByLabel("Search").fill("filter-check");
  await f.getByLabel("Country code").fill("in");
  await f.getByLabel("Account status").selectOption("suspended");
  await f.getByLabel("Registration date").selectOption("oldest");
  await f.getByRole("button", { name: "Apply filters" }).click();
  await page.waitForURL(/status=suspended/);
  assert.equal(new URL(page.url()).searchParams.get("order"), "oldest");
  await page.getByRole("button", { name: /Filters \(/ }).click();
  assert.equal(await f.getByLabel("Country code").inputValue(), "IN");
  await f.getByRole("link", { name: "Clear filters" }).click();
  await page.waitForURL("**/admin/users");
  await page.goto(base + "/admin/credits");
  const safeguards = page.getByRole("button", { name: "Review safeguards" });
  await safeguards.click();
  const confirmation = page.getByRole("dialog", {
    name: "Credit adjustment safeguards",
  });
  await confirmation.waitFor();
  assert.deepEqual(await audit(), []);
  assert.equal(
    await confirmation
      .getByRole("button", { name: "Confirm and submit" })
      .count(),
    0,
  );
  await shot(390, "adjustment-safeguards");
  await confirmation
    .getByRole("button", { name: "Close", exact: true })
    .click();
  assert.equal(
    await safeguards.evaluate((e) => document.activeElement === e),
    true,
  );
  await page.setViewportSize({ width: 1440, height: 960 });
  for (const [route, label, value, parameter] of [
    ["projects", "Project status", "uploaded", "status"],
    ["jobs", "Job state", "asset_copy_failed", "filter"],
    ["payments", "Payment status", "refunded", "status"],
    ["credits", "Transaction type", "adjustment", "kind"],
    ["webhooks", "Signature", "invalid", "signature"],
    ["audit-logs", "Action category", "settings", "category"],
  ]) {
    await page.goto(`${base}/admin/${route}`);
    const field = page
      .locator(".ad-desktop-filters")
      .getByLabel(label, { exact: true });
    await field.selectOption(value);
    const form = field.locator("xpath=ancestor::form");
    await form.getByRole("button", { name: "Apply filters" }).click();
    await page.waitForURL(new RegExp(`${parameter}=${value}`));
    assert.equal(await field.inputValue(), value);
  }
  await page.goto(base + "/admin/payments");
  const desktop = page.locator(".ad-desktop-filters");
  await desktop.getByLabel("From date (UTC)").fill("2026-11-01");
  await desktop.getByLabel("To date (UTC)").fill("2026-10-31");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "End date must be" })
    .waitFor();
  assert.equal(new URL(page.url()).search, "");
  await desktop.getByLabel("To date (UTC)").fill("2026-11-20");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.waitForURL(/from=2026-11-01.*to=2026-11-20/);
  for (const path of [
    "/admin/projects?inspect=unavailable",
    "/admin/payments?inspect=unavailable",
    "/admin/webhooks?inspect=unavailable",
  ]) {
    await page.goto(base + path);
    await page.locator("#record-detail").waitFor();
    await page.getByRole("link", { name: "Close details" }).click();
    await page.waitForURL(base + path.split("?")[0]);
  }
  for (const href of links) {
    assert((await page.request.get(new URL(href, base).href)).ok(), href);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(mutations, []);
  console.log(
    `${routes.length} admin routes × ${widths.length} widths; ${links.size} destinations; responsive filters, drawer, safeguards, details, and zero mutation requests.`,
  );
} finally {
  await browser.close();
}
