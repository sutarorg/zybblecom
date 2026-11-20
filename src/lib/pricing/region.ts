import { headers } from "next/headers";
import { creditPacks, type Currency } from "@/config/credit-packs";

import "server-only";

export type PricingContext = { countryCode: string | null; currency: Currency };
export function resolvePricing(countryCode: string | null): PricingContext {
  const code = countryCode?.trim().toUpperCase() ?? "";
  return {
    countryCode: /^[A-Z]{2}$/.test(code) ? code : null,
    currency: code === "IN" ? "INR" : "USD",
  };
}

/** Trust this header only behind Vercel (or an explicitly configured ingress that overwrites it). */
export async function getVisitorCountry(): Promise<string | null> {
  const useHeader =
    process.env.VERCEL === "1" || process.env.PRICING_COUNTRY_HEADER === "1";
  const incoming = await headers();
  return resolvePricing(useHeader ? incoming.get("x-vercel-ip-country") : null)
    .countryCode;
}

export const requestPricing = async () =>
  resolvePricing(await getVisitorCountry());
export const getVisitorCurrency = async () => (await requestPricing()).currency;
export async function getLocalizedPricing() {
  const currency = await getVisitorCurrency();
  return creditPacks.map((pack) => ({
    pack,
    currency,
    amountMinor: pack.pricesMinor[currency],
  }));
}
export function getDodoProductId(packId: string, currency: Currency) {
  if (!creditPacks.some((pack) => pack.id === packId)) return null;
  return (
    process.env[`DODO_PRODUCT_${packId.toUpperCase()}_${currency}`] || null
  );
}
