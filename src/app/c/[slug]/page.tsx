import {
  ArrowRight,
  BookOpen,
  Clock,
  FileText,
  GraduationCap,
  Layers,
  Lock,
  Pencil,
  Play,
  Sparkles,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { enrollments, users, type Lesson } from "@/db/schema";
import { BuyPanel } from "@/components/course/buy-panel";
import { Logo } from "@/components/marketing/nav";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { countLessons, getCourseBySlug, getCurriculum, getEnrollment } from "@/lib/queries";
import { cn, courseGradient, formatINR, initials } from "@/lib/utils";
import { sql } from "drizzle-orm";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: "Course not found" };
  return {
    title: course.title,
    description: course.description.slice(0, 160) || `Enroll in ${course.title} on Zybble.`,
  };
}

function LessonIcon({ type, className }: { type: Lesson["type"]; className?: string }) {
  if (type === "video") return <Play className={className} />;
  if (type === "pdf") return <FileText className={className} />;
  return <BookOpen className={className} />;
}

export default async function CoursePage({ params }: Params) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const user = await getCurrentUser();
  const isOwner = user?.id === course.creatorId || user?.role === "admin";
  if (course.status !== "published" && !isOwner) notFound();

  const curriculum = await getCurriculum(course.id);
  const [creator] = await db.select().from(users).where(eq(users.id, course.creatorId)).limit(1);
  const [studentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enrollments)
    .where(eq(enrollments.courseId, course.id));

  const enrollment = user ? await getEnrollment(course.id, user.id) : null;
  const lessons = curriculum.reduce((s, c) => s + c.lessons.length, 0);
  const minutes = curriculum.reduce(
    (s, c) => s + c.lessons.reduce((t, l) => t + (l.durationMin ?? 0), 0),
    0,
  );
  const previewCount = curriculum.reduce(
    (s, c) => s + c.lessons.filter((l) => l.isPreview).length,
    0,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description,
    provider: {
      "@type": "Person",
      name: creator?.name ?? "Zybble creator",
    },
    offers: {
      "@type": "Offer",
      price: (course.pricePaise / 100).toFixed(2),
      priceCurrency: course.currency,
      availability: "https://schema.org/InStock",
      url: `https://zybble.com/c/${course.slug}`,
    },
  };

  return (
    <div className="min-h-dvh bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            {isOwner && (
              <Link href={`/dashboard/courses/${course.id}`} className="btn btn-outline btn-sm">
                <Pencil className="size-3.5" /> Manage
              </Link>
            )}
            {user ? (
              <Link href={homeFor(user)} className="btn btn-ink btn-sm">
                {user.role === "creator" ? "Dashboard" : user.role === "admin" ? "Admin" : "My learning"}
                <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(`/c/${course.slug}`)}`} className="btn btn-ink btn-sm">
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      {course.status === "draft" && isOwner && (
        <div className="border-b border-amber/25 bg-amber-soft px-4 py-2.5 text-center text-[13px] font-medium text-amber">
          This course is a draft — only you can see this page. Publish it from your dashboard to share
          the link.
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        {/* Cover */}
        <div className="relative overflow-hidden rounded-[32px] border border-line shadow-card">
          {course.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.coverUrl}
              alt={`${course.title} cover`}
              className="h-52 w-full object-cover sm:h-72"
            />
          ) : (
            <div
              className="flex h-52 items-end p-6 sm:h-72 sm:p-8"
              style={{ background: courseGradient(course.id) }}
            >
              <span className="rounded-2xl bg-white/15 px-3 py-2 font-display text-2xl italic text-white backdrop-blur">
                {initials(course.title)}
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/50 to-transparent" />
          <div className="absolute bottom-5 left-6 right-6 flex flex-wrap items-center gap-2 sm:left-8">
            <span className="badge bg-white/15 text-white backdrop-blur">
              <GraduationCap className="size-3.5" />
              {creator?.name}
            </span>
            <span className="badge bg-white/15 text-white backdrop-blur">
              <Layers className="size-3.5" /> {lessons} lessons
            </span>
            {minutes > 0 && (
              <span className="badge bg-white/15 text-white backdrop-blur">
                <Clock className="size-3.5" /> {Math.floor(minutes / 60)}h {minutes % 60}m
              </span>
            )}
            {(studentCount?.count ?? 0) > 0 && (
              <span className="badge bg-white/15 text-white backdrop-blur">
                <Users className="size-3.5" /> {studentCount?.count} enrolled
              </span>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr,380px]">
          {/* Main column */}
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-[40px]">
              {course.title}
            </h1>
            {course.description ? (
              <p className="mt-4 whitespace-pre-wrap text-[15.5px] leading-relaxed text-ink-soft">
                {course.description}
              </p>
            ) : (
              <p className="mt-4 text-[15.5px] leading-relaxed text-mut">
                A course by {creator?.name}.
              </p>
            )}

            {/* Curriculum */}
            <div className="mt-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Curriculum</h2>
                {previewCount > 0 && (
                  <span className="badge badge-grape">
                    <Sparkles className="size-3" /> {previewCount} free preview{previewCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="mt-5 space-y-4">
                {curriculum.map((chapter, ci) => (
                  <section key={chapter.id} className="card overflow-hidden">
                    <header className="flex items-center justify-between gap-3 border-b border-line bg-cream/50 px-5 py-3.5">
                      <h3 className="text-[14px] font-semibold">
                        <span className="mr-2 font-display italic text-mut">
                          {String(ci + 1).padStart(2, "0")}
                        </span>
                        {chapter.title}
                      </h3>
                      <span className="shrink-0 text-[12px] text-mut">
                        {chapter.lessons.length} lesson{chapter.lessons.length === 1 ? "" : "s"}
                      </span>
                    </header>
                    <ul className="divide-y divide-line">
                      {chapter.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          {lesson.isPreview ? (
                            <Link
                              href={`/c/${course.slug}/preview/${lesson.id}`}
                              className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-grape-soft/40"
                            >
                              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-grape-soft text-grape">
                                <LessonIcon type={lesson.type} className="size-3.5" />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-[14px] font-medium text-ink">
                                  {lesson.title}
                                </span>
                                {lesson.durationMin ? (
                                  <span className="text-[12px] text-mut">{lesson.durationMin} min</span>
                                ) : null}
                              </span>
                              <span className="badge badge-grape ml-auto">Preview</span>
                              <ArrowRight className="size-4 text-grape transition-transform group-hover:translate-x-0.5" />
                            </Link>
                          ) : (
                            <div className="flex items-center gap-3 px-5 py-3.5">
                              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-cream text-mut">
                                <LessonIcon type={lesson.type} className="size-3.5" />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-[14px] font-medium text-ink-soft">
                                  {lesson.title}
                                </span>
                                {lesson.durationMin ? (
                                  <span className="text-[12px] text-mut">{lesson.durationMin} min</span>
                                ) : null}
                              </span>
                              <Lock className="ml-auto size-3.5 text-mut" aria-label="Locked" />
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </div>

          {/* Buy card */}
          <aside>
            <div className="card sticky top-24 p-6 shadow-pop">
              {enrollment ? (
                <div>
                  <span className="badge badge-mint">You own this course</span>
                  <h3 className="mt-3 text-[18px] font-semibold tracking-tight">
                    Welcome back, {user?.name.split(" ")[0]}.
                  </h3>
                  <p className="mt-1 text-[13.5px] text-mut">
                    Pick up right where you left off.
                  </p>
                  <Link href={`/learn/${course.slug}`} className="btn btn-ink btn-lg mt-5 w-full">
                    Continue learning <ArrowRight className="size-4" />
                  </Link>
                </div>
              ) : isOwner ? (
                <div>
                  <span className="badge badge-grape">Your course</span>
                  <h3 className="mt-3 text-[18px] font-semibold tracking-tight">
                    {course.status === "published"
                      ? "This page is live."
                      : "Almost ready to share."}
                  </h3>
                  <p className="mt-1 text-[13.5px] text-mut">
                    Price: {course.pricePaise === 0 ? "Free" : formatINR(course.pricePaise)} ·{" "}
                    {countLessons(curriculum)} lessons
                  </p>
                  <Link href={`/dashboard/courses/${course.id}`} className="btn btn-ink btn-lg mt-5 w-full">
                    <Pencil className="size-4" /> Open in builder
                  </Link>
                </div>
              ) : !user ? (
                <div>
                  <div className="flex items-end justify-between">
                    <span className="text-[26px] font-bold tracking-tight tabular-nums">
                      {course.pricePaise === 0 ? "Free" : formatINR(course.pricePaise)}
                    </span>
                    <span className="badge badge-neutral">Lifetime access</span>
                  </div>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-mut">
                    Log in — or create a free account — to enroll in this course.
                  </p>
                  <Link
                    href={`/signup?next=${encodeURIComponent(`/c/${course.slug}`)}`}
                    className="btn btn-accent btn-lg mt-5 w-full"
                  >
                    Enroll now <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href={`/login?next=${encodeURIComponent(`/c/${course.slug}`)}`}
                    className={cn("btn btn-outline btn-md mt-2 w-full")}
                  >
                    I already have an account
                  </Link>
                </div>
              ) : (
                <BuyPanel slug={course.slug} title={course.title} pricePaise={course.pricePaise} />
              )}

              <ul className="mt-6 space-y-2.5 border-t border-line pt-5 text-[13px] text-ink-soft">
                <li className="flex items-center gap-2.5">
                  <Layers className="size-4 text-grape" /> {lessons} lessons across {curriculum.length} chapters
                </li>
                {minutes > 0 && (
                  <li className="flex items-center gap-2.5">
                    <Clock className="size-4 text-grape" /> {minutes} minutes of content
                  </li>
                )}
                <li className="flex items-center gap-2.5">
                  <Users className="size-4 text-grape" /> Progress tracking & personal library
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
