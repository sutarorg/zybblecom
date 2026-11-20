import { launchBrowser } from "./browser.mjs";
(async () => {
  const browser = await launchBrowser();
  const origin = process.env.ORIGIN || "http://localhost:3099";
  const desktop = process.env.QA_PERF_DESKTOP === "1";
  for (const route of process.argv.length > 2
    ? process.argv.slice(2)
    : ["/", "/pricing", "/help"]) {
    const results = [];
    for (let run = 0; run < 3; run++) {
      const ctx = await browser.newContext({
        viewport: desktop
          ? { width: 1440, height: 960 }
          : { width: 390, height: 844 },
        isMobile: !desktop,
        hasTouch: !desktop,
        deviceScaleFactor: desktop ? 1 : 2,
      });
      const page = await ctx.newPage();
      const session = await ctx.newCDPSession(page);
      const problems = [];
      page.on("pageerror", (error) => problems.push(error.message));
      page.on("response", (response) => {
        if (response.status() >= 400)
          problems.push(`HTTP ${response.status()}`);
      });
      await session.send("Network.enable");
      if (!desktop)
        await session.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: 150,
          downloadThroughput: 200000,
          uploadThroughput: 93750,
        });
      if (!desktop)
        await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.addInitScript(() => {
        window.results = { lcp: 0, cls: 0, interaction: null };
        if (PerformanceObserver.supportedEntryTypes.includes("event")) {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.interactionId)
                window.results.interaction = Math.max(
                  window.results.interaction ?? 0,
                  entry.duration,
                );
            }
          }).observe({ type: "event", durationThreshold: 16 });
        }
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            window.results.lcp = entry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          let start = -Infinity,
            last = -Infinity,
            value = 0;
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue;
            if (
              entry.startTime - start > 5000 ||
              entry.startTime - last > 1000
            ) {
              start = entry.startTime;
              value = 0;
            }
            last = entry.startTime;
            value += entry.value;
            window.results.cls = Math.max(window.results.cls, value);
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      const res = await page.goto(origin + route, { waitUntil: "networkidle" });
      if (!res.ok()) throw Error(res.status() + " " + route);
      await page.waitForFunction(() => window.results.lcp > 0);
      const menu = page
        .getByRole("button", {
          name: /^Open (menu|navigation|admin navigation)$/,
        })
        .first();
      if (await menu.isVisible()) {
        await menu.tap();
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
      }
      if (problems.length)
        throw new Error(
          `Unexpected errors on ${route}: ${problems.join(", ")}`,
        );
      results.push(
        await page.evaluate(() => ({
          lcp: Math.round(window.results.lcp),
          cls: window.results.cls,
          ttfb: Math.round(
            performance.getEntriesByType("navigation")[0].responseStart,
          ),
          interactionSample: window.results.interaction,
        })),
      );
      await ctx.close();
    }
    console.log(route, JSON.stringify(results));
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
