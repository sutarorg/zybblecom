import { headers } from "next/headers";
import type { Currency } from "@/config/credit-packs";

/** Display only. Checkout must independently resolve country, currency and pack on the server. */
export type PricingContext = { countryCode: string | null; currency: Currency };
export function resolvePricing(countryCode: string | null): PricingContext {
  const code = countryCode?.trim().toUpperCase() ?? "";
  return {
    countryCode: /^[A-Z]{2}$/.test(code) ? code : null,
    currency: code === "IN" ? "INR" : "USD",
  };
}

/** Trust this header only behind Vercel (or an explicitly configured ingress that overwrites it). */
export async function requestPricing(): Promise<PricingContext> {
  const useHeader =
    process.env.VERCEL === "1" || process.env.PRICING_COUNTRY_HEADER === "1";
  return resolvePricing(
    useHeader ? (await headers()).get("x-vercel-ip-country") : null,
  );
}
