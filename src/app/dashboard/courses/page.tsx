import { ArrowRight, BookOpen, GraduationCap, Layers, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewCourseButton } from "@/components/dashboard/new-course-button";
import { CourseStatusBadge, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCreatorCourses } from "@/lib/queries";
import { courseGradient, formatINR, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Courses · Creator studio" };

export default async function CoursesPage() {
  const user = await requireUser(["creator"]);
  const courseRows = await getCreatorCourses(user.id);

  return (
    <>
      <PageHeader
        eyebrow="Your catalog"
        title="Courses"
        sub="Each course gets its own link — publish, share, and sell directly."
        actions={<NewCourseButton />}
      />

      {courseRows.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          sub="Your first course is a few chapters away. Create it, publish it, and share the link anywhere."
        >
          <NewCourseButton large />
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courseRows.map((course) => (
            <Link
              key={course.id}
              href={`/dashboard/courses/${course.id}`}
              className="group card overflow-hidden shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-pop"
            >
              <div className="relative h-36 overflow-hidden">
                {course.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={course.coverUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div
                    className="flex h-full items-end p-4"
                    style={{ background: courseGradient(course.id) }}
                  >
                    <span className="rounded-xl bg-white/15 px-2.5 py-1.5 font-display text-xl italic text-white backdrop-blur">
                      {initials(course.title)}
                    </span>
                  </div>
                )}
                <span className="absolute left-3 top-3">
                  <CourseStatusBadge status={course.status} />
                </span>
                <span className="absolute right-3 top-3 badge bg-ink/55 text-white backdrop-blur">
                  {course.pricePaise === 0 ? "Free" : formatINR(course.pricePaise)}
                </span>
              </div>
              <div className="p-5">
                <h3 className="truncate text-[15.5px] font-semibold tracking-tight">{course.title}</h3>
                <p className="mt-1 truncate font-mono text-[11.5px] text-mut">zybble.com/c/{course.slug}</p>
                <div className="mt-4 flex items-center gap-4 text-[12.5px] text-ink-soft">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="size-3.5 text-grape" /> {course.students}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Layers className="size-3.5 text-grape" /> {course.lessons} lessons
                  </span>
                  <span className="ml-auto font-semibold tabular-nums text-ink">
                    {formatINR(course.revenue)}
                  </span>
                </div>
                <div className="btn btn-outline btn-sm mt-4 w-full transition-colors group-hover:border-grape/50 group-hover:text-grape-deep">
                  <Pencil className="size-3.5" /> Open builder
                  <ArrowRight className="size-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
