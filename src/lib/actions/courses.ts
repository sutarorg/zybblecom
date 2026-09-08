"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { courses, lessons } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { CATEGORIES, slugify } from "@/lib/utils";

export type FormState = { error?: string } | null;

const lessonSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Lesson title required").max(120),
  content: z.string().max(20000).default(""),
  durationMin: z.coerce.number().int().min(1).max(600).default(5),
});

const courseSchema = z.object({
  title: z.string().trim().min(3, "Title needs at least 3 characters").max(120),
  category: z.enum(CATEGORIES as unknown as [string, ...string[]]),
  description: z.string().trim().min(10, "Describe your course in a sentence or two").max(8000),
  priceRupees: z.coerce.number().min(0, "Price can't be negative").max(1_000_000),
  thumbnail: z.string().trim().max(500).default("gradient:violet"),
  lessonsJson: z.string().default("[]"),
});

async function uniqueSlug(base: string, ignoreId?: string) {
  let slug = base;
  for (let i = 2; ; i++) {
    const [hit] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.slug, slug))
      .limit(1);
    if (!hit || hit.id === ignoreId) return slug;
    slug = `${base}-${i}`;
  }
}

export async function saveCourse(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser("/creator/courses");
  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description"),
    priceRupees: formData.get("priceRupees"),
    thumbnail: formData.get("thumbnail"),
    lessonsJson: formData.get("lessonsJson"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const lessonsInput = z
    .array(lessonSchema)
    .max(200)
    .safeParse(JSON.parse(parsed.data.lessonsJson || "[]"));
  if (!lessonsInput.success) {
    return { error: "One of the lessons is invalid." };
  }

  const thumbnail = parsed.data.thumbnail.startsWith("gradient:")
    ? parsed.data.thumbnail
    : parsed.data.thumbnail
      ? parsed.data.thumbnail
      : "gradient:violet";

  const pricePaise = Math.round(parsed.data.priceRupees * 100);
  const courseId = formData.get("courseId") as string | null;

  let savedId: string;
  try {
    savedId = await db.transaction(async (tx) => {
      let id: string;
      if (courseId) {
        const [existing] = await tx
          .select()
          .from(courses)
          .where(and(eq(courses.id, courseId), eq(courses.creatorId, user.id)))
          .limit(1);
        if (!existing) throw new Error("not_found");
        await tx
          .update(courses)
          .set({
            title: parsed.data.title,
            category: parsed.data.category,
            description: parsed.data.description,
            pricePaise,
            thumbnail,
            updatedAt: new Date(),
          })
          .where(eq(courses.id, courseId));
        id = courseId;
      } else {
        const slug = await uniqueSlug(slugify(parsed.data.title));
        const [created] = await tx
          .insert(courses)
          .values({
            creatorId: user.id,
            slug,
            title: parsed.data.title,
            category: parsed.data.category,
            description: parsed.data.description,
            pricePaise,
            thumbnail,
            status: "draft",
          })
          .returning({ id: courses.id });
        id = created.id;
      }

      // Replace lesson set: update kept ones, insert new, delete removed.
      const keepIds = lessonsInput.data.filter((l) => l.id).map((l) => l.id!);
      const existing = await tx
        .select({ id: lessons.id })
        .from(lessons)
        .where(eq(lessons.courseId, id));
      for (const row of existing) {
        if (!keepIds.includes(row.id)) {
          await tx.delete(lessons).where(eq(lessons.id, row.id));
        }
      }
      for (let i = 0; i < lessonsInput.data.length; i++) {
        const l = lessonsInput.data[i];
        if (l.id) {
          await tx
            .update(lessons)
            .set({ title: l.title, content: l.content, durationMin: l.durationMin, position: i })
            .where(eq(lessons.id, l.id));
        } else {
          await tx.insert(lessons).values({
            courseId: id,
            title: l.title,
            content: l.content,
            durationMin: l.durationMin,
            position: i,
          });
        }
      }
      return id;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "not_found") {
      return { error: "Course not found." };
    }
    throw err;
  }

  revalidatePath("/creator/courses");
  revalidatePath("/creator");
  redirect(`/creator/courses/${savedId}?saved=1`);
}
