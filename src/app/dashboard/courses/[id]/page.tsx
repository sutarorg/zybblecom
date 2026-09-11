import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { CourseBuilder } from "@/components/dashboard/course-builder";
import { requireUser } from "@/lib/auth";
import {
  getCouponsForCourse,
  getCourseStatsForBuilder,
  getCurriculum,
} from "@/lib/queries";

export const metadata: Metadata = { title: "Course builder · Creator studio" };

export default async function CourseBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(["creator"]);

  const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  if (!course || course.creatorId !== user.id) notFound();

  const [curriculum, coupons, stats] = await Promise.all([
    getCurriculum(course.id),
    getCouponsForCourse(course.id),
    getCourseStatsForBuilder(course.id),
  ]);

  return <CourseBuilder course={course} curriculum={curriculum} coupons={coupons} stats={stats} />;
}
