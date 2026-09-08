import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ExternalLink, Globe, PauseCircle } from "lucide-react";
import { db } from "@/db";
import { courses, lessons } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { Badge, Card } from "@/components/ui";
import { CourseForm } from "@/components/course-form";
import { CopyLink } from "@/components/copy-link";
import { setCourseStatus } from "@/lib/actions/creator";

export const metadata = { title: "Edit course" };

export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const user = await requireUser("/creator/courses");

  const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  if (!course) notFound();
  if (course.creatorId !== user.id && !user.isAdmin) redirect("/creator/courses");

  const courseLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, course.id))
    .orderBy(lessons.position);

  const shareUrl = `https://zybble.com/c/${course.slug}`;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge tone={course.status === "published" ? "green" : "amber"}>{course.status}</Badge>
            <span className="text-sm font-semibold text-ink-soft">{formatINR(course.pricePaise)}</span>
          </div>
          <p className="mt-1 truncate text-[13px] font-medium text-ink-soft">{shareUrl}</p>
        </div>
        <CopyLink value={shareUrl} />
        <Link
          href={`/c/${course.slug}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-[13px] font-semibold transition hover:border-ink/35"
        >
          <ExternalLink className="size-3.5" /> Preview
        </Link>
        <form
          action={setCourseStatus.bind(
            null,
            course.id,
            course.status === "published" ? "draft" : "published",
          )}
        >
          <button className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-semibold text-paper transition hover:bg-black disabled:opacity-50"
            disabled={course.status !== "published" && courseLessons.length === 0}
            title={courseLessons.length === 0 && course.status !== "published" ? "Add at least one lesson to publish" : undefined}
          >
            {course.status === "published" ? (
              <><PauseCircle className="size-3.5" /> Unpublish</>
            ) : (
              <><Globe className="size-3.5" /> Publish</>
            )}
          </button>
        </form>
      </Card>

      <CourseForm
        courseId={course.id}
        saved={saved === "1"}
        initial={{
          title: course.title,
          category: course.category,
          description: course.description,
          priceRupees: String(course.pricePaise / 100),
          thumbnail: course.thumbnail,
          lessons: courseLessons.map((l) => ({
            id: l.id,
            title: l.title,
            content: l.content,
            durationMin: l.durationMin,
          })),
        }}
      />
    </div>
  );
}
