import { creditPacks, type Currency } from "@/config/credit-packs";
import type { DodoMode } from "@/lib/payments/dodo-url";
import { resolveAuthSettings } from "./auth-config";

type Env = Readonly<Record<string, string | undefined>>;
export const productionCheckoutOrigin = (env: Env) =>
  env.VERCEL_ENV === "production" ||
  resolveAuthSettings(env)?.origin === "https://zybble.com";
export const expectedDodoMode = (env: Env): DodoMode =>
  productionCheckoutOrigin(env) ? "live_mode" : "test_mode";
export function dodoVariable(mode: DodoMode, key: string) {
  return mode === "live_mode" ? `DODO_LIVE_${key}` : `DODO_${key}`;
}
export function dodoEnvironmentMatches(env: Env, mode: DodoMode) {
  const origin = resolveAuthSettings(env)?.origin;
  return (
    env.DODO_MODE === mode &&
    mode === expectedDodoMode(env) &&
    (mode !== "live_mode" ||
      (origin === "https://zybble.com" &&
        (env.VERCEL_ENV === "production" ||
          (!env.VERCEL_ENV && env.NODE_ENV === "production"))))
  );
}
export const productVariable = (
  mode: DodoMode,
  packId: string,
  currency: Currency,
) => dodoVariable(mode, `PRODUCT_${packId.toUpperCase()}_${currency}`);
export function checkoutReadiness(
  env: Env,
  packId: string,
  currency: Currency,
) {
  const missing: string[] = [];
  const invalid: string[] = [];
  const requireVar = (
    name: string,
    check?: (value: string) => boolean,
    alias?: string,
  ) => {
    const value = env[name]?.trim() || (alias && env[alias]?.trim());
    if (!value) missing.push(name);
    else if (check && !check(value)) invalid.push(name);
  };
  const isOrigin = (value: string) => {
    try {
      const url = new URL(value);
      return (
        url.origin === value.replace(/\/$/, "") &&
        (url.protocol === "https:" ||
          (url.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(url.hostname)))
      );
    } catch {
      return false;
    }
  };
  requireVar("APP_ORIGIN", isOrigin);
  requireVar("SUPABASE_URL", isOrigin, "NEXT_PUBLIC_SUPABASE_URL");
  requireVar(
    "SUPABASE_PUBLISHABLE_KEY",
    (key) => !key.startsWith("sb_secret_"),
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
  requireVar("SUPABASE_SECRET_KEY");
  requireVar("AUTH_STATE_SECRET", (secret) => secret.length >= 32);
  const mode = expectedDodoMode(env);
  requireVar("DODO_MODE", (value) => value === mode && value === env.DODO_MODE);
  if (
    resolveAuthSettings(env) &&
    env.DODO_MODE === mode &&
    !dodoEnvironmentMatches(env, mode)
  )
    invalid.push("APP_ORIGIN / deployment environment");
  requireVar(dodoVariable(mode, "PAYMENTS_API_KEY"));
  requireVar(dodoVariable(mode, "WEBHOOK_SECRET"));
  const catalog = creditPacks.flatMap((pack) =>
    (["USD", "INR"] as const).map((code) =>
      productVariable(mode, pack.id, code),
    ),
  );
  const name = productVariable(mode, packId, currency);
  if (catalog.includes(name))
    requireVar(
      name,
      (id) =>
        /^pdt_[A-Za-z0-9_-]+$/.test(id) &&
        id === env[name] &&
        !catalog.some((other) => other !== name && env[other]?.trim() === id),
    );
  else invalid.push("pack selection");
  if (!resolveAuthSettings(env) && missing.length === 0 && invalid.length === 0)
    invalid.push("Supabase auth configuration");
  const environment = ["production", "preview", "development"].includes(
    env.VERCEL_ENV ?? "",
  )
    ? env.VERCEL_ENV
    : "local";
  const production = productionCheckoutOrigin(env);
  const enabled = env.DODO_CHECKOUT_ENABLED === "1";
  return {
    ready: missing.length === 0 && invalid.length === 0 && enabled,
    missing,
    invalid,
    enabled,
    production,
    mode,
    environment,
    version: /^[a-f0-9]{40}$/.test(env.VERCEL_GIT_COMMIT_SHA ?? "")
      ? env.VERCEL_GIT_COMMIT_SHA
      : null,
  };
}
