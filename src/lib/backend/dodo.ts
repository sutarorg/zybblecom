import "server-only";
import DodoPayments from "dodopayments";
import { authSettings } from "./supabase";
import type { Currency } from "@/config/credit-packs";
import { checkoutReadiness, testMode } from "./dodo-readiness";

export { testMode };
export function dodoSettings() {
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY;
  const webhookKey = process.env.DODO_WEBHOOK_SECRET;
  const config = authSettings();
  if (
    !config ||
    !bearerToken ||
    !webhookKey ||
    process.env.DODO_MODE !== testMode ||
    process.env.VERCEL_ENV === "production" ||
    config.origin === "https://zybble.com"
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
export const checkoutEnabled = (packId: string, currency: Currency) =>
  checkoutReadiness(process.env, packId, currency).ready;
