import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launchBrowser, loadTool } from "./browser.mjs";
const base = process.env.ORIGIN ?? "http://localhost:3000";
const shots = process.env.SHOTS ?? "test-results/workspace";
const browser = await launchBrowser();
const axe = loadTool("axe-core");
const routes = [
  "/dashboard",
  "/projects",
  "/projects/new",
  "/projects/unavailable",
  "/projects/unavailable/clips/unavailable",
  "/clips",
  "/credits",
  "/credits/history",
  "/settings",
  "/settings/profile",
  "/settings/preferences",
  "/support",
  "/dashboard/purchases",
];
const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440];
const saved = [390, 768, 1440];
const file = {
  name: "local-check.webm",
  mimeType: "video/webm",
  buffer: Buffer.from(
    "Local selection fixture; no codec or provider assertion.",
  ),
};
mkdirSync(shots, { recursive: true });
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const errors = [];
  const mutations = [];
  const links = new Set();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  page.on("request", (r) => {
    if (["POST", "PUT", "DELETE", "PATCH"].includes(r.method()))
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
  async function shot(width, label) {
    if (saved.includes(width))
      await page.screenshot({
        path: `${shots}/${width}-${label}.png`,
        fullPage: true,
        animations: "disabled",
        caret: "initial",
      });
  }
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 960 });
    for (const route of routes) {
      const response = await page.goto(base + route, { waitUntil: "load" });
      assert.equal(response.status(), 200, route);
      await page.locator("main h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.deepEqual(
        await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          headings: document.querySelectorAll("main h1").length,
          broken: [...document.images].filter(
            (i) => i.getClientRects().length && i.complete && !i.naturalWidth,
          ).length,
        })),
        { overflow: false, headings: 1, broken: 0 },
        `${route} ${width}`,
      );
      if (route === routes.at(-1)) {
        assert.equal(new URL(page.url()).pathname, "/credits/history");
        assert.equal(
          new URL(page.url()).searchParams.get("filter"),
          "purchases",
        );
      }
      if (width === 390 || width === 1440)
        assert.deepEqual(await audit(), [], `${route} ${width}`);
      if (width === 390)
        for (const href of await page
          .locator(".ws-shell a[href^='/']")
          .evaluateAll((items) => items.map((a) => a.getAttribute("href"))))
          links.add(href);
      await shot(width, route.slice(1).replaceAll("/", "-"));
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/dashboard");
  const open = page.getByRole("button", { name: "Open navigation" });
  await open.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Workspace navigation" });
  await dialog.waitFor();
  assert.deepEqual(await audit(), []);
  await shot(390, "drawer");
  await page.keyboard.press("Escape");
  assert.equal(await dialog.isVisible(), false);
  assert.equal(
    await open.evaluate((el) => document.activeElement === el),
    true,
  );
  await open.click();
  await dialog.getByRole("link", { name: "Projects", exact: true }).click();
  await page.waitForURL("**/projects");
  assert.equal(await dialog.isVisible(), false);
  await page.getByLabel("Search", { exact: true }).fill("keyword");
  await page.getByLabel("Status", { exact: true }).selectOption("failed");
  await page.getByLabel("Sort by", { exact: true }).selectOption("oldest");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.waitForURL(/status=failed/);
  assert.equal(new URL(page.url()).searchParams.get("order"), "oldest");
  await page.goto(base + "/dashboard");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Browse files" }).click();
  await (await chooser).setFiles(file);
  await page.waitForURL("**/projects/new");
  await page.getByText(file.name, { exact: true }).waitFor();
  const title = page.getByLabel("Project title");
  assert.equal(await title.inputValue(), "local-check");
  await title.fill("  ");
  await title.blur();
  await page.getByText("Enter a title from 1 to 100 characters.").waitFor();
  await title.fill("Private work in progress");
  await page
    .locator("input[type=file]")
    .setInputFiles({ ...file, name: "bad.txt" });
  await page.getByRole("alert").filter({ hasText: "Choose an MP4" }).waitFor();
  await page.getByRole("radio", { name: "10", exact: true }).check();
  await page.getByRole("radio", { name: "16:9 · Landscape" }).check();
  await page.getByRole("radio", { name: "Full frame", exact: true }).check();
  await page.getByRole("radio", { name: "No burned-in captions" }).check();
  await page.getByLabel("AI guidance").fill("Look for concise explanations.");
  assert.match(
    await page.locator(".ws-summary").innerText(),
    /10[\s\S]*16:9 Landscape[\s\S]*Full frame[\s\S]*No burned-in captions/,
  );
  assert.equal(
    await page.getByRole("button", { name: "Generate My Shorts" }).isDisabled(),
    true,
  );
  await page
    .getByRole("link", { name: "Buy Credits", exact: true })
    .last()
    .click();
  await page.waitForURL("**/credits#credit-packs");
  await page.getByRole("link", { name: "Create project", exact: true }).click();
  await page.waitForURL("**/projects/new");
  assert.equal(await title.inputValue(), "Private work in progress");
  assert.equal(
    await page.getByRole("radio", { name: "10", exact: true }).isChecked(),
    true,
  );
  await shot(390, "configured-local-draft");
  await page.getByRole("button", { name: "Remove video" }).click();
  const data = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([new Uint8Array([1, 2, 3])], "local-drop.mov", {
        type: "video/quicktime",
      }),
    );
    return transfer;
  });
  await page
    .locator(".ws-picker")
    .dispatchEvent("drop", { dataTransfer: data });
  await page.getByText("local-drop.mov", { exact: true }).waitFor();
  await page.goto(base + "/clips");
  await page.getByLabel("Search", { exact: true }).fill("test query");
  await page.getByLabel("Created on or after").fill("2026-01-01");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.waitForURL(/since=2026-01-01/);
  await page.goto(base + "/support");
  await page.getByText("What kind of video can I select?").click();
  assert.equal(await page.getByText(/Choose one MP4/).isVisible(), true);
  await page.getByLabel("Subject").fill("Local only");
  await page
    .getByLabel("Message", { exact: true })
    .fill("No messages should be sent.");
  assert.equal(
    await page.getByRole("button", { name: "Send request" }).isDisabled(),
    true,
  );
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(base + "/dashboard");
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await page.getByText("Account menu", { exact: true }).count();
  await page.locator("summary[aria-label='Account menu']").click();
  await page.getByRole("link", { name: "Preferences", exact: true }).click();
  await page.waitForURL("**/settings/preferences");
  for (const href of links) {
    const url = new URL(href, base);
    if (url.pathname === "/projects/unavailable") continue;
    const response = await page.request.get(url.href);
    assert(response.ok(), href);
    if (url.hash) {
      await page.goto(url.href);
      assert.equal(await page.locator(url.hash).count(), 1, href);
    }
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(mutations, []);
  console.log(
    `${routes.length} routes × ${widths.length} widths; ${links.size} destinations; audited 390/1440; draft, filters, nav, support and no mutation requests passed.`,
  );
} finally {
  await browser.close();
}
