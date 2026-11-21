import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launchBrowser } from "./browser.mjs";

// Run against the disconnected local build. No user data or network writes.
const origin = process.env.ORIGIN ?? "http://localhost:3000";
const directory = process.env.SHOTS ?? "test-results/dashboard";
const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440];
mkdirSync(directory, { recursive: true });
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const errors = [];
  const writes = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(r.method())) writes.push(r.url());
  });
  const dashboard = page.locator(".ws-dashboard:visible");
  const picker = dashboard.locator(".ws-picker");
  for (const width of widths) {
    const height = width < 768 ? 844 : 960;
    await page.setViewportSize({ width, height });
    assert.equal((await page.goto(`${origin}/dashboard`)).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    const browse = dashboard.getByRole("button", { name: "Browse files" });
    const box = await browse.boundingBox();
    assert(
      box && box.y + box.height <= height && box.height >= 44,
      `Upload CTA fits the first viewport at ${width}px`,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `${width}px overflow`,
    );
    assert.deepEqual(
      await dashboard.locator(".dash-metric-value").allTextContents(),
      ["—", "—", "—"],
    );
    assert.equal(
      await dashboard
        .getByText("Projects are unavailable.", { exact: true })
        .isVisible(),
      true,
    );
    assert.equal(
      await dashboard
        .getByText("Credit activity is unavailable.", { exact: true })
        .isVisible(),
      true,
    );
    assert.equal(await dashboard.locator(".ws-media-card").count(), 0);
    await page.screenshot({
      path: `${directory}/${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [name, destination] of [
    ["Create New Project", "/projects/new"],
    ["View Projects", "/projects"],
    ["View All Projects", "/projects"],
    ["Buy Credits", "/credits#credit-packs"],
    ["View Credit History", "/credits/history"],
  ]) {
    await page.goto(`${origin}/dashboard`);
    await dashboard.getByRole("link", { name, exact: true }).click();
    await page.waitForURL(new URL(destination, origin).href);
  }
  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  assert.equal(
    await breadcrumb.locator("[aria-current='page']").textContent(),
    "Credit history",
  );
  await page.goto(`${origin}/dashboard`);
  await page
    .getByRole("link", { name: "Credits, balance not connected" })
    .click();
  await page.waitForURL(new URL("/credits", origin).href);
  await page.goto(`${origin}/dashboard`);
  const transfer = async (filename) =>
    page.evaluateHandle((name) => {
      const data = new DataTransfer();
      data.items.add(new File(["Local selection only"], name));
      return data;
    }, filename);
  const invalid = await transfer("not-a-video.txt");
  await picker.dispatchEvent("dragenter", { dataTransfer: invalid });
  assert(await picker.evaluate((el) => el.classList.contains("ws-dragging")));
  await picker.dispatchEvent("drop", { dataTransfer: invalid });
  await picker
    .getByRole("alert")
    .filter({ hasText: "Choose an MP4" })
    .waitFor();
  assert.equal(new URL(page.url()).pathname, "/dashboard");
  assert.equal(
    await picker.evaluate((el) => el.classList.contains("ws-dragging")),
    false,
  );
  await invalid.dispose();
  const valid = await transfer("dashboard-drop.mov");
  await picker.dispatchEvent("drop", { dataTransfer: valid });
  await page.waitForURL(new URL("/projects/new", origin).href);
  await page.getByText("dashboard-drop.mov", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Remove video" }).click();
  await page
    .getByText("dashboard-drop.mov", { exact: true })
    .waitFor({ state: "hidden" });
  await valid.dispose();
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, []);
  console.log(
    "Dashboard: eight captures, first-viewport upload CTA, existing links, breadcrumbs, drop feedback/validation, draft transfer, removal, no browser errors or writes.",
  );
} finally {
  await browser.close();
}
