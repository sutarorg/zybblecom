import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, courses, lessons } from "@/db/schema";
import { LessonContent, LessonResources } from "@/components/course/lesson-viewer";
import { Logo } from "@/components/marketing/nav";
import { formatINR } from "@/lib/utils";

type Params = { params: Promise<{ slug: string; lessonId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [course] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  return { title: course ? `Preview · ${course.title}` : "Preview" };
}

export default async function PreviewPage({ params }: Params) {
  const { slug, lessonId } = await params;

  const [row] = await db
    .select({ lesson: lessons, course: courses })
    .from(lessons)
    .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
    .innerJoin(courses, eq(chapters.courseId, courses.id))
    .where(and(eq(lessons.id, lessonId), eq(courses.slug, slug)))
    .limit(1);

  if (!row || !row.lesson.isPreview || row.course.status !== "published") notFound();
  const { lesson, course } = row;

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link href={`/c/${course.slug}`} className="btn btn-ghost btn-sm">
            <ArrowLeft className="size-4" /> Back to course
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <span className="badge badge-grape">
          <Sparkles className="size-3" /> Free preview
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{lesson.title}</h1>
        <p className="mt-1.5 text-[14px] text-mut">
          From <span className="font-medium text-ink">{course.title}</span>
        </p>

        <div className="mt-7">
          <LessonContent lesson={lesson} />
          <LessonResources lesson={lesson} />
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-3xl border border-grape/25 bg-grape-soft p-6 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-[16px] font-semibold">Enjoying the preview?</p>
            <p className="mt-0.5 text-[13.5px] text-ink-soft">
              Unlock the full course{" "}
              {course.pricePaise === 0 ? "for free." : `for ${formatINR(course.pricePaise)}.`}
            </p>
          </div>
          <Link href={`/c/${course.slug}`} className="btn btn-ink btn-md shrink-0">
            View full course <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
