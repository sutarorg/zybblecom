import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { coupons, courses, orders } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { creatorEarningSplit, grantEnrollment } from "@/lib/queries";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return json(401, { error: "Session expired. Please log in again." });

  let payload: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Invalid request." });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return json(400, { error: "Missing payment details." });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return json(503, { error: "Payments are not configured." });

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.providerOrderId, razorpay_order_id), eq(orders.buyerId, user.id)))
    .limit(1);
  if (!order) return json(404, { error: "Order not found." });

  const [course] = await db.select().from(courses).where(eq(courses.id, order.courseId)).limit(1);

  if (order.status === "paid") {
    return json(200, { ok: true, courseSlug: course?.slug });
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(razorpay_signature, "utf8");
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valid) {
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
    return json(400, {
      error: "Payment verification failed. If money was deducted, contact support.",
    });
  }

  const { fee, earning } = await creatorEarningSplit(order.netPaise);
  await db
    .update(orders)
    .set({
      status: "paid",
      providerPaymentId: razorpay_payment_id,
      platformFeePaise: fee,
      creatorEarningPaise: earning,
    })
    .where(eq(orders.id, order.id));

  if (order.couponId) {
    await db
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1` })
      .where(eq(coupons.id, order.couponId));
  }

  await grantEnrollment(order.courseId, user.id, order.id);

  return json(200, { ok: true, courseSlug: course?.slug });
}
