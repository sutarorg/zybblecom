"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, progress, purchases } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function toggleLessonComplete(lessonId: string, courseId: string) {
  const user = await requireUser(`/learn/${courseId}`);

  // Verify the user can access this course (bought it or created it).
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) return;
  if (course.creatorId !== user.id && !user.isAdmin) {
    const [own] = await db
      .select({ id: purchases.id })
      .from(purchases)
      .where(
        and(
          eq(purchases.buyerId, user.id),
          eq(purchases.courseId, courseId),
          eq(purchases.status, "paid"),
        ),
      )
      .limit(1);
    if (!own) return;
  }

  const [existing] = await db
    .select()
    .from(progress)
    .where(and(eq(progress.userId, user.id), eq(progress.lessonId, lessonId)))
    .limit(1);

  if (existing) {
    await db.delete(progress).where(eq(progress.id, existing.id));
  } else {
    await db
      .insert(progress)
      .values({ userId: user.id, courseId, lessonId })
      .onConflictDoNothing();
  }

  revalidatePath(`/learn/${courseId}`);
  revalidatePath("/my-courses");
}
