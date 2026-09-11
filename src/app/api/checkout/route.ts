import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { coupons, courses, enrollments, orders } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { computeCoursePrice, grantEnrollment } from "@/lib/queries";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

async function createRazorpayOrder(amountPaise: number, receipt: string) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return { configured: false as const };

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt }),
  });
  const body = (await res.json().catch(() => null)) as
    | { id?: string; error?: { description?: string } }
    | null;
  if (!res.ok || !body?.id) {
    return {
      configured: true as const,
      error: body?.error?.description ?? "the gateway rejected the order",
    };
  }
  return { configured: true as const, keyId, id: body.id };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return json(401, { error: "Please log in to continue." });

  let payload: { slug?: string; coupon?: string };
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Invalid request." });
  }
  const slug = payload.slug?.trim();
  if (!slug) return json(400, { error: "Missing course." });

  const [course] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  if (!course || course.status !== "published") return json(404, { error: "Course not found." });
  if (course.creatorId === user.id) return json(400, { error: "You can't buy your own course." });

  const [enrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, course.id), eq(enrollments.studentId, user.id)))
    .limit(1);
  if (enrollment) return json(409, { error: "You're already enrolled in this course." });

  const price = await computeCoursePrice(course, payload.coupon);
  if (!price.ok) return json(400, { error: price.error });

  // Free flow — no gateway needed.
  if (price.net === 0) {
    const [order] = await db
      .insert(orders)
      .values({
        courseId: course.id,
        buyerId: user.id,
        couponId: price.coupon?.id ?? null,
        grossPaise: price.gross,
        discountPaise: price.discount,
        netPaise: 0,
        platformFeePaise: 0,
        creatorEarningPaise: 0,
        status: "paid",
        provider: "free",
      })
      .returning();
    if (price.coupon) {
      await db
        .update(coupons)
        .set({ usedCount: price.coupon.usedCount + 1 })
        .where(eq(coupons.id, price.coupon.id));
    }
    await grantEnrollment(course.id, user.id, order.id);
    return json(200, { kind: "free", courseSlug: course.slug, courseTitle: course.title });
  }

  const rzp = await createRazorpayOrder(price.net, "");
  if (!rzp.configured) {
    return json(503, {
      error:
        "Payments are not configured yet. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server to enable paid checkout.",
    });
  }
  if ("error" in rzp) {
    return json(502, { error: `The payment gateway couldn't create the order (${rzp.error}).` });
  }

  const [order] = await db
    .insert(orders)
    .values({
      courseId: course.id,
      buyerId: user.id,
      couponId: price.coupon?.id ?? null,
      grossPaise: price.gross,
      discountPaise: price.discount,
      netPaise: price.net,
      status: "pending",
      provider: "razorpay",
      providerOrderId: rzp.id,
    })
    .returning();

  return json(200, {
    kind: "paid",
    keyId: rzp.keyId,
    orderId: rzp.id,
    internalOrderId: order.id,
    amount: price.net,
    currency: "INR",
    courseSlug: course.slug,
    courseTitle: course.title,
    prefill: { name: user.name, email: user.email },
  });
}
