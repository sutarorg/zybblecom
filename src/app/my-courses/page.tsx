import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { ArrowRight, BookOpen, Trophy } from "lucide-react";
import { db } from "@/db";
import { courses, lessons, progress, purchases, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { thumbnailStyle } from "@/lib/utils";
import { Badge, Card, EmptyState } from "@/components/ui";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "My courses" };

export default async function MyCoursesPage() {
  const user = await requireUser("/my-courses");

  const owned = await db
    .select({
      purchase: purchases,
      course: courses,
      creatorName: users.name,
    })
    .from(purchases)
    .innerJoin(courses, eq(courses.id, purchases.courseId))
    .innerJoin(users, eq(users.id, courses.creatorId))
    .where(eq(purchases.buyerId, user.id))
    .orderBy(desc(purchases.createdAt));

  const paid = owned.filter((o) => o.purchase.status === "paid");

  const totalLessons = paid.length
    ? new Map(
        (
          await db
            .select({ courseId: lessons.courseId, n: sql<number>`count(*)::int` })
            .from(lessons)
            .groupBy(lessons.courseId)
        ).map((r) => [r.courseId, r.n]),
      )
    : new Map<string, number>();

  const doneLessons = paid.length
    ? new Map(
        (
          await db
            .select({ courseId: progress.courseId, n: sql<number>`count(*)::int` })
            .from(progress)
            .where(eq(progress.userId, user.id))
            .groupBy(progress.courseId)
        ).map((r) => [r.courseId, r.n]),
      )
    : new Map<string, number>();

  const completedCount = paid.filter(
    (o) =>
      (totalLessons.get(o.course.id) ?? 0) > 0 &&
      doneLessons.get(o.course.id) === totalLessons.get(o.course.id),
  ).length;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 md:pb-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">Learning</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              My courses
            </h1>
          </div>
          {paid.length > 0 && (
            <Badge tone="brand">
              <Trophy className="size-3" /> {completedCount}/{paid.length} completed
            </Badge>
          )}
        </div>

        {paid.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="size-6" />}
            title="No courses yet"
            body="Courses on Zybble are shared directly by creators through their unique links. Open a creator's link to enroll — your courses will land here."
            action={<Link href="/" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper">Back to home</Link>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paid.map((o, i) => {
              const total = totalLessons.get(o.course.id) ?? 0;
              const done = doneLessons.get(o.course.id) ?? 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <Link key={o.purchase.id} href={`/learn/${o.course.id}`} className="group">
                  <Card className={`h-full overflow-hidden transition-transform duration-300 group-hover:-translate-y-1 anim-fade-up delay-${Math.min(i + 1, 4)}`}>
                    <div className="flex h-32 items-end justify-between p-4" style={thumbnailStyle(o.course.thumbnail)}>
                      <Badge tone="ink" className="bg-white/15 text-white backdrop-blur">{o.course.category}</Badge>
                      {pct === 100 && <Badge tone="green">Completed</Badge>}
                    </div>
                    <div className="space-y-3 p-5">
                      <div>
                        <h2 className="font-display text-base font-bold leading-snug">{o.course.title}</h2>
                        <p className="mt-1 text-xs text-ink-soft">by {o.creatorName}</p>
                      </div>
                      <div>
                        <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-ink-soft">
                          <span>{done}/{total} lessons</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-cream">
                          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand">
                        {pct === 0 ? "Start learning" : pct === 100 ? "Review again" : "Continue"} <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Order history */}
        {owned.length > 0 && (
          <Card className="mt-8 overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-bold">Order history</h2>
            </div>
            <ol className="divide-y divide-line">
              {owned.map((o) => (
                <li key={o.purchase.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{o.course.title}</p>
                    <p className="font-mono text-xs text-ink-soft">
                      {o.purchase.razorpayPaymentId ?? o.purchase.razorpayOrderId}
                    </p>
                  </div>
                  <span className="font-medium">{o.purchase.grossPaise === 0 ? "Free" : formatINR(o.purchase.grossPaise)}</span>
                  <Badge tone={o.purchase.status === "paid" ? "green" : o.purchase.status === "failed" ? "red" : "neutral"}>
                    {o.purchase.status}
                  </Badge>
                  <span className="text-xs text-ink-soft">
                    {o.purchase.createdAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </main>
    </>
  );
}
