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
      // Use the SDK's mode-specific host and suppress DODO_PAYMENTS_BASE_URL.
      // The SDK throws if both a base URL and environment are supplied.
      baseURL: null,
      webhookKey,
      timeout: 8000,
      maxRetries: 0,
    }),
  };
}
export const checkoutEnabled = (packId: string, currency: Currency) =>
  checkoutReadiness(process.env, packId, currency).ready;
