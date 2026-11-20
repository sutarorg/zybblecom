import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveAuthSettings } from "../../src/lib/backend/auth-config";
import {
  createFrontendServices,
  accountDestination,
} from "../../src/lib/services";
import { serviceMessage } from "../../src/lib/services/messages";
import {
  validateAuth,
  validNewPassword,
} from "../../src/lib/services/validation";

const passphrase = "Local fixture 8";
const legacyPassword = "local legacy validation passphrase";

test("reset password checks length and mismatch without a recovery session", () => {
  const form = new FormData();
  assert.ok(validateAuth("reset", form).password);
  assert.ok(validateAuth("reset", form).confirmPassword);
  form.set("password", "short7!");
  form.set("confirmPassword", passphrase);
  assert.deepEqual(validateAuth("reset", form), {
    password: "Use 8–16 characters.",
    confirmPassword: "Your passwords don’t match.",
  });
  form.set("password", passphrase);
  assert.deepEqual(validateAuth("reset", form), {});
  form.set("password", "Example8");
  form.set("confirmPassword", "Example8");
  assert.deepEqual(validateAuth("reset", form), {});
  assert.equal(validNewPassword("x".repeat(7)), false);
  assert.equal(validNewPassword("🦉".repeat(8)), true);
  assert.equal(validNewPassword("x".repeat(16)), true);
  assert.equal(validNewPassword("x".repeat(17)), false);
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
    await services.login({
      email: "qa@example.invalid",
      password: legacyPassword,
    }),
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

test("auth supports integration public aliases but requires explicit origin and server-only secrets", () => {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co/",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
    SUPABASE_SECRET_KEY: "sb_secret_fixture",
    AUTH_STATE_SECRET: "a".repeat(32),
    APP_ORIGIN: " https://staging.example.invalid/ ",
  };
  assert.deepEqual(resolveAuthSettings(env), {
    url: "https://fixture.supabase.co",
    key: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    secret: env.SUPABASE_SECRET_KEY,
    recoveryKey: env.AUTH_STATE_SECRET,
    origin: "https://staging.example.invalid",
    secure: true,
  });
  assert.equal(
    resolveAuthSettings({
      ...env,
      SUPABASE_PUBLISHABLE_KEY: "configured-preferred",
    })?.key,
    "configured-preferred",
  );
  assert.equal(
    resolveAuthSettings({ ...env, SUPABASE_SECRET_KEY: undefined }),
    null,
  );
  assert.equal(resolveAuthSettings({ ...env, APP_ORIGIN: undefined }), null);
  assert.equal(
    resolveAuthSettings({
      ...env,
      APP_ORIGIN: "https://staging.example.invalid/?junk",
    }),
    null,
  );
  assert.equal(
    resolveAuthSettings({ ...env, AUTH_STATE_SECRET: "too short" }),
    null,
  );
  assert.equal(
    resolveAuthSettings({
      ...env,
      SUPABASE_URL: "https://fixture.supabase.co/rest/v1",
    }),
    null,
  );
  assert.equal(
    resolveAuthSettings({ ...env, SUPABASE_URL: "http://fixture.supabase.co" }),
    null,
  );
  assert.equal(
    resolveAuthSettings({
      ...env,
      SUPABASE_PUBLISHABLE_KEY: "sb_secret_fixture",
    }),
    null,
  );
});

test("a public auth deployment requires its HTTPS origin, not a redirected HTTP URL", () => {
  const env = {
    SUPABASE_URL: "https://fixture.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
    SUPABASE_SECRET_KEY: "sb_secret_fixture",
    AUTH_STATE_SECRET: "a".repeat(32),
  };
  assert.equal(
    resolveAuthSettings({ ...env, APP_ORIGIN: "http://zybble.com" }),
    null,
  );
  const settings = resolveAuthSettings({
    ...env,
    APP_ORIGIN: "https://zybble.com",
  });
  assert.equal(settings?.origin, "https://zybble.com");
  assert.equal(settings?.secure, true);
  assert.equal(
    resolveAuthSettings({ ...env, APP_ORIGIN: "http://localhost:3000" })
      ?.secure,
    false,
  );
});
