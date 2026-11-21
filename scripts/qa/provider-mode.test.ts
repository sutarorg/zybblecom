import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import DodoPayments from "dodopayments";
import {
  checkoutReadiness,
  dodoEnvironmentMatches,
  productVariable,
} from "../../src/lib/backend/dodo-readiness";
import { hostedCheckoutURL } from "../../src/lib/payments/dodo-url";
import { creditPacks } from "../../src/config/credit-packs";
import {
  probeSource,
  InvalidSourceError,
} from "../../src/lib/media/source-metadata";
import {
  uploadAction,
  maxSourceBytes,
  maxParts,
} from "../../src/lib/media/source-policy";

const prod: Record<string, string | undefined> = {
  VERCEL_ENV: "production",
  APP_ORIGIN: "https://zybble.com",
  DODO_MODE: "live_mode",
  DODO_CHECKOUT_ENABLED: "1",
  SUPABASE_URL: "https://db.example.invalid",
  SUPABASE_PUBLISHABLE_KEY: "public-fixture",
  SUPABASE_SECRET_KEY: "private-fixture",
  AUTH_STATE_SECRET: "a".repeat(32),
  DODO_LIVE_PAYMENTS_API_KEY: "fixture-live-api",
  DODO_LIVE_WEBHOOK_SECRET: "fixture-live-signature",
};
for (const { id } of creditPacks)
  for (const currency of ["INR", "USD"] as const)
    prod[productVariable("live_mode", id, currency)] =
      `pdt_live_${id}_${currency}`;

test("live checkout needs its own credentials and products for each pack and is unavailable in Preview", () => {
  for (const { id } of creditPacks)
    for (const code of ["INR", "USD"] as const) {
      assert.equal(checkoutReadiness(prod, id, code).ready, true);
      const key = productVariable("live_mode", id, code);
      const readiness = checkoutReadiness(
        {
          ...prod,
          [key]: undefined,
          [productVariable("test_mode", id, code)]: "pdt_test_only",
        },
        id,
        code,
      );
      assert.equal(readiness.ready, false);
      assert.deepEqual(readiness.missing, [key]);
    }
  for (const key of ["DODO_LIVE_PAYMENTS_API_KEY", "DODO_LIVE_WEBHOOK_SECRET"])
    assert.deepEqual(
      checkoutReadiness({ ...prod, [key]: undefined }, "starter", "USD")
        .missing,
      [key],
    );
  assert.equal(
    dodoEnvironmentMatches(
      { ...prod, DODO_CHECKOUT_ENABLED: "0" },
      "live_mode",
    ),
    true,
    "webhooks stay enabled during a checkout pause",
  );
  assert.equal(
    checkoutReadiness({ ...prod, VERCEL_ENV: "preview" }, "starter", "USD")
      .ready,
    false,
  );
  assert.equal(
    checkoutReadiness({ ...prod, DODO_MODE: "test_mode" }, "starter", "USD")
      .ready,
    false,
  );
  assert.equal(
    checkoutReadiness(
      { ...prod, APP_ORIGIN: "https://preview.example.invalid" },
      "starter",
      "USD",
    ).ready,
    false,
  );
});

test("hosted URL restrictions are identical for the browser and server", () => {
  const test = "https://test.checkout.dodopayments.com/session/cks_test";
  const live = "https://checkout.dodopayments.com/session/cks_live";
  assert.equal(hostedCheckoutURL(test, "test_mode")?.href, test);
  assert.equal(hostedCheckoutURL(live, "live_mode")?.href, live);
  for (const invalid of [
    test,
    "https://checkout.dodopayments.com.evil.invalid/session/cks",
    "https://x@checkout.dodopayments.com/session/cks",
    "javascript:alert(1)",
    "http://checkout.dodopayments.com/session/cks",
    "https://checkout.dodopayments.com:444/session/cks",
    "https://checkout.dodopayments.com/session/",
    "https://checkout.dodopayments.com/other/cks",
  ])
    assert.equal(hostedCheckoutURL(invalid, "live_mode"), null, invalid);
  assert.equal(hostedCheckoutURL(live, "test_mode"), null);
});

test("installed Dodo SDK verifies actual Standard Webhooks signatures with mode-specific keys", () => {
  const key = Buffer.from("local signing test secret 1234567");
  const payload = JSON.stringify({
    type: "payment.failed",
    data: { payment_id: "pay_test" },
  });
  const id = "msg_local",
    timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");
  const headers = {
    "webhook-id": id,
    "webhook-timestamp": timestamp,
    "webhook-signature": `v1,${signature}`,
  };
  const testClient = new DodoPayments({
    bearerToken: "test-fixture",
    environment: "test_mode",
    webhookKey: `whsec_${key.toString("base64")}`,
  });
  const liveClient = new DodoPayments({
    bearerToken: "live-fixture",
    environment: "live_mode",
    webhookKey: `whsec_${Buffer.from("different live signing test key").toString("base64")}`,
  });
  assert.equal(testClient.baseURL, "https://test.dodopayments.com");
  assert.equal(liveClient.baseURL, "https://live.dodopayments.com");
  assert.deepEqual(
    testClient.webhooks.unwrap(payload, { headers }),
    JSON.parse(payload),
  );
  assert.throws(() => liveClient.webhooks.unwrap(payload, { headers }));
  assert.throws(() =>
    testClient.webhooks.unwrap(payload.replace("failed", "succeeded"), {
      headers,
    }),
  );
});

test("upload request validation rejects client object keys, forged metadata and limit violations", () => {
  const input = {
    action: "begin",
    title: "Recording",
    filename: "recording.mp4",
    bytes: maxSourceBytes,
    mime: "video/mp4",
  };
  assert(uploadAction.safeParse(input).success);
  for (const patch of [
    { bytes: maxSourceBytes + 1 },
    { filename: "../x.mp4" },
    { bytes: 0 },
    { durationSeconds: 10 },
    { objectKey: "not-owned" },
  ])
    assert(!uploadAction.safeParse({ ...input, ...patch }).success);
  assert(
    !uploadAction.safeParse({
      action: "part",
      uploadId: crypto.randomUUID(),
      number: maxParts + 1,
    }).success,
  );
});

test("source verifier rejects content without a real media container and surfaces read failures", async () => {
  const bytes = Buffer.from("This file contains no video data");
  await assert.rejects(
    probeSource(bytes.length, async (start, end) => bytes.subarray(start, end)),
    InvalidSourceError,
  );
  await assert.rejects(
    probeSource(bytes.length, async () => {
      throw Error("range failed");
    }),
    /range failed/,
  );
});
