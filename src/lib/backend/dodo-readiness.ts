import { creditPacks, type Currency } from "@/config/credit-packs";
import { resolveAuthSettings } from "./auth-config";

type Env = Readonly<Record<string, string | undefined>>;
export const testMode = "test_mode" as const;
const productVariable = (packId: string, currency: Currency) =>
  `DODO_PRODUCT_${packId.toUpperCase()}_${currency}`;
const catalog = creditPacks.flatMap((pack) =>
  (["USD", "INR"] as const).map((currency) =>
    productVariable(pack.id, currency),
  ),
);
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
  requireVar("DODO_MODE", (mode) => mode === testMode);
  requireVar("DODO_PAYMENTS_API_KEY");
  requireVar("DODO_WEBHOOK_SECRET");
  const name = productVariable(packId, currency);
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
  const production =
    environment === "production" ||
    resolveAuthSettings(env)?.origin === "https://zybble.com";
  const enabled = env.DODO_CHECKOUT_ENABLED === "1";
  return {
    ready:
      missing.length === 0 && invalid.length === 0 && enabled && !production,
    missing,
    invalid,
    enabled,
    production,
    environment,
    version: /^[a-f0-9]{40}$/.test(env.VERCEL_GIT_COMMIT_SHA ?? "")
      ? env.VERCEL_GIT_COMMIT_SHA
      : null,
  };
}
