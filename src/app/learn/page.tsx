import { ArrowRight, BadgeCheck, BookOpen, Layers } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getStudentCourses } from "@/lib/queries";
import { cn, courseGradient, initials, pct } from "@/lib/utils";

export const metadata: Metadata = { title: "My learning" };

export default async function LearnPage() {
  const user = await requireUser();
  const courses = await getStudentCourses(user.id);

  return (
    <>
      <PageHeader
        eyebrow="My learning"
        title={`Welcome back, ${user.name.split(" ")[0]}.`}
        sub="Every course you've enrolled in, with your progress saved."
      />

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          sub="When you enroll through a creator's zybble.com link, the course appears here instantly, ready to play."
        >
          <Link href="/" className="btn btn-outline btn-md">
            Discover Zybble <ArrowRight className="size-4" />
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(({ course, creatorName, totalLessons, doneLessons }) => {
            const percent = pct(doneLessons, totalLessons);
            const complete = totalLessons > 0 && doneLessons >= totalLessons;
            return (
              <div key={course.id} className="card overflow-hidden shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-pop">
                <div className="relative h-32">
                  {course.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full items-end p-4"
                      style={{ background: courseGradient(course.id) }}
                    >
                      <span className="rounded-xl bg-white/15 px-2.5 py-1.5 font-display text-lg italic text-white backdrop-blur">
                        {initials(course.title)}
                      </span>
                    </div>
                  )}
                  {complete && (
                    <span className="badge badge-mint absolute right-3 top-3 shadow-card">
                      <BadgeCheck className="size-3" /> Completed
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="truncate text-[15.5px] font-semibold tracking-tight">{course.title}</h3>
                  <p className="mt-1 text-[12.5px] text-mut">by {creatorName}</p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11.5px] font-medium">
                      <span className="flex items-center gap-1.5 text-mut">
                        <Layers className="size-3" />
                        {doneLessons} / {totalLessons} lessons
                      </span>
                      <span className={cn("tabular-nums", complete ? "text-mint" : "text-ink")}>{percent}%</span>
                    </div>
                    <ProgressBar value={percent} className="mt-2" />
                  </div>
                  <Link
                    href={`/learn/${course.slug}`}
                    className="btn btn-ink btn-md mt-4 w-full"
                  >
                    {doneLessons === 0 ? "Start course" : complete ? "Review course" : "Continue"}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
