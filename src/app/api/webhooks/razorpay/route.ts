import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { purchases } from "@/db/schema";
import { markPurchasePaid } from "@/lib/checkout";
import { verifyWebhookSignature } from "@/lib/razorpay";

type RazorpayEvent = {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; method?: string } };
  };
};

/**
 * Razorpay webhook — the authoritative source of payment truth.
 * Configure in the Razorpay dashboard:
 *   URL: https://zybble.com/api/webhooks/razorpay
 *   Events: payment.captured, payment.failed
 * Signature is verified against RAZORPAY_WEBHOOK_SECRET before any writes.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;

  if (event.event === "payment.captured" && payment?.order_id && payment.id) {
    // Idempotent — safe to receive multiple times.
    await markPurchasePaid(payment.order_id, payment.id, payment.method ?? null);
  }

  if (event.event === "payment.failed" && payment?.order_id) {
    await db
      .update(purchases)
      .set({ status: "failed", razorpayPaymentId: payment.id ?? null })
      .where(
        and(
          eq(purchases.razorpayOrderId, payment.order_id),
          eq(purchases.status, "created"),
        ),
      );
  }

  return NextResponse.json({ received: true });
}
