import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Player } from "@/components/learn/player";
import { requireUser } from "@/lib/auth";
import {
  getCompletedLessonIds,
  getCourseBySlug,
  getCurriculum,
  getEnrollment,
} from "@/lib/queries";

export const metadata: Metadata = { title: "Course player" };

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ l?: string; welcome?: string }>;
}) {
  const { slug } = await params;
  const { l, welcome } = await searchParams;
  const user = await requireUser();

  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const enrollment = await getEnrollment(course.id, user.id);
  const isOwner = course.creatorId === user.id || user.role === "admin";
  if (!enrollment && !isOwner) redirect(`/c/${course.slug}`);

  const curriculum = await getCurriculum(course.id);
  const completedIds = enrollment ? await getCompletedLessonIds(course.id, user.id) : [];

  return (
    <Player
      course={course}
      curriculum={curriculum}
      completedIds={completedIds}
      initialLessonId={l ?? null}
      welcome={welcome === "1"}
      canTrack={Boolean(enrollment)}
    />
  );
}
