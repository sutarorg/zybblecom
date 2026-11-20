import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launchBrowser, loadTool } from "./browser.mjs";
const axe = loadTool("axe-core");
const origin = process.env.ORIGIN || "http://localhost:3000";
const shots = process.env.SHOTS || "test-results/account";
const routes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/callback",
  "/onboarding",
  "/checkout/success",
  "/checkout/cancelled",
  "/checkout/retry",
  "/404",
  "/unauthorized",
  "/maintenance",
  "/dashboard",
  "/dashboard/purchases",
  "/privacy",
  "/terms",
];
const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440];
const saved = [390, 768, 1440];
mkdirSync(shots, { recursive: true });
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const errors = [];
  const links = new Set();
  const mutations = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("404 (Not Found)")
    )
      errors.push(message.text());
  });
  page.on("request", (request) => {
    if (request.method() === "POST") mutations.push(request.url());
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && new URL(response.url()).pathname !== "/404")
      errors.push(`${response.status()} ${response.url()}`);
  });
  async function checkLayout(width, label, doScreenshot = true) {
    await page.locator("main h1").waitFor();
    await page.evaluate(() => document.fonts.ready);
    const status = await page.evaluate(async () => {
      const images = [...document.querySelectorAll("main img")].filter(
        (image) => image.getClientRects().length,
      );
      await Promise.all(images.map((image) => image.decode().catch(() => {})));
      return {
        imagesOk: images.every((image) => image.naturalWidth > 0),
        overflow: document.documentElement.scrollWidth > innerWidth,
        h1: document.querySelectorAll("main h1").length,
      };
    });
    assert.deepEqual(
      status,
      { imagesOk: true, overflow: false, h1: 1 },
      `${label} at ${width}px`,
    );
    if (doScreenshot && saved.includes(width))
      await page.screenshot({
        path: `${shots}/${width}-${label}.png`,
        fullPage: true,
        animations: "disabled",
        caret: "initial",
      });
    if (width === 390 || width === 1440) {
      await page.evaluate(axe.source);
      const issues = await page.evaluate(async () =>
        (
          await axe.run({
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
            },
          })
        ).violations.map((v) => ({
          rule: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      );
      assert.deepEqual(issues, [], `${label} accessibility at ${width}px`);
    }
  }
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 960 });
    for (const route of routes) {
      const response = await page.goto(origin + route, { waitUntil: "load" });
      assert.equal(response.status(), route === "/404" ? 404 : 200, route);
      await checkLayout(width, route.slice(1).replaceAll("/", "-"));
      if (width === 390)
        for (const href of await page
          .locator("a[href^='/']")
          .evaluateAll((items) => items.map((a) => a.getAttribute("href"))))
          links.add(href);
      if (route === "/onboarding") {
        await page.getByRole("button", { name: "Get started" }).click();
        await checkLayout(width, "onboarding-content");
        await page.getByRole("radio", { name: "Podcasts" }).check();
        await page.getByRole("button", { name: "Continue" }).click();
        await checkLayout(width, "onboarding-goal");
        await page.getByRole("radio", { name: "YouTube Shorts" }).check();
        await page.getByRole("button", { name: "Continue" }).click();
        await checkLayout(width, "onboarding-finish");
        await page.getByRole("link", { name: "Go to Dashboard" }).click();
        await page.waitForURL("**/dashboard");
      }
    }
    console.log(`Checked ${width}px`);
  }
  for (const href of links)
    assert.equal(
      (await page.request.get(new URL(href, origin).href)).status(),
      200,
      href,
    );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + "/login");
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent),
    "Skip to content",
  );
  await page.keyboard.press("Enter");
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "main-content",
  );
  const login = page.getByRole("button", { name: "Log in", exact: true });
  await login.click();
  await page.getByText("Enter a valid email address.").waitFor();
  await page.getByText("Enter your password.", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByLabel("Email address")
      .evaluate((element) => document.activeElement === element),
    true,
  );
  await page.getByLabel("Email address").fill("missing-at");
  await page
    .getByLabel("Password", { exact: true })
    .fill("browser-validation-only");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .focus();
  await page.keyboard.press("Space");
  assert.equal(
    await page.getByLabel("Password", { exact: true }).getAttribute("type"),
    "text",
  );
  await page.keyboard.press("Space");
  assert.equal(
    await page.getByLabel("Password", { exact: true }).getAttribute("type"),
    "password",
  );
  await checkLayout(390, "login-validation");
  await page.getByLabel("Email address").fill("qa@example.invalid");
  await login.click();
  await page
    .getByRole("alert")
    .getByText("Nothing was sent or changed.", { exact: false })
    .waitFor();
  await checkLayout(390, "login-unavailable");
  await page.getByRole("link", { name: "Create an account" }).click();
  const signup = page.getByRole("button", { name: "Create account" });
  await signup.click();
  await page.getByText("Acknowledge the terms to continue.").waitFor();
  await page.getByLabel("Full name").fill(" ");
  await page.getByLabel("Email address").fill("qa@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("short7!");
  await page.getByRole("checkbox").focus();
  await page
    .locator(".account-field-error")
    .getByText("Use 8–16 characters.", { exact: true })
    .waitFor();
  await page
    .getByText("Enter your full name (up to 100 characters).")
    .waitFor();
  await checkLayout(390, "signup-validation");
  await page.getByLabel("Full name").fill("Browser check");
  await page.getByLabel("Password", { exact: true }).fill("Example8");
  await page.getByText("Length requirement met.", { exact: false }).waitFor();
  await page.getByRole("checkbox").check();
  await signup.click();
  await page
    .getByRole("alert")
    .getByText("Nothing was sent or changed.", { exact: false })
    .waitFor();
  for (const [route, action] of [
    ["forgot-password", "Send reset link"],
    ["verify-email", "Resend verification"],
  ]) {
    await page.goto(`${origin}/${route}`);
    await page.getByRole("button", { name: action }).click();
    await page.getByText("Enter a valid email address.").waitFor();
    await page.getByLabel("Email address").fill("qa@example.invalid");
    await page.getByRole("button", { name: action }).click();
    await page
      .getByRole("alert")
      .getByText("Nothing was sent or changed.", { exact: false })
      .waitFor();
  }
  await page.goto(origin + "/onboarding");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("radio", { name: "Podcasts" }).check();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  assert.equal(
    await page.getByRole("radio", { name: "Podcasts" }).isChecked(),
    false,
  );
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByRole("button", { name: "Skip for now" }).click();
  assert.equal(await page.locator(".onboard-summary").count(), 0);
  const callback = await page.goto(
    origin +
      "/auth/callback?code=unverified&next=https%3A%2F%2Fexample.invalid%2F",
  );
  assert.equal(callback.headers()["referrer-policy"], "no-referrer");
  await page
    .getByRole("heading", { name: "Account links aren’t active yet." })
    .waitFor();
  assert.equal(new URL(page.url()).origin, origin);
  await page.goto(
    origin +
      "/checkout/success?status=succeeded&credits=400&pack=studio&reference=unverified",
  );
  await page.getByText("Not confirmed", { exact: true }).waitFor();
  assert.equal(
    await page.getByText("Payment confirmed.", { exact: true }).count(),
    0,
  );
  assert.equal(await page.getByText("Studio", { exact: true }).count(), 0);
  await page.getByRole("link", { name: "View purchase history" }).click();
  await page.waitForURL("**/credits/history?filter=purchases");
  await page.goto(origin + "/checkout/cancelled");
  await page.getByRole("link", { name: "Retry checkout" }).click();
  await page.getByRole("link", { name: "Creator · 120 credits" }).click();
  await page.waitForURL("**/pricing/creator");
  assert.deepEqual(mutations, []);
  assert.deepEqual(errors, []);
  console.log(
    `All account/system checks passed; ${links.size} internal links verified.`,
  );
} finally {
  await browser.close();
}
