import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Clock3,
  Infinity as InfinityIcon,
  Lock,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { db } from "@/db";
import { courses, lessons, purchases, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { initials, thumbnailStyle } from "@/lib/utils";
import { Badge, Card } from "@/components/ui";
import { Logo } from "@/components/logo";
import { BuyButton } from "@/components/buy-button";
import { CopyLink } from "@/components/copy-link";

async function getCourse(slug: string) {
  const [course] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  if (!course) return null;
  const [creator] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, course.creatorId))
    .limit(1);
  const courseLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, course.id))
    .orderBy(lessons.position);
  const [{ count }] = await db
    .select({ count: db.$count(purchases, and(eq(purchases.courseId, course.id), eq(purchases.status, "paid"))) })
    .from(purchases)
    .where(and(eq(purchases.courseId, course.id), eq(purchases.status, "paid")));
  return { course, creator, lessons: courseLessons, students: count };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCourse(slug);
  if (!data || data.course.status !== "published") return { title: "Course" };
  return {
    title: data.course.title,
    description: data.course.description.slice(0, 150),
  };
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCourse(slug);
  if (!data) notFound();

  const { course, creator, lessons: courseLessons, students } = data;
  const user = await getSessionUser();
  const isOwner = user?.id === course.creatorId;

  if (course.status !== "published" && !isOwner && !user?.isAdmin) notFound();

  const owned = user
    ? Boolean(
        (
          await db
            .select({ id: purchases.id })
            .from(purchases)
            .where(
              and(
                eq(purchases.buyerId, user.id),
                eq(purchases.courseId, course.id),
                eq(purchases.status, "paid"),
              ),
            )
            .limit(1)
        )[0],
      )
    : false;

  const totalMin = courseLessons.reduce((s, l) => s + l.durationMin, 0);
  const shareUrl = `https://zybble.com/c/${course.slug}`;

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-4 pb-36 sm:px-6 md:pb-16">
      <header className="flex h-16 items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft transition hover:text-ink"
        >
          <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Back</span>
        </Link>
        <Logo />
        <CopyLink value={shareUrl} label="Share" />
      </header>

      {course.status !== "published" && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Draft — only you can see this page. Publish it from your Studio to share the link.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          {/* Thumbnail */}
          <div
            className="anim-fade-up relative flex h-56 items-end overflow-hidden rounded-[28px] p-6 sm:h-72"
            style={thumbnailStyle(course.thumbnail)}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
            <div className="relative flex w-full items-end justify-between gap-3">
              <Badge tone="ink" className="bg-white/15 text-white backdrop-blur">
                {course.category}
              </Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                <Users className="size-3.5" /> {students} enrolled
              </span>
            </div>
          </div>

          <div className="anim-fade-up delay-1 mt-6">
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {course.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
              <span className="inline-flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-full bg-ink font-display text-[11px] font-bold text-paper">
                  {initials(creator?.name ?? "C")}
                </span>
                <span className="font-semibold text-ink">{creator?.name}</span>
                <BadgeCheck className="size-4 text-brand" />
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="size-4" /> {courseLessons.length} lessons
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-4" /> {totalMin} min
              </span>
              <span className="inline-flex items-center gap-1.5">
                <InfinityIcon className="size-4" /> Lifetime access
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="anim-fade-up delay-2 mt-8 space-y-4 text-[15px] leading-relaxed text-ink-soft">
            {course.description.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {/* Curriculum */}
          <Card className="anim-fade-up delay-3 mt-10 overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-bold">What&apos;s inside</h2>
              <p className="text-xs text-ink-soft">
                {courseLessons.length} lessons · {totalMin} minutes total
              </p>
            </div>
            {courseLessons.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-soft">
                Curriculum coming soon.
              </p>
            ) : (
              <ol className="divide-y divide-line">
                {courseLessons.map((lesson, i) => (
                  <li key={lesson.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-cream font-display text-xs font-bold text-ink-soft">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {lesson.title}
                    </span>
                    <span className="text-xs text-ink-soft">{lesson.durationMin}m</span>
                    {owned || isOwner ? (
                      <BadgeCheck className="size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Lock className="size-4 shrink-0 text-ink-soft/50" />
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        {/* Purchase card — desktop sidebar */}
        <aside className="hidden lg:block">
          <Card className="sticky top-24 space-y-4 p-6">
            <div>
              <p className="font-display text-4xl font-bold tracking-tight">
                {course.pricePaise === 0 ? "Free" : formatINR(course.pricePaise)}
              </p>
              {course.pricePaise > 0 && (
                <p className="mt-1 text-xs text-ink-soft">
                  One-time payment · {formatINR(Math.round(course.pricePaise * 0.9))} goes
                  directly to the creator
                </p>
              )}
            </div>
            {owned ? (
              <Link href={`/learn/${course.id}`} className="block">
                <span className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-7 text-base font-semibold text-white transition hover:bg-emerald-700">
                  <BadgeCheck className="size-4" /> Continue learning
                </span>
              </Link>
            ) : isOwner ? (
              <Link href={`/creator/courses/${course.id}`} className="block">
                <span className="inline-flex h-13 w-full items-center justify-center rounded-full border border-line bg-white px-7 text-base font-semibold transition hover:border-ink/35">
                  Manage in Studio
                </span>
              </Link>
            ) : (
              <BuyButton
                courseId={course.id}
                pricePaise={course.pricePaise}
                loggedIn={Boolean(user)}
                loginNext={`/c/${course.slug}`}
              />
            )}
            <ul className="space-y-2.5 border-t border-line pt-4 text-[13px] text-ink-soft">
              {[
                `${courseLessons.length} on-demand lessons`,
                "Instant access after payment",
                "Learn on any device",
                `Directly supports ${creator?.name.split(" ")[0]}`,
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <BadgeCheck className="size-4 shrink-0 text-brand" /> {f}
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>

      {/* Mobile sticky buy bar */}
      {!owned && !isOwner && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-md items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-bold leading-none">
                {course.pricePaise === 0 ? "Free" : formatINR(course.pricePaise)}
              </p>
              <p className="mt-1 truncate text-[11px] text-ink-soft">{course.title}</p>
            </div>
            <BuyButton
              courseId={course.id}
              pricePaise={course.pricePaise}
              loggedIn={Boolean(user)}
              loginNext={`/c/${course.slug}`}
              className="w-44 shrink-0 [&>p]:hidden"
            />
          </div>
        </div>
      )}
    </main>
  );
}
