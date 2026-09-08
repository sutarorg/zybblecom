import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { ExternalLink, GraduationCap, Pencil, Plus } from "lucide-react";
import { db } from "@/db";
import { courses, lessons, purchases } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { thumbnailStyle } from "@/lib/utils";
import { Badge, Card, EmptyState, buttonClasses } from "@/components/ui";
import { setCourseStatus } from "@/lib/actions/creator";
import { CopyLink } from "@/components/copy-link";

export const metadata = { title: "Courses" };

export default async function CoursesPage() {
  const user = await requireUser("/creator/courses");
  const myCourses = await db
    .select()
    .from(courses)
    .where(eq(courses.creatorId, user.id))
    .orderBy(desc(courses.createdAt));

  const stats = myCourses.length
    ? await db
        .select({
          courseId: purchases.courseId,
          sales: sql<number>`count(*)::int`,
          earned: sql<number>`coalesce(sum(${purchases.creatorPaise}),0)::int`,
        })
        .from(purchases)
        .where(eq(purchases.status, "paid"))
        .groupBy(purchases.courseId)
    : [];
  const statByCourse = new Map(stats.map((s) => [s.courseId, s]));

  const lessonCounts = myCourses.length
    ? await db
        .select({ courseId: lessons.courseId, n: sql<number>`count(*)::int` })
        .from(lessons)
        .groupBy(lessons.courseId)
    : [];
  const lessonsByCourse = new Map(lessonCounts.map((l) => [l.courseId, l.n]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{myCourses.length} course{myCourses.length === 1 ? "" : "s"}</h2>
        <Link href="/creator/courses/new" className={buttonClasses("brand", "sm")}>
          <Plus className="size-4" /> New course
        </Link>
      </div>

      {myCourses.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="size-6" />}
          title="Create your first course"
          body="It takes minutes. Publish, copy your link, and share it anywhere — you're selling from second one."
          action={
            <Link href="/creator/courses/new" className={buttonClasses("brand", "md")}>
              <Plus className="size-4" /> Create course
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {myCourses.map((course, i) => {
            const stat = statByCourse.get(course.id);
            const nLessons = lessonsByCourse.get(course.id) ?? 0;
            const shareUrl = `https://zybble.com/c/${course.slug}`;
            return (
              <Card key={course.id} className={`overflow-hidden anim-fade-up delay-${Math.min(i + 1, 4)}`}>
                <div className="flex h-28 items-end p-4" style={thumbnailStyle(course.thumbnail)}>
                  <Badge tone="ink" className="bg-white/15 text-white backdrop-blur">
                    {course.category}
                  </Badge>
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-base font-bold">{course.title}</h3>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {nLessons} lessons · {formatINR(course.pricePaise)}
                      </p>
                    </div>
                    <Badge tone={course.status === "published" ? "green" : "amber"}>
                      {course.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-cream/70 p-3 text-center">
                    <div>
                      <p className="font-display text-base font-bold">{stat?.sales ?? 0}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Sales</p>
                    </div>
                    <div>
                      <p className="font-display text-base font-bold text-emerald-600">
                        {formatINR(stat?.earned ?? 0)}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Earned</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/creator/courses/${course.id}`} className={buttonClasses("ink", "sm")}>
                      <Pencil className="size-3.5" /> Edit
                    </Link>
                    <CopyLink value={shareUrl} />
                    <Link
                      href={`/c/${course.slug}`}
                      className="grid size-9 place-items-center rounded-full border border-line text-ink-soft transition hover:border-ink/35 hover:text-ink"
                      title="Open public page"
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                    <form
                      action={setCourseStatus.bind(
                        null,
                        course.id,
                        course.status === "published" ? "draft" : "published",
                      )}
                      className="ml-auto"
                    >
                      <button
                        type="submit"
                        className="text-[13px] font-semibold text-ink-soft underline-offset-2 transition hover:text-ink hover:underline"
                      >
                        {course.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                    </form>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
