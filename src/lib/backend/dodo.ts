import "server-only";
import DodoPayments from "dodopayments";
import { authSettings } from "./supabase";
import type { Currency } from "@/config/credit-packs";
import {
  checkoutReadiness,
  productionCheckoutOrigin,
  testMode,
} from "./dodo-readiness";

export { testMode };
export function dodoSettings() {
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY?.trim();
  const webhookKey = process.env.DODO_WEBHOOK_SECRET?.trim();
  const config = authSettings();
  if (
    !config ||
    !bearerToken ||
    !webhookKey ||
    process.env.DODO_MODE !== testMode ||
    productionCheckoutOrigin(process.env)
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
