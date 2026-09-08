import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { courses, purchases } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { computeSplit } from "@/lib/money";
import { createOrder, razorpayConfigured } from "@/lib/razorpay";
import { getPlatformSettings } from "@/lib/settings";
import { uid } from "@/lib/utils";

const schema = z.object({ courseId: z.string().uuid() });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid course" }, { status: 400 });
  }

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, parsed.data.courseId))
    .limit(1);

  if (!course || course.status !== "published") {
    return NextResponse.json({ error: "This course is not available." }, { status: 404 });
  }
  if (course.creatorId === user.id) {
    return NextResponse.json({ error: "You created this course — open it in Studio." }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: purchases.id })
    .from(purchases)
    .where(
      and(
        eq(purchases.buyerId, user.id),
        eq(purchases.courseId, course.id),
        eq(purchases.status, "paid"),
      ),
    )
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: "already_owned" }, { status: 409 });
  }

  const settings = await getPlatformSettings();
  const gross = course.pricePaise;
  const { feePaise, creatorPaise } = computeSplit(gross, settings.feePercent);

  // Free course — enroll instantly, no gateway involved.
  if (gross === 0) {
    try {
      await db.insert(purchases).values({
        courseId: course.id,
        creatorId: course.creatorId,
        buyerId: user.id,
        razorpayOrderId: uid("free_"),
        grossPaise: 0,
        feePaise: 0,
        creatorPaise: 0,
        status: "paid",
        method: "free",
        paidAt: new Date(),
      });
    } catch {
      return NextResponse.json({ error: "already_owned" }, { status: 409 });
    }
    return NextResponse.json({ free: true, courseId: course.id });
  }

  const { orderId, keyId, testMode } = await createOrder({
    amountPaise: gross,
    receipt: uid("zy_").slice(0, 40),
    notes: { courseId: course.id, buyer: user.email, brand: "zybble" },
  });

  await db.insert(purchases).values({
    courseId: course.id,
    creatorId: course.creatorId,
    buyerId: user.id,
    razorpayOrderId: orderId,
    grossPaise: gross,
    feePaise,
    creatorPaise,
    status: "created",
  });

  return NextResponse.json({
    orderId,
    keyId,
    testMode,
    amountPaise: gross,
    currency: "INR",
    courseTitle: course.title,
    courseId: course.id,
    prefill: { name: user.name, email: user.email },
    gatewayLabel: razorpayConfigured() ? "Razorpay" : "Test mode",
  });
}
