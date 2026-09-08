import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  PartyPopper,
} from "lucide-react";
import { db } from "@/db";
import { courses, lessons, progress, purchases, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { toggleLessonComplete } from "@/lib/actions/progress";
import { Badge, Card, buttonClasses } from "@/components/ui";
import { Logo } from "@/components/logo";
import { thumbnailStyle, cx } from "@/lib/utils";

export const metadata = { title: "Learning" };

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lesson?: string; welcome?: string }>;
}) {
  const { courseId } = await params;
  const { lesson: lessonParam, welcome } = await searchParams;

  const user = await getSessionUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/learn/${courseId}`)}`);

  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) notFound();

  const isOwner = course.creatorId === user.id;
  if (!isOwner && !user.isAdmin) {
    const [own] = await db
      .select({ id: purchases.id })
      .from(purchases)
      .where(
        and(
          eq(purchases.buyerId, user.id),
          eq(purchases.courseId, courseId),
          eq(purchases.status, "paid"),
        ),
      )
      .limit(1);
    if (!own) {
      // Not enrolled — send them to the course page to purchase.
      redirect(`/c/${course.slug}`);
    }
  }

  const courseLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(asc(lessons.position));

  const done = courseLessons.length
    ? new Set(
        (
          await db
            .select({ lessonId: progress.lessonId })
            .from(progress)
            .where(
              and(
                eq(progress.userId, user.id),
                inArray(progress.lessonId, courseLessons.map((l) => l.id)),
              ),
            )
        ).map((r) => r.lessonId),
      )
    : new Set<string>();

  const [creator] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, course.creatorId))
    .limit(1);

  const activeIndex = Math.max(
    0,
    courseLessons.findIndex((l) => l.id === lessonParam),
  );
  const active = lessonParam ? (courseLessons[activeIndex] ?? null) : null;
  const pct =
    courseLessons.length > 0 ? Math.round((done.size / courseLessons.length) * 100) : 0;
  const nextLesson = active && activeIndex < courseLessons.length - 1 ? courseLessons[activeIndex + 1] : null;

  return (
    <main className="min-h-dvh pb-16">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/my-courses" className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white transition hover:border-ink/30" title="Back to my courses">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold">{course.title}</p>
            <p className="text-[11px] text-ink-soft">by {creator?.name ?? "Creator"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-cream sm:block">
              <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
            <Badge tone={pct === 100 ? "green" : "brand"}>{pct}%</Badge>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl gap-8 px-4 pt-6 sm:px-6 lg:grid lg:grid-cols-[340px_1fr]">
        {welcome === "1" && (
          <div className="anim-fade-up mb-6 flex items-start gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 lg:col-span-2">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white">
              <PartyPopper className="size-5" />
            </span>
            <div>
              <p className="font-display text-lg font-bold text-emerald-900">Payment successful — you&apos;re in!</p>
              <p className="text-sm text-emerald-800/80">
                Lifetime access unlocked. Your receipt is in My courses → Order history.
              </p>
            </div>
          </div>
        )}

        {/* Sidebar (desktop) */}
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <Card className="overflow-hidden">
            <div className="flex h-24 items-end p-4" style={thumbnailStyle(course.thumbnail)}>
              <Badge tone="ink" className="bg-white/15 text-white backdrop-blur">{course.category}</Badge>
            </div>
            <ol className="max-h-[50vh] divide-y divide-line overflow-y-auto lg:max-h-[55vh]">
              {courseLessons.map((lesson, i) => {
                const isDone = done.has(lesson.id);
                const isActive = active?.id === lesson.id;
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/learn/${courseId}?lesson=${lesson.id}`}
                      className={cx(
                        "flex items-center gap-3 px-4 py-3 text-sm transition",
                        isActive ? "bg-brand/[0.07]" : "hover:bg-cream/60",
                      )}
                    >
                      <span
                        className={cx(
                          "grid size-6.5 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                          isDone
                            ? "bg-emerald-600 text-white"
                            : isActive
                              ? "bg-brand text-white"
                              : "bg-cream text-ink-soft",
                        )}
                      >
                        {isDone ? <Check className="size-3.5" /> : i + 1}
                      </span>
                      <span className={cx("min-w-0 flex-1 truncate font-medium", isActive && "text-brand")}>
                        {lesson.title}
                      </span>
                      <span className="text-[11px] text-ink-soft">{lesson.durationMin}m</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Card>
        </aside>

        {/* Content */}
        <section className="min-w-0">
          {courseLessons.length === 0 ? (
            <Card className="p-10 text-center text-sm text-ink-soft">
              This course doesn&apos;t have any lessons yet.
            </Card>
          ) : !active ? (
            <>
              {/* Course overview (no lesson selected) */}
              <Logo className="mb-6 lg:hidden" />
              <Card className="overflow-hidden">
                <div className="flex h-44 items-end p-6" style={thumbnailStyle(course.thumbnail)}>
                  <Badge tone="ink" className="bg-white/15 text-white backdrop-blur">{course.category}</Badge>
                </div>
                <div className="p-6">
                  <h1 className="font-display text-2xl font-bold tracking-tight">{course.title}</h1>
                  <p className="mt-2 text-sm text-ink-soft">
                    {courseLessons.length} lessons ·{" "}
                    {courseLessons.reduce((s, l) => s + l.durationMin, 0)} minutes · by {creator?.name}
                  </p>
                  {courseLessons[0] && (
                    <Link
                      href={`/learn/${courseId}?lesson=${courseLessons[0].id}`}
                      className={buttonClasses("brand", "lg") + " mt-6 w-full sm:w-auto"}
                    >
                      {done.size > 0 && pct < 100 ? "Resume course" : "Start course"} <ChevronRight className="size-4" />
                    </Link>
                  )}
                </div>
              </Card>

              {/* Mobile lesson list */}
              <Card className="mt-4 overflow-hidden lg:hidden">
                <ol className="divide-y divide-line">
                  {courseLessons.map((lesson, i) => (
                    <li key={lesson.id}>
                      <Link href={`/learn/${courseId}?lesson=${lesson.id}`} className="flex items-center gap-3 px-4 py-3.5 text-sm">
                        <span className={cx("grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold", done.has(lesson.id) ? "bg-emerald-600 text-white" : "bg-cream text-ink-soft")}>
                          {done.has(lesson.id) ? <Check className="size-3.5" /> : i + 1}
                        </span>
                        <span className="flex-1 truncate font-medium">{lesson.title}</span>
                        <ChevronRight className="size-4 text-ink-soft" />
                      </Link>
                    </li>
                  ))}
                </ol>
              </Card>
            </>
          ) : (
            <div className="anim-fade-up">
              <Link href={`/learn/${courseId}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink lg:hidden">
                <ArrowLeft className="size-3.5" /> All lessons
              </Link>
              <Card className="p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                  Lesson {activeIndex + 1} of {courseLessons.length} · {active.durationMin} min
                </p>
                <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  {active.title}
                </h1>
                <div className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-ink/85">
                  {active.content || "No written content for this lesson yet."}
                </div>
              </Card>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <form action={toggleLessonComplete.bind(null, active.id, courseId)}>
                  <button
                    className={cx(
                      "inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition active:scale-95",
                      done.has(active.id)
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-ink text-paper hover:bg-black",
                    )}
                  >
                    <CheckCircle2 className="size-4" />
                    {done.has(active.id) ? "Completed — undo" : "Mark as complete"}
                  </button>
                </form>
                {nextLesson && (
                  <Link
                    href={`/learn/${courseId}?lesson=${nextLesson.id}`}
                    className={buttonClasses("outline", "md")}
                  >
                    Next: {nextLesson.title.length > 22 ? nextLesson.title.slice(0, 22) + "…" : nextLesson.title} <ArrowRight className="size-4" />
                  </Link>
                )}
                {!nextLesson && pct === 100 && (
                  <span className="inline-flex h-11 items-center gap-2 rounded-full bg-lime px-5 text-sm font-bold text-ink">
                    <PartyPopper className="size-4" /> Course complete!
                  </span>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
