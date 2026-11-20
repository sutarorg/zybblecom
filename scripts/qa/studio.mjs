import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launchBrowser } from "./browser.mjs";

// Uses the actual disconnected workspace. No route stubs or provider writes.
const origin = process.env.ORIGIN ?? "http://localhost:3000";
const shots = process.env.SHOTS ?? "test-results/studio";
const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440];
const routes = [
  "projects",
  "clips",
  "credits",
  "settings",
  "settings/profile",
  "settings/preferences",
  "support",
  "projects/new",
];
mkdirSync(shots, { recursive: true });
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const problems = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("request", (request) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()))
      problems.push(`${request.method()} ${request.url()}`);
    if (
      /^https?:/.test(request.url()) &&
      new URL(request.url()).origin !== new URL(origin).origin
    )
      problems.push(`Unexpected external request: ${request.url()}`);
  });
  const viewport = (width) =>
    page.setViewportSize({ width, height: width < 768 ? 844 : 960 });
  const go = async (route) => {
    assert.equal((await page.goto(`${origin}/${route}`)).status(), 200);
    await page.evaluate(() => document.fonts.ready);
  };
  const capture = (name, fullPage = true) =>
    page.screenshot({
      path: `${shots}/${name}.png`,
      fullPage,
      animations: "disabled",
    });
  for (const width of widths) {
    await viewport(width);
    for (const route of routes) {
      await go(route);
      const root = page.locator(".ws-studio");
      await root.getByRole("heading", { level: 1 }).waitFor();
      assert.equal(await root.count(), 1);
      assert(
        await root.evaluate((el) => el.scrollWidth <= el.clientWidth),
        `${route} ${width} content overflow`,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} ${width} viewport overflow`,
      );
      await capture(`${width}-${route.replaceAll("/", "-")}`);
    }
  }

  await viewport(1440);
  await go("projects/new");
  const sidebar = page.locator(".ws-sidebar");
  assert.equal(
    await sidebar
      .getByRole("link", { name: "Projects", exact: true })
      .getAttribute("aria-current"),
    "page",
  );
  await sidebar.getByRole("button", { name: "Collapse sidebar" }).click();
  const collapsedProjects = sidebar.getByRole("link", {
    name: "Projects",
    exact: true,
  });
  assert.equal(await collapsedProjects.getAttribute("title"), "Projects");
  const expand = sidebar.getByRole("button", { name: "Expand sidebar" });
  const railBounds = await sidebar.boundingBox();
  const expandBounds = await expand.boundingBox();
  assert(
    railBounds &&
      expandBounds &&
      railBounds.y + railBounds.height - expandBounds.y < 85,
  );
  assert.equal(
    await sidebar
      .getByRole("link", { name: "Credits", exact: true })
      .getAttribute("title"),
    "Credits",
  );
  assert.equal(
    await sidebar
      .getByRole("link", { name: "Help", exact: true })
      .getAttribute("title"),
    "Help",
  );
  await capture("1440-collapsed");
  await sidebar.getByRole("button", { name: "Expand sidebar" }).press("Enter");
  await capture("1440-expanded");

  await viewport(390);
  await go("projects/new");
  const menu = page.getByRole("button", { name: "Open navigation" });
  const dialog = page.getByRole("dialog", { name: "Workspace navigation" });
  await menu.press("Enter");
  await dialog.waitFor();
  await capture("390-drawer", false);
  for (let i = 0; i < 13; i++) {
    await page.keyboard.press("Tab");
    assert(
      await page.evaluate(
        () =>
          document.activeElement === document.body ||
          document.activeElement.closest("dialog[open]") !== null,
      ),
      "focus escaped drawer",
    );
  }
  await page.mouse.click(388, 160);
  await dialog.waitFor({ state: "hidden" });
  assert(await menu.evaluate((el) => el === document.activeElement));
  await menu.press("Enter");
  await dialog.getByRole("button", { name: "Close navigation" }).press("Enter");
  await dialog.waitFor({ state: "hidden" });

  const count = { count: 4, duration: 3, ratio: 4, reframe: 3, captions: 3 };
  const rows = {
    count: "Clip count",
    duration: "Clip length",
    ratio: "Format",
    reframe: "Reframe",
    captions: "Captions",
  };
  for (const [group, qty] of Object.entries(count)) {
    const radios = page.locator(`fieldset[data-choice="${group}"] input`);
    assert.equal(await radios.count(), qty);
    const row = page
      .locator(".ws-summary-list > div")
      .filter({ has: page.getByText(rows[group], { exact: true }) })
      .locator("dd");
    const summaries = new Set();
    for (const radio of await radios.all()) {
      await radio.check();
      assert(await radio.isChecked());
      summaries.add(await row.innerText());
    }
    assert.equal(summaries.size, qty, group);
    await radios.last().press("ArrowRight");
    assert(await radios.first().isChecked(), `${group} keyboard wrap`);
  }
  const prompt = page.getByLabel("AI guidance");
  await prompt.fill("A".repeat(520));
  assert.equal((await prompt.inputValue()).length, 500);
  await page.getByText("500/500", { exact: true }).waitFor();
  await prompt.fill("Look for clear, independent explanations.");
  const summary = page.locator(".ws-summary");
  assert.equal(
    await summary.getByText("AI guidance", { exact: true }).count(),
    0,
  );
  const cost = summary.locator(".ws-summary-balance");
  assert.equal(
    await cost
      .locator("dt")
      .allTextContents()
      .then((labels) => labels.map((item) => item.trim()).join(",")),
    "Estimated cost",
  );
  assert.equal(await cost.locator("dd").textContent(), "0");
  assert.equal(
    await summary.getByText("Available credits", { exact: true }).count(),
    0,
  );
  await page.getByRole("heading", { name: "Preview", exact: true }).waitFor();
  assert.equal(
    await page
      .getByText("This still image doesn’t track motion", { exact: false })
      .count(),
    0,
  );
  const preview = page.locator(".ws-preview-stage");
  for (const [ratio, name] of [
    ["9:16", "Vertical"],
    ["1:1", "Square"],
    ["4:5", "Portrait"],
    ["16:9", "Landscape"],
  ]) {
    await page.getByRole("radio", { name: `${ratio} · ${name}` }).check();
    const expected = ratio.replace(":", " / ");
    assert.equal(
      await preview.evaluate(
        (element) => getComputedStyle(element).aspectRatio,
      ),
      expected,
    );
  }
  await page.getByRole("radio", { name: "Full frame", exact: true }).check();
  assert.equal(
    await preview
      .locator("img")
      .evaluate((image) => getComputedStyle(image).objectFit),
    "contain",
  );
  assert.equal(
    await page.getByRole("radio", { name: "Clean", exact: true }).count(),
    0,
  );
  await page.getByRole("radio", { name: "Minimal", exact: true }).check();
  assert.equal(await preview.locator("figcaption span").count(), 6);
  await page.getByRole("radio", { name: "Karaoke", exact: true }).check();
  assert.equal(await preview.locator("figcaption mark").count(), 2);
  assert.equal(await page.getByLabel("Paste a video link").count(), 0);
  assert.equal(
    await page.getByRole("button", { name: "Use video link" }).count(),
    0,
  );
  assert(
    await page.getByRole("button", { name: "Generate My Shorts" }).isDisabled(),
  );
  await capture("390-configured");

  await go("support");
  const questions = page.locator(".ws-faq details");
  assert.equal(await questions.count(), 4);
  for (const question of await questions.all()) {
    const summary = question.locator("summary");
    await summary.press("Enter");
    assert(await question.evaluate((el) => el.open));
    await summary.press("Space");
    assert.equal(await question.evaluate((el) => el.open), false);
  }
  const length = async (label) =>
    Number(
      await page.getByLabel(label, { exact: true }).getAttribute("maxlength"),
    );
  assert((await length("Subject")) > 0);
  assert((await length("Message")) > 0);
  assert(await page.getByRole("button", { name: "Send request" }).isDisabled());
  await go("credits");
  for (const pack of ["starter", "creator", "studio"]) {
    const response = await page.request.get(`${origin}/pricing/${pack}`);
    assert.equal(response.status(), 200);
    const card = page.locator(`.ws-packs .pack-${pack}`);
    const buy = card.getByRole("button", { name: "Buy Now", exact: true });
    assert(await buy.isDisabled());
    assert.equal(await card.locator(`a[href="/pricing/${pack}"]`).count(), 0);
  }
  await page.getByRole("link", { name: "View History" }).click();
  await page.waitForURL("**/credits/history");
  await go("settings");
  for (const target of ["profile", "preferences"]) {
    const card = page.locator(
      `.ws-settings-links a[href="/settings/${target}"]`,
    );
    await card.press("Enter");
    await page.waitForURL(`**/settings/${target}`);
    await page.goBack();
  }
  assert.deepEqual(problems, []);
  console.log(
    "64 route screenshots; desktop and drawer navigation; all 17 choices and keyboard wrapping; prompt limit; four FAQs; settings links; no console errors or mutations.",
  );
} finally {
  await browser.close();
}
