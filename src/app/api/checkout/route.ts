import { z } from "zod";
import type { DodoPayments } from "dodopayments";
import { checkoutEnabled, dodoSettings, testMode } from "@/lib/backend/dodo";
import {
  ApiError,
  limitActor,
  readJSON,
  respond,
  sameOrigin,
} from "@/lib/backend/http";
import { verifySession } from "@/lib/backend/session";
import { privilegedDB } from "@/lib/backend/supabase";
import { creditPacks } from "@/config/credit-packs";
import { getDodoProductId, requestPricing } from "@/lib/pricing/region";

const schema = z.strictObject({
  packId: z.enum(["starter", "creator", "studio"]),
  requestKey: z.uuid(),
});
export async function POST(request: Request) {
  return respond(async () => {
    sameOrigin(request);
    if (!checkoutEnabled()) throw new ApiError("unavailable", 503);
    const parsed = schema.safeParse(await readJSON(request));
    if (!parsed.success) throw new ApiError("validation", 400);
    const { user, profile } = await verifySession(true);
    await limitActor("checkout_user", user.id, 5, 600);
    const { packId, requestKey } = parsed.data;
    const { countryCode, currency } = await requestPricing();
    const pack = creditPacks.find((p) => p.id === packId)!;
    const product = getDodoProductId(packId, currency)!;
    const { client, origin } = dodoSettings()!;
    const opts = {
      billing_currency: currency,
      billing_address: {
        country: (countryCode ?? "US") as DodoPayments.CountryCode,
      },
      product_cart: [{ product_id: product, quantity: 1 }],
      feature_flags: {
        allow_currency_selection: false,
        allow_discount_code: false,
        allow_customer_editing_email: false,
        allow_tax_id: false,
      },
    };
    const db = privilegedDB();
    const { error } = await db
      .from("credit_purchases")
      .insert({
        id: requestKey,
        user_id: user.id,
        pack_slug: packId,
        credits: pack.credits,
        amount_minor: pack.pricesMinor[currency],
        currency,
        provider_mode: testMode,
        dodo_product_id: product,
      });
    if (error)
      throw new ApiError(
        error.code === "23505" ? "conflict" : "unavailable",
        error.code === "23505" ? 409 : 503,
      );
    const preview = await client.checkoutSessions.preview(opts);
    const item = preview.product_cart[0];
    if (
      preview.currency !== currency ||
      preview.current_breakup.total_amount !== pack.pricesMinor[currency] ||
      preview.current_breakup.discount !== 0 ||
      preview.is_byop ||
      preview.product_cart.length !== 1 ||
      !item?.tax_inclusive ||
      item.is_subscription ||
      item.is_usage_based ||
      item.product_id !== product ||
      item.quantity !== 1
    ) {
      await db
        .from("credit_purchases")
        .update({ fulfillment_status: "review" })
        .eq("id", requestKey);
      throw new ApiError("unavailable", 503);
    }
    const session = await client.checkoutSessions.create({
      ...opts,
      customer: { email: user.email!, name: profile.full_name || undefined },
      return_url: `${origin}/checkout/success?reference=${requestKey}`,
      cancel_url: `${origin}/checkout/cancelled`,
      metadata: { zybble_purchase: requestKey, zybble_user: user.id },
    });
    const url = session.checkout_url ? new URL(session.checkout_url) : null;
    if (
      !url ||
      url.origin !== "https://test.checkout.dodopayments.com" ||
      url.username ||
      url.password ||
      !url.pathname.startsWith("/session/") ||
      !session.session_id
    )
      throw new ApiError("unavailable", 503);
    const { data, error: saveError } = await db
      .from("credit_purchases")
      .update({ dodo_checkout_session_id: session.session_id })
      .eq("id", requestKey)
      .eq("user_id", user.id)
      .is("dodo_checkout_session_id", null)
      .select("id")
      .maybeSingle();
    if (saveError || !data) throw new ApiError("unavailable", 503);
    return { checkoutUrl: url.href };
  });
}
