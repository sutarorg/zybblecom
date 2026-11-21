import "server-only";
import DodoPayments from "dodopayments";
import { authSettings } from "./supabase";
import type { Currency } from "@/config/credit-packs";
import {
  checkoutReadiness,
  dodoEnvironmentMatches,
  dodoVariable,
  expectedDodoMode,
} from "./dodo-readiness";

export function dodoSettings() {
  const mode = expectedDodoMode(process.env);
  const bearerToken =
    process.env[dodoVariable(mode, "PAYMENTS_API_KEY")]?.trim();
  const webhookKey = process.env[dodoVariable(mode, "WEBHOOK_SECRET")]?.trim();
  const config = authSettings();
  if (
    !config ||
    !bearerToken ||
    !webhookKey ||
    !dodoEnvironmentMatches(process.env, mode)
  )
    return null;
  return {
    origin: config.origin,
    mode,
    client: new DodoPayments({
      bearerToken,
      environment: mode,
      // Pin the API host so an SDK environment override cannot mix modes.
      baseURL:
        mode === "live_mode"
          ? "https://live.dodopayments.com"
          : "https://test.dodopayments.com",
      webhookKey,
      timeout: 8000,
      maxRetries: 0,
    }),
  };
}
export const checkoutEnabled = (packId: string, currency: Currency) =>
  checkoutReadiness(process.env, packId, currency).ready;
