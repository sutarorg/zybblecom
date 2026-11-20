import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { checkoutReadiness } from "../../src/lib/backend/dodo-readiness";
import {
  contactFields,
  contactSettings,
} from "../../src/lib/backend/contact-config";
import { normalizeAvatar } from "../../src/lib/backend/avatar-image";
import { avatarMaxBytes } from "../../src/services/avatar-policy";
import { supportedVideoLink } from "../../src/services/video-link";
import { estimateSourceCredits } from "../../src/services/generation-schema";
import { creditPacks } from "../../src/config/credit-packs";

test("local estimates round source minutes only and never exceed the standard limit", () => {
  for (const [seconds, credits] of [
    [30, 1],
    [60, 1],
    [61, 2],
    [300, 5],
    [1800, 30],
    [3600, 60],
    [7200, 120],
    [10800, 180],
  ]) {
    assert.equal(estimateSourceCredits(seconds), credits);
  }
  for (const value of [undefined, 0, -1, Infinity, NaN, 10801])
    assert.equal(estimateSourceCredits(value), null);
});

test("link validation is restricted to HTTPS single videos or direct files", () => {
  for (const url of [
    "https://example.invalid/synth.webm",
    "https://youtube.com/watch?v=Demo",
    "https://youtu.be/Demo",
    "https://drive.google.com/file/d/Demo/view",
    "https://www.twitch.tv/videos/123",
  ])
    assert(supportedVideoLink(url), url);
  for (const url of [
    "http://example.invalid/demo.mp4",
    "https://sub.youtube.com.evil.invalid/watch?v=Demo",
    "https://username:password@youtube.com/watch?v=Demo",
    "https://youtube.com/playlist?list=demo",
    "https://twitch.tv/live-channel",
    "https://vimeo.com/321",
    "https://instagram.com/p/1234/",
    "https://127.0.0.1/demo.mp4",
    "https://example.invalid:1234/demo.mp4",
    `https://example.invalid/${"x".repeat(4096)}.mp4`,
  ])
    assert(!supportedVideoLink(url), url);
});

test("all packs have canonical totals, source minutes and the same included features", () => {
  assert.deepEqual(
    creditPacks.map(({ id, credits, pricesMinor }) => [
      id,
      credits,
      pricesMinor.INR,
      pricesMinor.USD,
    ]),
    [
      ["starter", 30, 29900, 900],
      ["creator", 120, 99900, 1900],
      ["studio", 300, 249900, 3900],
    ],
  );
  for (const pack of creditPacks) {
    assert.equal(
      pack.features[0],
      `${pack.credits} minutes of standard video processing`,
    );
    assert.deepEqual(pack.features.slice(1), [
      "Up to 20 generated clips per source video",
      "AI captions",
      "Smart vertical framing",
      "MP4 downloads",
      "Credits never expire",
    ]);
  }
});

test("test checkout readiness isolates regions and fails closed without disclosing values", () => {
  const env = {
    APP_ORIGIN: "https://staging.example.invalid",
    SUPABASE_URL: "https://fixture.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
    SUPABASE_SECRET_KEY: "sb_secret_fixture",
    AUTH_STATE_SECRET: "a".repeat(32),
    VERCEL_ENV: "preview",
    DODO_MODE: "test_mode",
    DODO_CHECKOUT_ENABLED: "1",
    DODO_PAYMENTS_API_KEY: "fixture-api",
    DODO_WEBHOOK_SECRET: "fixture-webhook",
    DODO_PRODUCT_STARTER_INR: "pdt_fixture1",
    DODO_PRODUCT_STARTER_USD: "pdt_fixture2",
    DODO_PRODUCT_CREATOR_USD: "pdt_fixture3",
    DODO_PRODUCT_CREATOR_INR: "pdt_fixture4",
    DODO_PRODUCT_STUDIO_INR: "pdt_fixture5",
  };
  for (const [pack, currency] of [
    ["starter", "INR"],
    ["starter", "USD"],
    ["creator", "USD"],
    ["creator", "INR"],
    ["studio", "INR"],
  ] as const)
    assert(checkoutReadiness(env, pack, currency).ready);
  assert.deepEqual(checkoutReadiness(env, "studio", "USD").missing, [
    "DODO_PRODUCT_STUDIO_USD",
  ]);
  for (const key of [
    "DODO_PAYMENTS_API_KEY",
    "DODO_WEBHOOK_SECRET",
    "SUPABASE_SECRET_KEY",
  ] as const)
    assert(
      checkoutReadiness(
        { ...env, [key]: "" },
        "starter",
        "INR",
      ).missing.includes(key),
    );
  assert(
    !checkoutReadiness(
      { ...env, DODO_PRODUCT_STARTER_INR: "pdt_fixture2" },
      "starter",
      "INR",
    ).ready,
  );
  assert(
    !checkoutReadiness(
      { ...env, DODO_PRODUCT_STARTER_INR: "invalid" },
      "starter",
      "INR",
    ).ready,
  );
  assert(
    !checkoutReadiness({ ...env, DODO_MODE: "live_mode" }, "starter", "INR")
      .ready,
  );
  assert(
    !checkoutReadiness({ ...env, VERCEL_ENV: "production" }, "starter", "INR")
      .ready,
  );
  assert(
    !checkoutReadiness({ ...env, DODO_CHECKOUT_ENABLED: "0" }, "starter", "INR")
      .ready,
  );
  assert(
    !checkoutReadiness({ ...env, APP_ORIGIN: undefined }, "starter", "INR")
      .ready,
  );
  const summary = JSON.stringify(checkoutReadiness(env, "starter", "INR"));
  for (const secret of [
    env.SUPABASE_SECRET_KEY,
    env.DODO_WEBHOOK_SECRET,
    env.DODO_PAYMENTS_API_KEY,
    env.DODO_PRODUCT_STARTER_INR,
  ])
    assert(!summary.includes(secret));
});

test("contact rejects malformed fields, honeypots and arbitrary recipients", () => {
  const valid = {
    name: "QA",
    email: "qa@example.invalid",
    topic: "Product question",
    message: "Test content only.",
    website: "",
  };
  assert(contactFields.safeParse(valid).success);
  for (const invalid of [
    { name: " " },
    { email: "bad" },
    { topic: "" },
    { message: "" },
    { message: "short" },
    { message: "a".repeat(2001) },
    { website: "bot" },
    { to: "someone@example.invalid" },
  ])
    assert(!contactFields.safeParse({ ...valid, ...invalid }).success);
  assert.equal(
    contactSettings({
      RESEND_API_KEY: "fixture",
      CONTACT_TO_EMAIL: "qa@example.invalid",
    }),
    null,
  );
});

test("avatar validator decodes accepted raster images and normalizes to bounded WebP", async () => {
  for (const format of ["png", "jpeg", "webp", "avif"] as const) {
    const source = await sharp({
      create: { width: 48, height: 32, channels: 3, background: "#6338f5" },
    })
      .toFormat(format)
      .toBuffer();
    const image = await normalizeAvatar(source);
    assert(image, format);
    const { width, height, format: normalized } = await sharp(image).metadata();
    assert.deepEqual(
      { width, height, normalized },
      { width: 384, height: 384, normalized: "webp" },
    );
  }
  const invalid = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
  for (const input of [
    invalid,
    Buffer.from([255, 216, 255]),
    Buffer.alloc(avatarMaxBytes + 1),
  ])
    assert.equal(await normalizeAvatar(input), null);
});
