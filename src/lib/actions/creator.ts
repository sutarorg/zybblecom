"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { courses, lessons, payoutAccounts } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export type SimpleState = { error?: string; success?: string } | null;

/** Publish or unpublish a course owned by the current user. */
export async function setCourseStatus(courseId: string, status: "draft" | "published") {
  const user = await requireUser("/creator/courses");
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!course || course.creatorId !== user.id) return;

  if (status === "published") {
    const lessonCount = await db.$count(lessons, eq(lessons.courseId, courseId));
    if (lessonCount === 0) return; // course editor blocks publish without lessons too
  }

  await db
    .update(courses)
    .set({ status, updatedAt: new Date() })
    .where(eq(courses.id, courseId));
  revalidatePath("/creator/courses");
  revalidatePath("/creator");
  revalidatePath(`/creator/courses/${courseId}`);
}

const bankSchema = z.object({
  holderName: z.string().trim().min(2, "Enter the account holder name").max(80),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{9,18}$/, "Account number must be 9–18 digits"),
  ifsc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC (e.g. HDFC0001234)"),
});

/** Save the creator's settlement bank account (server-side only data). */
export async function saveBankAccount(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const user = await requireUser("/creator/settings");
  const parsed = bankSchema.safeParse({
    holderName: formData.get("holderName"),
    accountNumber: formData.get("accountNumber"),
    ifsc: formData.get("ifsc"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid bank details" };
  }

  await db
    .insert(payoutAccounts)
    .values({ userId: user.id, ...parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: payoutAccounts.userId,
      set: { ...parsed.data, updatedAt: new Date() },
    });

  revalidatePath("/creator/settings");
  revalidatePath("/creator/payouts");
  return { success: "Bank account saved. You're eligible for the next 4:00 PM settlement." };
}
