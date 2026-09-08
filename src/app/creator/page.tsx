import Link from "next/link";
import { desc, eq, and } from "drizzle-orm";
import {
  ArrowUpRight,
  Banknote,
  BookOpen,
  GraduationCap,
  Link2,
  Plus,
  Receipt,
  Sparkles,
  Timer,
  Wallet,
} from "lucide-react";
import { db } from "@/db";
import { courses, purchases, payoutAccounts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { Badge, Card, EmptyState, buttonClasses } from "@/components/ui";
import { getPlatformSettings } from "@/lib/settings";

export const metadata = { title: "Creator studio" };

export default async function CreatorOverview() {
  const user = await requireUser("/creator");
  const settings = await getPlatformSettings();

  const paid = await db
    .select()
    .from(purchases)
    .where(and(eq(purchases.creatorId, user.id), eq(purchases.status, "paid")))
    .orderBy(desc(purchases.paidAt));

  const total = paid.reduce((s, p) => s + p.creatorPaise, 0);
  const settled = paid.filter((p) => p.payoutId).reduce((s, p) => s + p.creatorPaise, 0);
  const clearing = total - settled;
  const myCourses = await db
    .select()
    .from(courses)
    .where(eq(courses.creatorId, user.id))
    .orderBy(desc(courses.createdAt));
  const publishedCount = myCourses.filter((c) => c.status === "published").length;
  const [bank] = await db
    .select()
    .from(payoutAccounts)
    .where(eq(payoutAccounts.userId, user.id))
    .limit(1);

  const recent = paid.slice(0, 6);
  const courseById = new Map(myCourses.map((c) => [c.id, c]));
  const buyerNames = recent.length
    ? new Map(
        (
          await db.query.users.findMany({
            where: (t, { inArray }) => inArray(t.id, recent.map((p) => p.buyerId)),
          })
        ).map((u) => [u.id, u.name]),
      )
    : new Map<string, string>();

  const stats = [
    { icon: Wallet, label: "Total earned (90%)", value: formatINR(total), tone: "text-brand" },
    { icon: Banknote, label: "Settled to bank", value: formatINR(settled), tone: "text-emerald-600" },
    { icon: Timer, label: `Next 4 PM run`, value: formatINR(clearing), tone: "text-amber-600" },
    { icon: Receipt, label: "Sales", value: String(paid.length), tone: "text-ink" },
  ];

  return (
    <div className="space-y-6">
      {/* Onboarding nudges */}
      {(!bank || publishedCount === 0) && (
        <Card className="flex flex-col gap-3 border-brand/25 bg-brand/[0.04] p-5 sm:flex-row sm:items-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand text-white">
            <Sparkles className="size-5" />
          </span>
          <div className="flex-1">
            <p className="font-display font-bold">
              {publishedCount === 0 ? "Publish your first course" : "Add your bank account"}
            </p>
            <p className="text-sm text-ink-soft">
              {publishedCount === 0
                ? "Create a course, hit publish, and share your link anywhere."
                : "Zybble settles your earnings to your bank daily at 4:00 PM — add your details to get paid."}
            </p>
          </div>
          <Link
            href={publishedCount === 0 ? "/creator/courses/new" : "/creator/settings"}
            className={buttonClasses("ink", "sm")}
          >
            {publishedCount === 0 ? <><Plus className="size-4" /> Create course</> : "Add bank details"}
          </Link>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Card key={s.label} className={`p-4 sm:p-5 anim-fade-up delay-${i + 1}`}>
            <span className={`grid size-9 place-items-center rounded-xl bg-cream ${s.tone}`}>
              <s.icon className="size-4.5" />
            </span>
            <p className="mt-3 font-display text-xl font-bold tracking-tight sm:text-2xl">
              {s.value}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Recent sales */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display text-lg font-bold">Recent sales</h2>
            <Link href="/creator/transactions" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
              View all <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyState
                icon={<Receipt className="size-6" />}
                title="No sales yet"
                body="Share your course link — every purchase and its 90/10 split shows up here instantly."
              />
            </div>
          ) : (
            <ol className="divide-y divide-line">
              {recent.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cream font-display text-xs font-bold">
                    {(buyerNames.get(p.buyerId) ?? "B")[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {buyerNames.get(p.buyerId) ?? "A learner"}
                    </p>
                    <p className="truncate text-xs text-ink-soft">
                      {courseById.get(p.courseId)?.title ?? "Course"} ·{" "}
                      {p.paidAt?.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-sm font-bold text-emerald-600">
                      +{formatINR(p.creatorPaise)}
                    </p>
                    {p.payoutId ? (
                      <Badge tone="green">Settled</Badge>
                    ) : (
                      <Badge tone="amber">4 PM run</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* My courses quick list */}
        <Card className="overflow-hidden self-start">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display text-lg font-bold">Your courses</h2>
            <Link href="/creator/courses/new" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
              <Plus className="size-3.5" /> New
            </Link>
          </div>
          {myCourses.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-soft">
              <GraduationCap className="mx-auto mb-2 size-6" />
              You haven&apos;t created a course yet.
            </div>
          ) : (
            <ol className="divide-y divide-line">
              {myCourses.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                  <Link href={`/creator/courses/${c.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold hover:text-brand">{c.title}</p>
                    <p className="text-xs text-ink-soft">
                      {formatINR(c.pricePaise)} · <span className="capitalize">{c.status}</span>
                    </p>
                  </Link>
                  {c.status === "published" && (
                    <Link
                      href={`/c/${c.slug}`}
                      className="grid size-8 place-items-center rounded-full border border-line text-ink-soft transition hover:border-brand hover:text-brand"
                      title="Open public link"
                    >
                      <Link2 className="size-3.5" />
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          )}
          <div className="border-t border-line bg-cream/60 px-5 py-3 text-[13px] font-medium text-ink-soft">
            <BookOpen className="mr-1.5 inline size-3.5" />
            {publishedCount} published · platform fee {settings.feePercent}%
          </div>
        </Card>
      </div>
    </div>
  );
}
