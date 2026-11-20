import "server-only";
import { z } from "zod";
import { dodoSettings } from "./dodo";
import { verifySession } from "./session";
import type { PaymentStatus, ServiceResult } from "@/lib/services/contracts";

export async function purchaseStatus(
  reference?: string,
): Promise<ServiceResult<PaymentStatus>> {
  if (!dodoSettings()) return { ok: false, error: "unavailable" };
  if (!z.uuid().safeParse(reference).success)
    return { ok: false, error: "validation" };
  try {
    const { client, user } = await verifySession();
    const { data, error } = await client
      .from("credit_purchases")
      .select(
        "pack_slug,credits,amount_minor,currency,payment_status,fulfillment_status",
      )
      .eq("user_id", user.id)
      .eq("id", reference!)
      .maybeSingle();
    if (error) return { ok: false, error: "unexpected" };
    if (!data) return { ok: false, error: "unauthorized" };
    if (
      data.payment_status === "succeeded" &&
      data.fulfillment_status === "fulfilled" &&
      (data.currency === "INR" || data.currency === "USD")
    ) {
      return {
        ok: true,
        value: {
          kind: "confirmed",
          packId: data.pack_slug,
          creditsGranted: data.credits,
          amountMinor: data.amount_minor,
          currency: data.currency,
        },
      };
    }
    if (data.fulfillment_status === "review")
      return { ok: true, value: { kind: "review" } };
    if (["failed", "expired", "cancelled"].includes(data.payment_status))
      return { ok: true, value: { kind: "not_completed" } };
    return { ok: true, value: { kind: "pending" } };
  } catch {
    return { ok: false, error: "unauthorized" };
  }
}
