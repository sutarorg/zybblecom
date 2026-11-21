import assert from "node:assert/strict";
import { launchBrowser } from "./browser.mjs";

const origin = process.env.ORIGIN ?? "http://localhost:3000";
const hasMedia = process.env.EXPECT_SAMPLE_MEDIA !== "0";
const reviews = [
  "Zybble makes turning long videos into engaging shorts effortless. Less editing, more creating!",
  "Love how easy Zybble makes video repurposing. AI captions and smart framing save so much time!",
  "An easy, powerful way to turn long recordings into social-ready clips. A great tool for creators!",
];
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const samples = page.getByRole("region", { name: "Sample Clips" });
  const testimonials = page.getByRole("region", {
    name: "Creators Love What Zybble Does",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (event) => {
    if (event.type() === "error") errors.push(event.text());
  });
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [768, 1024],
    [390, 844],
    [360, 800],
    [1000, 900],
    [999, 900],
  ]) {
    await page.setViewportSize({ width, height });
    assert.equal((await page.goto(origin)).status(), 200);
    assert.equal(await samples.locator("video[src]").count(), 0);
    assert.deepEqual(
      await testimonials.getByRole("heading", { level: 3 }).allTextContents(),
      ["Tejas Sutar", "Anshu Pandey", "Letissia Merloni"],
    );
    assert.deepEqual(
      await testimonials.locator("blockquote").allTextContents(),
      reviews,
    );
    assert.deepEqual(
      await testimonials.evaluate((el) => [
        el.previousElementSibling.id,
        el.previousElementSibling.previousElementSibling.classList.contains(
          "use-section",
        ),
        el.nextElementSibling.classList.contains("pricing-section"),
      ]),
      ["sample-clips", true, true],
    );
    for (const image of await testimonials.getByRole("img").all()) {
      await image.scrollIntoViewIfNeeded();
      assert(
        await image.evaluate(async (img) => {
          await img.decode();
          return img.naturalWidth > 0;
        }),
      );
    }
    const cards = await testimonials
      .getByRole("listitem")
      .evaluateAll((items) =>
        items.map((item) => {
          const { x, y, width, height } = item.getBoundingClientRect();
          return {
            x,
            y,
            width,
            height,
            overflow: item.scrollWidth > item.clientWidth,
          };
        }),
      );
    assert(cards.every((card) => !card.overflow));
    if (width < 1000) {
      assert(
        cards.every(
          (card) => card.x === cards[0].x && card.width === cards[0].width,
        ),
      );
      assert(cards[0].y + cards[0].height <= cards[1].y);
      assert(cards[1].y + cards[1].height <= cards[2].y);
    } else {
      assert(
        cards[0].x + cards[0].width <= cards[1].x &&
          cards[1].x + cards[1].width <= cards[2].x,
      );
      assert(cards[1].y > cards[0].y);
    }
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.equal(
      await samples.locator("iframe, a[href*='drive.google.com']").count(),
      0,
    );
    assert.equal(
      await samples
        .getByRole("button", { name: /auto scroll|previous|next/i })
        .count(),
      0,
    );
    assert.equal(await samples.locator("video").count(), hasMedia ? 5 : 0);
    assert.equal(
      await samples.locator("video[controls], video[muted]").count(),
      0,
    );
    const sampleHeader = samples.locator(".section-title");
    assert.equal(
      await sampleHeader.locator(".eyebrow").textContent(),
      "VIDEO EXAMPLES",
    );
    assert.equal(
      await sampleHeader.locator("p").textContent(),
      "Explore five vertical clips with on-screen captions. Select a clip to watch it with sound.",
    );
    assert(
      await samples.evaluate((section) => {
        const style = getComputedStyle(section);
        const testimonials = getComputedStyle(section.nextElementSibling);
        const sampleHeader = getComputedStyle(
          section.querySelector(".section-title"),
        );
        const previousHeader = getComputedStyle(
          section.previousElementSibling.querySelector(".section-title"),
        );
        return (
          style.paddingBlockStart === testimonials.paddingBlockStart &&
          style.paddingBlockEnd === testimonials.paddingBlockEnd &&
          sampleHeader.marginBlockEnd === previousHeader.marginBlockEnd
        );
      }),
      "Sample Clips uses standard section padding and heading spacing",
    );
    assert(
      await samples.evaluate((section) => {
        const separator = getComputedStyle(section);
        const platform = getComputedStyle(
          document.querySelector(".platform-strip"),
        );
        return (
          separator.borderTopWidth === "1px" &&
          separator.borderTopStyle === "solid" &&
          separator.borderTopColor === platform.borderTopColor
        );
      }),
      "The divider matches the homepage section separators",
    );
    if (hasMedia) {
      assert(
        await samples.getByRole("list").evaluate((list) => {
          const bounds = list.getBoundingClientRect();
          return (
            Math.abs(bounds.left) < 1 &&
            Math.abs(bounds.right - document.documentElement.clientWidth) < 1
          );
        }),
        "Carousel is flush with both edges",
      );
    } else
      await samples.getByText("Sample clips are not available yet.").waitFor();
  }

  if (hasMedia) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin);
    const list = samples.getByRole("list");
    const first = list.getByRole("listitem").first();
    const position = () =>
      first.evaluate((item) => item.getBoundingClientRect().left);
    await list.scrollIntoViewIfNeeded();
    const initial = await position();
    await page.waitForTimeout(350);
    assert.equal(
      await position(),
      initial,
      "Reduced motion disables automatic advance",
    );
    await list.focus();
    await page.keyboard.press("ArrowRight");
    assert(Math.abs((await position()) - initial) > 50);
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    assert(
      Math.abs((await position()) - initial) < 1,
      "Once around the loop returns to the initial position",
    );

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(origin);
    await list.scrollIntoViewIfNeeded();
    const before = await position();
    await page.waitForTimeout(420);
    assert(
      Math.abs((await position()) - before) > 3,
      "Visible loop advances without interaction",
    );
    // Unlock audible hover playback with an actual user gesture first.
    await samples.getByRole("heading", { name: "Sample Clips" }).click();
    await list.scrollIntoViewIfNeeded();
    const hoveredCard = await first.boundingBox();
    await page.mouse.move(
      hoveredCard.x + hoveredCard.width / 2,
      hoveredCard.y + 100,
    );
    await page.waitForFunction(() => {
      const video = document.querySelector("#sample-clips video");
      return (
        video?.readyState >= 2 &&
        !video.paused &&
        !video.muted &&
        !video.controls
      );
    });
    const hover = await position();
    await page.waitForTimeout(350);
    assert.equal(await position(), hover, "Hover and playback stop the loop");
    assert.equal(
      await samples
        .locator("video")
        .evaluateAll(
          (videos) => videos.filter((video) => !video.paused).length,
        ),
      1,
    );
    await page.mouse.move(0, 0);
    assert(await first.locator("video").evaluate((video) => video.paused));
    await list.focus();
    const focused = await position();
    await page.waitForTimeout(350);
    assert.equal(await position(), focused, "Keyboard focus stops the loop");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(origin);
    for (const [index, expectedSeconds] of [
      23.15, 15.23, 36.23, 57.73, 38.71,
    ].entries()) {
      const card = list.getByRole("listitem").nth(index);
      const player = card.locator("video");
      const expectedPath = `/media/samples/sample-0${index + 1}`;
      assert.equal(await player.getAttribute("poster"), `${expectedPath}.webp`);
      await card
        .getByRole("button", { name: `Play sample video ${index + 1}` })
        .press("Enter");
      await page.waitForFunction(
        ({ index, expectedPath }) => {
          const video = document.querySelectorAll("#sample-clips video")[index];
          return (
            video?.readyState >= 2 &&
            !video.paused &&
            !video.muted &&
            new URL(video.currentSrc).pathname === `${expectedPath}.mp4`
          );
        },
        { index, expectedPath },
      );
      const details = await player.evaluate((video) => ({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      }));
      assert(Math.abs(details.duration - expectedSeconds) < 0.3);
      assert.deepEqual([details.width, details.height], [480, 854]);
      assert.equal(
        await list
          .locator("video")
          .evaluateAll(
            (videos) => videos.filter((video) => !video.paused).length,
          ),
        1,
      );
    }

    const last = list.getByRole("listitem").last();
    await last
      .getByRole("button", { name: "Pause sample video 5" })
      .press("Enter");
    assert(await last.locator("video").evaluate((video) => video.paused));

    // Exercise the unactivated-browser policy explicitly rather than relying on
    // the headless browser's autoplay settings.
    const restricted = await browser.newPage({ reducedMotion: "reduce" });
    await restricted.addInitScript(() => {
      const play = HTMLMediaElement.prototype.play;
      let activated = false;
      window.addEventListener(
        "pointerdown",
        () => {
          activated = true;
        },
        { capture: true, once: true },
      );
      HTMLMediaElement.prototype.play = function () {
        if (!activated && !this.muted) {
          document.documentElement.dataset.autoplayRejected = "true";
          return Promise.reject(
            new DOMException("Activation required", "NotAllowedError"),
          );
        }
        return play.call(this);
      };
    });
    await restricted.goto(origin);
    const restrictedSample = restricted.getByRole("button", {
      name: "Play sample video 1",
    });
    await restrictedSample.hover();
    await restricted.locator("html[data-autoplay-rejected=true]").waitFor();
    const restrictedVideo = restricted.locator("#sample-clips video").first();
    assert(
      await restrictedVideo.evaluate(
        (video) => video.paused && !video.muted && !video.controls,
      ),
    );
    await restrictedSample.click();
    await restricted.waitForFunction(() => {
      const video = document.querySelector("#sample-clips video");
      return (
        video?.readyState >= 2 &&
        !video.paused &&
        !video.muted &&
        !video.controls
      );
    });

    const touchPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    await touchPage.goto(origin);
    const touchList = touchPage
      .getByRole("region", { name: "Sample Clips" })
      .getByRole("list");
    await touchList.scrollIntoViewIfNeeded();
    const box = await touchList.boundingBox();
    const firstCard = touchList.getByRole("listitem").first();
    const firstX = await firstCard.evaluate(
      (item) => item.getBoundingClientRect().left,
    );
    const session = await touchPage.context().newCDPSession(touchPage);
    const y = Math.round(box.y + 100);
    const dispatch = (type, points) =>
      session.send("Input.dispatchTouchEvent", { type, touchPoints: points });
    await dispatch("touchStart", [{ x: 245, y }]);
    for (let x = 225; x >= 65; x -= 20) await dispatch("touchMove", [{ x, y }]);
    await dispatch("touchEnd", []);
    assert(
      Math.abs(
        (await firstCard.evaluate(
          (item) => item.getBoundingClientRect().left,
        )) - firstX,
      ) > 50,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    `Homepage stories passed: approved reviews, order, avatars, no overflow/errors at seven sizes, ${hasMedia ? "edge-to-edge layout, HUD-free sound playback, autoplay policy fallback, hover/focus pause, looping, reduced motion and touch drag" : "honest no-media state without Drive embeds"}.`,
  );
} finally {
  await browser.close();
}
