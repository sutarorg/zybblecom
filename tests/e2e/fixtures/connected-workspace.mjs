import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launchBrowser } from "../../../scripts/qa/browser.mjs";

// The caller owns a loopback Auth/PostgREST fixture; no external provider or account is used.
export async function connectedWorkspace({ origin, cookies, setWallet }) {
  const shots =
    process.env.SHOTS ?? "test-results/targeted-improvements/connected-fixture";
  mkdirSync(shots, { recursive: true });
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
      reducedMotion: "reduce",
    });
    await page.context().addCookies(
      cookies.map((cookie) => {
        const split = cookie.indexOf("=");
        return {
          name: cookie.slice(0, split),
          value: cookie.slice(split + 1),
          url: origin,
          httpOnly: true,
        };
      }),
    );
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (
        !["GET", "HEAD", "OPTIONS"].includes(request.method()) &&
        !["/api/checkout", "/api/auth/logout", "/api/contact"]
          .map((path) => origin + path)
          .includes(request.url())
      )
        errors.push(`Unexpected write: ${request.url()}`);
    });
    const go = async (path) => {
      assert.equal((await page.goto(`${origin}${path}`)).status(), 200);
      assert.equal(new URL(page.url()).pathname, path);
    };
    await go("/");
    const header = page.getByRole("banner");
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await page.reload();
      if (width === 390)
        await header.getByRole("button", { name: "Open menu" }).click();
      const dashboard = header.getByRole("link", {
        name: "Dashboard",
        exact: true,
      });
      await dashboard.waitFor();
      assert.equal(await dashboard.getAttribute("href"), "/dashboard");
      for (const name of ["Log in", "Get started"])
        assert.equal(
          await header.getByRole("link", { name, exact: true }).count(),
          0,
        );
      if (width === 390) {
        await dashboard.click();
        await page.waitForURL(`${origin}/dashboard`);
      }
    }
    await page.setViewportSize({ width: 1440, height: 960 });
    for (const balance of [0, 1, 10, null]) {
      setWallet(balance);
      await go("/dashboard");
      const chooser = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "Browse files" }).click();
      await (await chooser).setFiles("tests/fixtures/estimate-61s.webm");
      await page.waitForURL(`${origin}/projects/new`);
      const summary = page.locator(".ws-summary");
      await page.getByText(/Local video:.*Not verified by Zybble/).waitFor();
      const original = summary
        .locator(".ws-summary-list > div")
        .filter({ hasText: "Original duration" });
      assert.doesNotMatch(await original.innerText(), /\(local\)/);
      assert.equal(
        await page.getByRole("list", { name: "Preview settings" }).count(),
        0,
      );
      await summary
        .getByText("2 credits (local estimate)", { exact: true })
        .waitFor();
      assert.equal(
        await summary.getByText("Available credits", { exact: true }).count(),
        0,
      );
      const insufficient = summary.getByText("You don't have enough credits", {
        exact: true,
      });
      if (balance === 0 || balance === 1) {
        await insufficient.waitFor();
        const title = page.getByLabel("Project title");
        await title.fill("Local fixture draft");
        await summary
          .getByRole("link", { name: "Buy Credits", exact: true })
          .click();
        await page.waitForURL(`${origin}/credits#credit-packs`);
        await page.goBack();
        assert.equal(await title.inputValue(), "Local fixture draft");
      } else {
        assert.equal(await insufficient.count(), 0);
      }
      assert(
        await summary
          .getByRole("button", { name: "Generate My Shorts" })
          .isDisabled(),
      );
    }
    setWallet(10);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      await go("/settings/profile");
      await page.getByRole("heading", { name: "Change Password" }).waitFor();
      await page.getByText("Avatar storage isn’t connected.").waitFor();
      const current = page.getByLabel("Current password", { exact: true });
      await page.getByRole("button", { name: "Show current password" }).click();
      assert.equal(await current.getAttribute("type"), "text");
      await page.getByRole("button", { name: "Hide current password" }).click();
      assert.equal(await current.getAttribute("type"), "password");
      assert.equal(
        await page
          .getByLabel("New password", { exact: true })
          .getAttribute("maxlength"),
        "16",
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: `${shots}/${width}-profile.png`,
        fullPage: true,
      });
    }
    // Stop the browser at the expected hosted URL without visiting Dodo.
    await page.route(
      "https://test.checkout.dodopayments.com/session/**",
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/plain",
          body: "Isolated checkout destination fixture",
        }),
    );
    for (const pack of ["starter", "creator", "studio"]) {
      await go("/credits");
      const card = page.locator(`.ws-packs .pack-${pack}`);
      const pay = card.getByRole("button", { name: "Pay Now", exact: true });
      const response = page.waitForResponse(`${origin}/api/checkout`);
      await pay.click();
      const result = await response;
      assert.equal(result.request().postDataJSON().packId, pack);
      assert.equal(result.status(), 200);
      await page.waitForURL(
        `https://test.checkout.dodopayments.com/session/cks_fixture_${pack}`,
      );
    }
    await go("/dashboard");
    await page
      .locator(".ws-sidebar")
      .getByRole("button", { name: "Log out" })
      .click();
    await page.waitForURL(`${origin}/login`);
    await go("/contact");
    await header.getByRole("link", { name: "Log in", exact: true }).waitFor();
    await header
      .getByRole("link", { name: "Get started", exact: true })
      .waitFor();
    assert.equal(
      await header
        .getByRole("link", { name: "Dashboard", exact: true })
        .count(),
      0,
    );
    const submit = page.getByRole("button", {
      name: "Submit Message",
      exact: true,
    });
    for (const [message, expected] of [
      [
        "Synthetic browser submission.",
        /Your message has been sent successfully/,
      ],
      ["Simulated delivery failure", /Your message could not be sent/],
    ]) {
      await page.locator("#contact-name").fill("Browser check");
      await page.locator("#contact-email").fill("fixture@example.invalid");
      await page.locator("#contact-topic").selectOption("Product question");
      await page.locator("#contact-message").fill(message);
      await submit.click();
      await page.getByText(expected).waitFor();
    }
    assert.deepEqual(errors, []);
    console.log(
      "Connected browser fixture: zero/insufficient/sufficient/unavailable balance, draft preservation, profile fields, three Dodo test-mode redirects, returning session, sign-out, and contact delivery fixtures passed.",
    );
  } finally {
    await browser.close();
  }
}
