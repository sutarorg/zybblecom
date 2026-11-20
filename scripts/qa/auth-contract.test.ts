import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createFrontendServices,
  accountDestination,
} from "../../src/lib/services";
import { serviceMessage } from "../../src/lib/services/messages";
import {
  validateAuth,
  validNewPassword,
} from "../../src/lib/services/validation";

const passphrase = "local validation passphrase";

test("reset password checks length and mismatch without a recovery session", () => {
  const form = new FormData();
  assert.ok(validateAuth("reset", form).password);
  assert.ok(validateAuth("reset", form).confirmPassword);
  form.set("password", "too short");
  form.set("confirmPassword", passphrase);
  assert.deepEqual(validateAuth("reset", form), {
    password: "Use 15–128 characters.",
    confirmPassword: "Your passwords don’t match.",
  });
  form.set("password", passphrase);
  assert.deepEqual(validateAuth("reset", form), {});
  assert.equal(validNewPassword("🦉".repeat(15)), true);
});

test("unconnected services never return success or session data", async () => {
  const services = createFrontendServices();
  const calls = [
    services.login({ email: "qa@example.invalid", password: passphrase }),
    services.signup({
      email: "qa@example.invalid",
      fullName: "Contract test",
      password: passphrase,
      termsAccepted: true,
    }),
    services.logout(),
    services.getSession(),
    services.getRecoveryState(),
    services.requestPasswordRecovery({ email: "qa@example.invalid" }),
    services.resetPassword({ password: passphrase }),
    services.resendVerification({ email: "qa@example.invalid" }),
    services.getEmailVerification(),
    services.completeCallback({ kind: "code", value: "unverified" }),
    services.completeOnboarding({ contentType: "Interviews" }),
    services.createCheckout({ packId: "studio" }),
    services.getPaymentStatus({ reference: "unverified" }),
  ];
  for (const result of await Promise.all(calls))
    assert.deepEqual(result, { ok: false, error: "unavailable" });
});

test("validation short-circuits before the adapter and errors never expose thrown details", async () => {
  let called = 0;
  const services = createFrontendServices({
    async login() {
      called++;
      throw new Error("internal failure");
    },
  });
  assert.deepEqual(
    await services.login({ email: "invalid", password: passphrase }),
    { ok: false, error: "validation" },
  );
  assert.equal(called, 0);
  assert.deepEqual(
    await services.login({ email: "qa@example.invalid", password: passphrase }),
    { ok: false, error: "network" },
  );
  assert.equal(called, 1);
  assert.deepEqual(await services.createCheckout({ packId: "unknown" }), {
    ok: false,
    error: "validation",
  });
  assert.deepEqual(
    await services.getPaymentStatus({ reference: "https://example.invalid/" }),
    { ok: false, error: "validation" },
  );
  assert.match(serviceMessage("invalid_credentials"), /email and password/);
  assert.match(serviceMessage("expired_link"), /expired/);
  assert.match(serviceMessage("network"), /connection/);
  assert.equal(accountDestination(false), "/onboarding");
  assert.equal(accountDestination(true), "/dashboard");
});
