"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { chapters, courses, lessonProgress, lessons } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getEnrollment } from "@/lib/queries";

export type ProgressResult =
  | { ok: true; completed: boolean; done: number; total: number }
  | { ok: false; error: string };

export async function toggleLessonComplete(lessonId: string): Promise<ProgressResult> {
  const user = await requireUser();

  const [row] = await db
    .select({ lesson: lessons, course: courses })
    .from(lessons)
    .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
    .innerJoin(courses, eq(chapters.courseId, courses.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!row) return { ok: false, error: "Lesson not found." };

  const enrollment = await getEnrollment(row.course.id, user.id);
  if (!enrollment) return { ok: false, error: "You're not enrolled in this course." };

  const [existing] = await db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.lessonId, lessonId), eq(lessonProgress.studentId, user.id)))
    .limit(1);

  let completed: boolean;
  if (existing) {
    await db.delete(lessonProgress).where(eq(lessonProgress.id, existing.id));
    completed = false;
  } else {
    await db
      .insert(lessonProgress)
      .values({ lessonId, courseId: row.course.id, studentId: user.id })
      .onConflictDoNothing();
    completed = true;
  }

  const [total] = await db
    .select({ count: sql<number>`count(${lessons.id})::int` })
    .from(chapters)
    .leftJoin(lessons, eq(lessons.chapterId, chapters.id))
    .where(eq(chapters.courseId, row.course.id));

  const [done] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lessonProgress)
    .where(
      and(eq(lessonProgress.courseId, row.course.id), eq(lessonProgress.studentId, user.id)),
    );

  revalidatePath(`/learn`);
  revalidatePath(`/learn/${row.course.slug}`);
  return {
    ok: true,
    completed,
    done: done?.count ?? 0,
    total: total?.count ?? 0,
  };
}
