"use server";

import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { chapters, coupons, courses, lessons, type Course, type LessonType, type User } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { MIN_PAID_PRICE_INR, isSafeHttpUrl, slugify } from "@/lib/utils";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? {} : { data: T }))
  | { ok: false; error: string };

const ok = <T = undefined>(data?: T): ActionResult<T> =>
  ({ ok: true, ...(data === undefined ? {} : { data }) }) as ActionResult<T>;
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

async function ownedCourse(courseId: string): Promise<{ user: User; course: Course } | null> {
  const user = await requireUser();
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) return null;
  const allowed =
    (user.role === "creator" && course.creatorId === user.id) || user.role === "admin";
  return allowed ? { user, course } : null;
}

async function newPosition(table: "chapters" | "lessons", key: { courseId?: string; chapterId?: string }) {
  if (table === "chapters") {
    const [row] = await db
      .select({ max: sql<number>`coalesce(max(${chapters.position}), -1)::int` })
      .from(chapters)
      .where(eq(chapters.courseId, key.courseId!));
    return (row?.max ?? -1) + 1;
  }
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${lessons.position}), -1)::int` })
    .from(lessons)
    .where(eq(lessons.chapterId, key.chapterId!));
  return (row?.max ?? -1) + 1;
}

function refresh(course: Course) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/courses");
  revalidatePath(`/dashboard/courses/${course.id}`);
  revalidatePath(`/c/${course.slug}`);
}

/* ---------------------------------- course ---------------------------------- */

export async function createCourseAction(): Promise<ActionResult<{ id: string; slug: string }>> {
  const user = await requireUser(["creator", "admin"]);
  const base = "untitled-course";
  const suffix = Math.random().toString(36).slice(2, 7);
  const [course] = await db
    .insert(courses)
    .values({
      creatorId: user.id,
      title: "Untitled course",
      slug: `${base}-${suffix}`,
      description: "",
      pricePaise: 0,
    })
    .returning();
  revalidatePath("/dashboard/courses");
  return ok({ id: course.id, slug: course.slug });
}

const detailsSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(3, "Give your course a title (min 3 characters).").max(120),
  description: z.string().trim().max(4000).default(""),
  coverUrl: z.string().trim().max(500).default(""),
  slug: z.string().trim().min(3, "Link must be at least 3 characters.").max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only."),
  priceInr: z.number().int().min(0).max(500000),
});

export async function updateCourseDetails(input: z.input<typeof detailsSchema>): Promise<ActionResult<{ slug: string }>> {
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid details.");
  const { courseId, title, description, coverUrl, slug, priceInr } = parsed.data;

  const owned = await ownedCourse(courseId);
  if (!owned) return fail("You don't have access to this course.");

  if (priceInr !== 0 && priceInr < MIN_PAID_PRICE_INR) {
    return fail(`Paid courses must be at least ₹${MIN_PAID_PRICE_INR} (or free).`);
  }
  if (coverUrl && !isSafeHttpUrl(coverUrl)) {
    return fail("Cover image must be a valid http(s) URL.");
  }

  const [conflict] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.slug, slug), ne(courses.id, courseId)))
    .limit(1);
  if (conflict) return fail("That link is already taken. Try another one.");

  const oldSlug = owned.course.slug;
  await db
    .update(courses)
    .set({
      title,
      description,
      coverUrl: coverUrl || null,
      slug,
      pricePaise: priceInr * 100,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, courseId));
  revalidatePath(`/c/${oldSlug}`);
  refresh({ ...owned.course, slug });
  return ok({ slug });
}

export async function togglePublishAction(courseId: string): Promise<ActionResult<{ status: "draft" | "published" }>> {
  const owned = await ownedCourse(courseId);
  if (!owned) return fail("You don't have access to this course.");
  const { course } = owned;

  if (course.status === "published") {
    await db.update(courses).set({ status: "draft", updatedAt: new Date() }).where(eq(courses.id, courseId));
    refresh(course);
    return ok({ status: "draft" });
  }

  const [ch] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chapters)
    .where(eq(chapters.courseId, courseId));
  const [ls] = await db
    .select({ count: sql<number>`count(${lessons.id})::int` })
    .from(chapters)
    .leftJoin(lessons, eq(lessons.chapterId, chapters.id))
    .where(eq(chapters.courseId, courseId));
  if ((ch?.count ?? 0) === 0 || (ls?.count ?? 0) === 0) {
    return fail("Add at least one chapter and one lesson before publishing.");
  }
  if (!course.title || course.title === "Untitled course") {
    return fail("Give your course a proper title before publishing.");
  }

  await db.update(courses).set({ status: "published", updatedAt: new Date() }).where(eq(courses.id, courseId));
  refresh(course);
  return ok({ status: "published" });
}

export async function deleteCourseAction(courseId: string): Promise<ActionResult> {
  const owned = await ownedCourse(courseId);
  if (!owned) return fail("You don't have access to this course.");
  await db.delete(courses).where(eq(courses.id, courseId));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/courses");
  return ok();
}

/* --------------------------------- chapters --------------------------------- */

const titleSchema = z.string().trim().min(1, "A title is required.").max(160);

export async function addChapterAction(courseId: string, title: string): Promise<ActionResult<{ id: string }>> {
  const owned = await ownedCourse(courseId);
  if (!owned) return fail("You don't have access to this course.");
  const t = titleSchema.safeParse(title);
  if (!t.success) return fail(t.error.issues[0]?.message ?? "Invalid title.");
  const position = await newPosition("chapters", { courseId });
  const [chapter] = await db
    .insert(chapters)
    .values({ courseId, title: t.data, position })
    .returning();
  refresh(owned.course);
  return ok({ id: chapter.id });
}

export async function renameChapterAction(chapterId: string, title: string, courseId: string): Promise<ActionResult> {
  const owned = await ownedCourse(courseId);
  if (!owned) return fail("You don't have access to this course.");
  const t = titleSchema.safeParse(title);
  if (!t.success) return fail(t.error.issues[0]?.message ?? "Invalid title.");
  await db.update(chapters).set({ title: t.data }).where(and(eq(chapters.id, chapterId), eq(chapters.courseId, courseId)));
  refresh(owned.course);
  return ok();
}

export async function moveChapterAction(chapterId: string, dir: "up" | "down", courseId: string): Promise<ActionResult> {
  const owned = await ownedCourse(courseId);
  if (!owned) return fail("You don't have access to this course.");
  const list = await db
    .select()
    .from(chapters)
    .where(eq(chapters.courseId, courseId))
    .orderBy(asc(chapters.position), asc(chapters.createdAt));
  const idx = list.findIndex((c) => c.id === chapterId);
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= list.length) return ok();
  const a = list[idx];
  const b = list[swapWith];
  await db.update(chapters).set({ position: b.position }).where(eq(chapters.id, a.id));
  await db.update(chapters).set({ position: a.position }).where(eq(chapters.id, b.id));
  refresh(owned.course);
  return ok();
}

export async function deleteChapterAction(chapterId: string, courseId: string): Promise<ActionResult> {
  const owned = await ownedCourse(courseId);
  if (!owned) return fail("You don't have access to this course.");
  await db.delete(chapters).where(and(eq(chapters.id, chapterId), eq(chapters.courseId, courseId)));
  refresh(owned.course);
  return ok();
}

/* ---------------------------------- lessons --------------------------------- */

export async function addLessonAction(
  chapterId: string,
  courseId: string,
  type: LessonType,
): Promise<ActionResult<{ id: string }>> {
  const owned = await ownedCourse(courseId);
  if (!owned) return fail("You don't have access to this course.");
  const [chapter] = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.id, chapterId), eq(chapters.courseId, courseId)))
    .limit(1);
  if (!chapter) return fail("Chapter not found.");
  const position = await newPosition("lessons", { chapterId });
  const title = type === "video" ? "New video lesson" : type === "pdf" ? "New PDF lesson" : "New text lesson";
  const [lesson] = await db
    .insert(lessons)
    .values({ chapterId, title, type, position })
    .returning();
  refresh(owned.course);
  return ok({ id: lesson.id });
}

const resourceSchema = z.array(
  z.object({
    label: z.string().trim().min(1).max(120),
    url: z.string().trim().max(500),
  }),
).max(12);

const lessonSchema = z.object({
  lessonId: z.string().uuid(),
  courseId: z.string().uuid(),
  title: z.string().trim().min(1, "A title is required.").max(160),
  videoUrl: z.string().trim().max(500).default(""),
  fileUrl: z.string().trim().max(500).default(""),
  body: z.string().trim().max(40000).default(""),
  durationMin: z.number().int().min(0).max(2000).nullable(),
  isPreview: z.boolean(),
  resources: resourceSchema,
});

export async function updateLessonAction(input: z.input<typeof lessonSchema>): Promise<ActionResult> {
  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid lesson.");
  const { lessonId, courseId, title, videoUrl, fileUrl, body, durationMin, isPreview, resources } = parsed.data;

  const owned = await ownedCourse(courseId);
  if (!owned) return fail("You don't have access to this course.");

  const [lesson] = await db
    .select({ lesson: lessons, courseId: chapters.courseId })
    .from(lessons)
    .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
    .where(and(eq(lessons.id, lessonId), eq(chapters.courseId, courseId)))
    .limit(1);
  if (!lesson) return fail("Lesson not found.");

  if (videoUrl && !isSafeHttpUrl(videoUrl)) return fail("Video must be a valid http(s) URL.");
  if (fileUrl && !isSafeHttpUrl(fileUrl)) return fail("PDF must be a valid http(s) URL.");
  for (const r of resources) {
    if (!isSafeHttpUrl(r.url)) return fail("Resource links must be valid http(s) URLs.");
  }

  if (lesson.lesson.type === "video" && !videoUrl) return fail("Add a video URL for this lesson.");
  if (lesson.lesson.type === "pdf" && !fileUrl) return fail("Add a PDF URL for this lesson.");
  if (lesson.lesson.type === "text" && !body) return fail("Write some content for this lesson.");

  await db
    .update(lessons)
    .set({
      title,
      videoUrl: videoUrl || null,
      fileUrl: fileUrl || null,
      body,
      durationMin,
      isPreview,
      resources,
    })
    .where(eq(lessons.id, lessonId));
  refresh(owned.course);
  revalidatePath(`/learn/${owned.course.slug}`);
  return ok();
}

export async function moveLessonAction(lessonId: string, dir: "up" | "down", courseId: string): Promise<ActionResult> {
  const owned = await ownedCourse(courseId);
  if (!owned) return fail("You don't have access to this course.");
  const [row] = await db
    .select({ lesson: lessons })
    .from(lessons)
    .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
    .where(and(eq(lessons.id, lessonId), eq(chapters.courseId, courseId)))
    .limit(1);
  if (!row) return fail("Lesson not found.");
  const list = await db
    .select()
    .from(lessons)
    .where(eq(lessons.chapterId, row.lesson.chapterId))
    .orderBy(asc(lessons.position), asc(lessons.createdAt));
  const idx = list.findIndex((l) => l.id === lessonId);
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= list.length) return ok();
  const a = list[idx];
  const b = list[swapWith];
  await db.update(lessons).set({ position: b.position }).where(eq(lessons.id, a.id));
  await db.update(lessons).set({ position: a.position }).where(eq(lessons.id, b.id));
  refresh(owned.course);
  revalidatePath(`/learn/${owned.course.slug}`);
  return ok();
}

export async function deleteLessonAction(lessonId: string, courseId: string): Promise<ActionResult> {
  const owned = await ownedCourse(courseId);
  if (!owned) return fail("You don't have access to this course.");
  const [row] = await db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
    .where(and(eq(lessons.id, lessonId), eq(chapters.courseId, courseId)))
    .limit(1);
  if (!row) return fail("Lesson not found.");
  await db.delete(lessons).where(eq(lessons.id, lessonId));
  refresh(owned.course);
  revalidatePath(`/learn/${owned.course.slug}`);
  return ok();
}

/* ---------------------------------- coupons --------------------------------- */

const couponSchema = z.object({
  courseId: z.string().uuid(),
  code: z.string().trim().toUpperCase().min(3, "Code must be at least 3 characters.").max(24)
    .regex(/^[A-Z0-9]+$/, "Use letters and numbers only."),
  type: z.enum(["percent", "flat"]),
  valueInr: z.number().int().min(1),
  maxUses: z.number().int().min(1).max(100000).nullable(),
  expiresAt: z.string().nullable(),
});

export async function createCouponAction(input: z.input<typeof couponSchema>): Promise<ActionResult> {
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid coupon.");
  const { courseId, code, type, valueInr, maxUses, expiresAt } = parsed.data;

  const owned = await ownedCourse(courseId);
  if (!owned) return fail("You don't have access to this course.");
  const price = owned.course.pricePaise;
  if (price === 0) return fail("This course is free — coupons aren't needed.");

  if (type === "percent") {
    if (valueInr > 90) return fail("Percentage coupons can be at most 90% off.");
  } else {
    if (valueInr * 100 >= price) return fail("Flat discount must be less than the course price.");
  }

  const [dupe] = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(and(eq(coupons.courseId, courseId), eq(coupons.code, code)))
    .limit(1);
  if (dupe) return fail("A coupon with this code already exists.");

  let expiry: Date | null = null;
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (Number.isNaN(d.getTime())) return fail("Invalid expiry date.");
    expiry = d;
  }

  await db.insert(coupons).values({
    courseId,
    code,
    type,
    value: type === "percent" ? valueInr : valueInr * 100,
    maxUses,
    expiresAt: expiry,
  });
  refresh(owned.course);
  return ok();
}

export async function toggleCouponAction(couponId: string, courseId: string): Promise<ActionResult> {
  const owned = await ownedCourse(courseId);
  if (!owned) return fail("You don't have access to this course.");
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.id, couponId), eq(coupons.courseId, courseId)))
    .limit(1);
  if (!coupon) return fail("Coupon not found.");
  await db.update(coupons).set({ active: !coupon.active }).where(eq(coupons.id, couponId));
  refresh(owned.course);
  return ok();
}

export async function deleteCouponAction(couponId: string, courseId: string): Promise<ActionResult> {
  const owned = await ownedCourse(courseId);
  if (!owned) return fail("You don't have access to this course.");
  await db.delete(coupons).where(and(eq(coupons.id, couponId), eq(coupons.courseId, courseId)));
  refresh(owned.course);
  return ok();
}

/* ---------------------------- slug availability ----------------------------- */

export async function suggestSlugAction(courseId: string, title: string): Promise<ActionResult<{ slug: string }>> {
  const owned = await ownedCourse(courseId);
  if (!owned) return fail("Unauthorized.");
  const base = slugify(title);
  let candidate = base;
  for (let i = 0; i < 6; i++) {
    const [exists] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.slug, candidate), ne(courses.id, courseId)))
      .limit(1);
    if (!exists) return ok({ slug: candidate });
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return ok({ slug: candidate });
}
