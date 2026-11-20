import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import DodoPayments from "dodopayments";
import { creditPacks } from "../../src/config/credit-packs";

test("approved localized catalog is expressed in minor units", () => {
  assert.deepEqual(
    creditPacks.map((x) => [
      x.id,
      x.credits,
      x.pricesMinor.INR,
      x.pricesMinor.USD,
    ]),
    [
      ["starter", 30, 29900, 900],
      ["creator", 120, 99900, 1900],
      ["studio", 300, 249900, 3900],
    ],
  );
});

test("Dodo SDK accepts exact signed bytes and rejects changed, stale or missing signature inputs", () => {
  const secret = Buffer.alloc(32, 42); // test fixture only; no calls to Dodo
  const sdk = new DodoPayments({
    environment: "test_mode",
    bearerToken: "local-test-fixture",
    webhookKey: `whsec_${secret.toString("base64")}`,
  });
  const raw =
    '{"type":"payment.succeeded", "data":{"payment_id":"pay_fixture"}}';
  const id = "msg_local_fixture";
  const now = Math.round(Date.now() / 1000);
  const signed = (time: number) => ({
    "webhook-id": id,
    "webhook-timestamp": String(time),
    "webhook-signature": `v1,${createHmac("sha256", secret).update(`${id}.${time}.${raw}`).digest("base64")}`,
  });
  assert.equal(
    sdk.webhooks.unwrap(raw, { headers: signed(now) }).type,
    "payment.succeeded",
  );
  assert.throws(() =>
    sdk.webhooks.unwrap(raw.replace(", ", ","), { headers: signed(now) }),
  );
  assert.throws(() => sdk.webhooks.unwrap(raw, { headers: signed(now - 600) }));
  assert.throws(() =>
    sdk.webhooks.unwrap(raw, { headers: { ...signed(now), "webhook-id": "" } }),
  );
});
