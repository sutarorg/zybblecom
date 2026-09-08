import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { purchases } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { markPurchasePaid } from "@/lib/checkout";
import { verifyPaymentSignature } from "@/lib/razorpay";

const schema = z.object({
  orderId: z.string().min(4),
  paymentId: z.string().min(4),
  signature: z.string().min(8),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { orderId, paymentId, signature } = parsed.data;

  // The signature is ALWAYS verified server-side against the gateway secret.
  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
  }

  const result = await markPurchasePaid(orderId, paymentId, "razorpay");
  if (result.kind === "missing") {
    return NextResponse.json({ error: "Unknown order." }, { status: 404 });
  }
  if (result.kind === "duplicate") {
    return NextResponse.json({ error: "already_owned" }, { status: 409 });
  }

  const [row] = await db
    .select({ courseId: purchases.courseId })
    .from(purchases)
    .where(eq(purchases.razorpayOrderId, orderId))
    .limit(1);

  return NextResponse.json({ ok: true, courseId: row?.courseId });
}
