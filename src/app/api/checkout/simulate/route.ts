import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { purchases } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { markPurchasePaid } from "@/lib/checkout";
import { razorpayConfigured } from "@/lib/razorpay";
import { uid } from "@/lib/utils";

const schema = z.object({
  orderId: z.string().startsWith("order_sim_"),
  outcome: z.enum(["success", "failure"]).default("success"),
});

/**
 * TEST MODE ONLY — stands in for the Razorpay gateway handshake when API
 * keys are not configured. Permanently disabled the moment real keys exist.
 */
export async function POST(req: Request) {
  if (razorpayConfigured()) {
    return NextResponse.json({ error: "Not available in live mode." }, { status: 403 });
  }
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { orderId, outcome } = parsed.data;

  const [purchase] = await db
    .select()
    .from(purchases)
    .where(eq(purchases.razorpayOrderId, orderId))
    .limit(1);
  if (!purchase || purchase.buyerId !== user.id) {
    return NextResponse.json({ error: "Unknown order." }, { status: 404 });
  }

  if (outcome === "failure") {
    await db
      .update(purchases)
      .set({ status: "failed", failureReason: "Simulated test failure" })
      .where(eq(purchases.id, purchase.id));
    return NextResponse.json({ ok: false, error: "Simulated payment failure." }, { status: 402 });
  }

  const result = await markPurchasePaid(orderId, uid("pay_sim_"), "test");
  if (result.kind === "duplicate") {
    return NextResponse.json({ error: "already_owned" }, { status: 409 });
  }
  return NextResponse.json({ ok: true, courseId: purchase.courseId });
}
