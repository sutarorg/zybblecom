import assert from "node:assert/strict";
import { launchBrowser } from "./browser.mjs";
(async () => {
  const origin = process.env.ORIGIN || "http://localhost:3000";
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const failures = [];
  page.on("pageerror", (e) => failures.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") failures.push(m.text());
  });
  await page.goto(origin + "/");
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
  const toggle = page.getByRole("button", { name: "Open menu" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await page
      .getByRole("button", { name: "Close menu" })
      .getAttribute("aria-expanded"),
    "true",
  );
  await page.keyboard.press("Escape");
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.equal(
    await toggle.evaluate((e) => e === document.activeElement),
    true,
  );
  await toggle.click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "How it works" })
    .click();
  await page.waitForURL("**/how-it-works");
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  await page.goto(origin + "/help");
  await page.getByRole("searchbox").fill("reframing");
  await page.getByRole("heading", { name: "No matching answers" }).waitFor();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("button", { name: "Credits & pricing" }).click();
  await page.getByRole("status").getByText("5 answers").waitFor();
  const credit = page.getByText("How do credits work?", { exact: true });
  await credit.focus();
  await page.keyboard.press("Enter");
  await page
    .getByText("A 40-minute recording uses 40 credits", { exact: false })
    .waitFor();
  await page.goto(origin + "/contact");
  const draft = page.getByRole("button", { name: "Check my draft" });
  await draft.click();
  assert.equal(
    await page
      .locator("#contact-name")
      .evaluate((e) => e.validity.valueMissing),
    true,
  );
  await page.locator("#contact-name").fill("   ");
  assert.equal(
    await page
      .locator("#contact-name")
      .evaluate((e) => e.validity.patternMismatch),
    true,
  );
  await page.locator("#contact-name").fill("Browser QA");
  await page.locator("#contact-email").fill("incorrect");
  assert.equal(
    await page
      .locator("#contact-email")
      .evaluate((e) => e.validity.typeMismatch),
    true,
  );
  await page.locator("#contact-email").fill("qa@example.invalid");
  await page
    .locator("#contact-topic")
    .selectOption({ label: "Product question" });
  await page.locator("#contact-message").fill("too short");
  assert.equal(
    await page.locator("#contact-message").evaluate((e) => e.validity.valid),
    false,
  );
  await page
    .locator("#contact-message")
    .fill("This is a local validation check.");
  await draft.click();
  await page
    .getByRole("status")
    .getByText("No message was sent.", { exact: false })
    .waitFor();
  await page.goto(origin + "/blog");
  await page.getByRole("searchbox").fill("framing");
  await page.getByRole("button", { name: "Search" }).click();
  await page.waitForURL("**/blog?q=framing");
  await page.getByRole("heading", { name: "No matching articles" }).waitFor();
  await page.getByRole("link", { name: "Clear filters" }).click();
  await page
    .getByRole("heading", { name: "No articles published yet" })
    .waitFor();
  await page.goto(origin + "/pricing");
  assert.deepEqual(await page.locator(".pack-price strong").allTextContents(), [
    "$9",
    "$19",
    "$39",
  ]);
  assert.equal(await page.locator(".price-card").count(), 3);
  await page.getByRole("link", { name: "View Creator pack" }).click();
  await page.getByText("Checkout isn’t open yet.").waitFor();
  const india = await page.request.get(origin + "/pricing", {
    headers: { "x-vercel-ip-country": "IN" },
  });
  const html = await india.text();
  for (const price of ["₹299", "₹999", "₹2,499"])
    assert.ok(html.includes(price), price);
  const otherMarket = await page.request.get(origin + "/pricing", {
    headers: { "x-vercel-ip-country": "GB" },
  });
  assert.ok((await otherMarket.text()).includes("$39"));
  for (const route of [
    "/",
    "/features",
    "/how-it-works",
    "/use-cases",
    "/examples",
    "/pricing",
    "/blog",
    "/resources",
    "/help",
    "/contact",
    "/faq",
    "/login",
  ]) {
    const resp = await page.request.get(origin + route);
    const source = await resp.text();
    assert.ok(
      source.includes('rel="canonical"') &&
        source.includes("og:image") &&
        source.includes("twitter:card"),
      route,
    );
  }
  for (const route of [
    "/robots.txt",
    "/sitemap.xml",
    "/icon.svg",
    "/social-card.png",
  ])
    assert.equal((await page.request.get(origin + route)).status(), 200, route);
  assert.equal(
    (await page.request.get(origin + "/blog/unpublished")).status(),
    404,
  );
  assert.equal((await page.request.get(origin + "/missing")).status(), 404);
  assert.deepEqual(failures, []);
  console.log(
    "Passed keyboard, FAQ, blog, contact, pricing, metadata and error checks",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
