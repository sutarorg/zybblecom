import "server-only";
import DodoPayments from "dodopayments";
import { authSettings } from "./supabase";
import { creditPacks } from "@/config/credit-packs";
import { getDodoProductId } from "@/lib/pricing/region";

export const testMode = "test_mode" as const;
export function dodoSettings() {
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY;
  const webhookKey = process.env.DODO_WEBHOOK_SECRET;
  const config = authSettings();
  if (
    !config ||
    !bearerToken ||
    !webhookKey ||
    process.env.DODO_MODE !== testMode
  )
    return null;
  return {
    origin: config.origin,
    webhookKey,
    client: new DodoPayments({
      bearerToken,
      environment: testMode,
      webhookKey,
      timeout: 8000,
      maxRetries: 0,
    }),
  };
}
export function checkoutEnabled() {
  const ids = creditPacks.flatMap((p) => [
    getDodoProductId(p.id, "USD"),
    getDodoProductId(p.id, "INR"),
  ]);
  return Boolean(
    process.env.DODO_CHECKOUT_ENABLED === "1" &&
    ids.every((id) => id && /^pdt_[A-Za-z0-9_-]+$/.test(id)) &&
    new Set(ids).size === 6 &&
    dodoSettings(),
  );
}
