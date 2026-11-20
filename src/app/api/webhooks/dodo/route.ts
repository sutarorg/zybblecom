import { z } from "zod";
import { dodoSettings, testMode } from "@/lib/backend/dodo";
import { ApiError, readBody, respond } from "@/lib/backend/http";
import { privilegedDB } from "@/lib/backend/supabase";

const locator = z.string().regex(/^[A-Za-z0-9_-]{1,160}$/);
const payload = z.object({
  type: z.string().max(80),
  data: z.object({ payment_id: locator.optional() }),
});
const processedTypes = new Set([
  "payment.succeeded",
  "payment.failed",
  "payment.cancelled",
  "refund.succeeded",
  "refund.failed",
  "dispute.opened",
  "dispute.accepted",
  "dispute.cancelled",
  "dispute.challenged",
  "dispute.expired",
  "dispute.lost",
  "dispute.won",
]);
export async function POST(request: Request) {
  return respond(async () => {
    const config = dodoSettings();
    if (!config) throw new ApiError("unavailable", 503);
    const headers = Object.fromEntries(
      ["webhook-id", "webhook-timestamp", "webhook-signature"].map((k) => [
        k,
        request.headers.get(k) ?? "",
      ]),
    );
    const eventId = headers["webhook-id"];
    if (
      !locator.safeParse(eventId).success ||
      !/^\d{1,12}$/.test(headers["webhook-timestamp"]) ||
      !headers["webhook-signature"] ||
      headers["webhook-signature"].length > 2048
    )
      throw new ApiError("validation", 400);
    const raw = await readBody(request, 128_000);
    let verified: unknown;
    try {
      verified = config.client.webhooks.unwrap(raw, { headers });
    } catch {
      throw new ApiError("unauthorized", 401);
    }
    const event = payload.safeParse(verified);
    if (!event.success) throw new ApiError("validation", 400);
    const { type, data } = event.data;
    const paymentId = data.payment_id;
    const db = privilegedDB();
    const { error: saveError } = await db
      .from("webhook_events")
      .upsert(
        {
          provider: "dodo",
          provider_event_id: eventId,
          event_type: type,
          signature_verified: true,
          payload_sanitized: { paymentId: paymentId ?? null },
        },
        { onConflict: "provider,provider_event_id", ignoreDuplicates: true },
      );
    if (saveError) throw new ApiError("unavailable", 503);
    const { data: stored, error: loadError } = await db
      .from("webhook_events")
      .select("id,processing_status,event_type,payload_sanitized")
      .eq("provider", "dodo")
      .eq("provider_event_id", eventId)
      .single();
    if (loadError || !stored) throw new ApiError("unavailable", 503);
    if (
      stored.event_type !== type ||
      stored.payload_sanitized.paymentId !== (paymentId ?? null)
    )
      throw new ApiError("conflict", 409);
    if (stored.processing_status === "processed") return { accepted: true };
    const mark = async (message?: string) => {
      const { error } = await db
        .from("webhook_events")
        .update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
          error_message: message ?? null,
        })
        .eq("id", stored.id);
      if (error) throw new ApiError("unavailable", 503);
      return { accepted: true };
    };
    if (!processedTypes.has(type)) return mark();
    if (!paymentId) return mark("MISSING_PAYMENT_LOCATOR_REVIEW");
    const payment = await config.client.payments.retrieve(paymentId);
    const purchaseId = payment.metadata?.zybble_purchase;
    if (!z.uuid().safeParse(purchaseId).success)
      return mark("UNMAPPED_PAYMENT_REVIEW");
    const { data: purchase, error } = await db
      .from("credit_purchases")
      .select(
        "id,user_id,dodo_product_id,dodo_checkout_session_id,currency,amount_minor,provider_mode,fulfillment_status",
      )
      .eq("id", purchaseId)
      .maybeSingle();
    if (error) throw new ApiError("unavailable", 503);
    if (!purchase) return mark("UNMAPPED_PAYMENT_REVIEW");
    const review = async (reason: string, status?: "refunded" | "disputed") => {
      const { error } = await db
        .from("credit_purchases")
        .update({
          fulfillment_status: "review",
          ...(status ? { payment_status: status } : {}),
        })
        .eq("id", purchaseId);
      if (error) throw new ApiError("unavailable", 503);
      return mark(reason);
    };
    if (!purchase.dodo_checkout_session_id)
      throw new ApiError("unavailable", 503);
    if (
      payment.payment_id !== paymentId ||
      payment.metadata.zybble_user !== purchase.user_id ||
      purchase.provider_mode !== testMode ||
      payment.checkout_session_id !== purchase.dodo_checkout_session_id
    )
      return mark("PURCHASE_BINDING_MISMATCH_REVIEW");
    if (
      payment.refund_status ||
      payment.disputes?.length ||
      type.startsWith("dispute.") ||
      type === "refund.succeeded"
    )
      return review(
        "PAYMENT_REVERSAL_REVIEW",
        payment.refund_status || type === "refund.succeeded"
          ? "refunded"
          : "disputed",
      );
    if (type === "refund.failed") return mark("REFUND_FAILED_REVIEW");
    if (type !== "payment.succeeded") {
      if (payment.status === "failed" || payment.status === "cancelled") {
        const { error } = await db
          .from("credit_purchases")
          .update({ payment_status: payment.status })
          .eq("id", purchaseId)
          .eq("payment_status", "pending")
          .eq("fulfillment_status", "pending");
        if (error) throw new ApiError("unavailable", 503);
      }
      return mark();
    }
    if (payment.status !== "succeeded") throw new ApiError("unavailable", 503);
    const cart = payment.product_cart;
    if (
      !cart ||
      cart.length !== 1 ||
      cart[0].quantity !== 1 ||
      cart[0].product_id !== purchase.dodo_product_id ||
      payment.subscription_ids?.length ||
      payment.total_amount !== purchase.amount_minor ||
      payment.currency !== purchase.currency
    )
      return review("PAYMENT_AMOUNT_OR_CART_MISMATCH_REVIEW");
    const { error: grantError } = await db.rpc("grant_purchase_credits", {
      p_purchase: purchaseId,
      p_session: payment.checkout_session_id,
      p_payment: paymentId,
      p_product: cart[0].product_id,
      p_amount: payment.total_amount,
      p_currency: payment.currency,
      p_quantity: cart[0].quantity,
      p_mode: testMode,
    });
    if (grantError?.message === "PAYMENT_REVIEW_REQUIRED")
      return mark("PAYMENT_REVIEW_REQUIRED");
    if (grantError) throw new ApiError("unavailable", 503);
    return mark();
  });
}
