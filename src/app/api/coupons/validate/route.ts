import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { computeCoursePrice } from "@/lib/queries";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Log in to apply a coupon." }, { status: 401 });

  let payload: { slug?: string; code?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const slug = payload.slug?.trim();
  const code = payload.code?.trim();
  if (!slug || !code) return NextResponse.json({ ok: false, error: "Enter a coupon code." }, { status: 400 });

  const [course] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  if (!course || course.status !== "published") {
    return NextResponse.json({ ok: false, error: "Course not found." }, { status: 404 });
  }

  const price = await computeCoursePrice(course, code);
  if (!price.ok) return NextResponse.json({ ok: false, error: price.error }, { status: 200 });

  return NextResponse.json({
    ok: true,
    gross: price.gross,
    discount: price.discount,
    net: price.net,
    code: price.coupon?.code ?? code.toUpperCase(),
  });
}
