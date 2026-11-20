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
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method()))
        errors.push(`Unexpected write: ${request.url()}`);
    });
    let chooserOpened = false;
    page.on("filechooser", () => {
      chooserOpened = true;
    });
    const go = async (path) => {
      assert.equal((await page.goto(`${origin}${path}`)).status(), 200);
      assert.equal(new URL(page.url()).pathname, path);
    };
    setWallet(0);
    await go("/dashboard");
    await page.getByRole("button", { name: "Browse files" }).click();
    await page.waitForURL(`${origin}/credits`);
    assert.equal(chooserOpened, false);
    for (const balance of [1, 10, null]) {
      setWallet(balance);
      await go("/dashboard");
      const chooser = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "Browse files" }).click();
      await (await chooser).setFiles("tests/fixtures/estimate-61s.webm");
      await page.waitForURL(`${origin}/projects/new`);
      const summary = page.locator(".ws-summary");
      await summary
        .getByText("2 credits (local estimate)", { exact: true })
        .waitFor();
      const available = summary
        .locator(".ws-summary-balance dl > div")
        .filter({ hasText: "Available credits" })
        .locator("dd");
      assert.equal(
        await available.textContent(),
        balance === null ? "Credit balance unavailable." : String(balance),
      );
      if (balance === 1) {
        await summary
          .getByText(
            "You don’t have enough available credits for this request.",
          )
          .waitFor();
        const title = page.getByLabel("Project title");
        await title.fill("Local fixture draft");
        await summary
          .getByRole("link", { name: "Buy Credits", exact: true })
          .click();
        await page.waitForURL(`${origin}/credits#credit-packs`);
        await page.goBack();
        assert.equal(await title.inputValue(), "Local fixture draft");
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
    assert.deepEqual(errors, []);
    console.log(
      "Connected browser fixture: zero/insufficient/sufficient/unavailable balance, draft preservation and profile fields passed.",
    );
  } finally {
    await browser.close();
  }
}
