import { BookOpen, CircleDollarSign, GraduationCap, ShoppingBag, TrendingUp, Wallet, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewCourseButton } from "@/components/dashboard/new-course-button";
import {
  CourseStatusBadge,
  EmptyState,
  OrderStatusBadge,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  getCreatorCourses,
  getCreatorOrders,
  getCreatorOverview,
  getRevenueSeries,
} from "@/lib/queries";
import { cn, formatDate, formatINR, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview · Creator studio" };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardOverviewPage() {
  const user = await requireUser(["creator"]);
  const [stats, series, recent, courseRows] = await Promise.all([
    getCreatorOverview(user.id),
    getRevenueSeries(user.id, 30),
    getCreatorOrders(user.id, 6),
    getCreatorCourses(user.id),
  ]);

  const maxSeries = Math.max(1, ...series.map((s) => s.total));
  const hasCourses = courseRows.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`${greeting()}, ${user.name.split(" ")[0]}.`}
        sub="Here's how your courses are performing."
        actions={<NewCourseButton />}
      />

      {!hasCourses ? (
        <EmptyState
          icon={BookOpen}
          title="Create your first course"
          sub="Structure it with chapters and lessons, set a price, and share the link. It takes an evening — not a quarter."
        >
          <NewCourseButton large />
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={CircleDollarSign}
              tone="grape"
              label="Gross revenue"
              value={formatINR(stats.revenue)}
              sub="Lifetime course sales"
            />
            <StatCard
              icon={Wallet}
              tone="mint"
              label="Your earnings"
              value={formatINR(stats.earning)}
              sub="After platform commission"
            />
            <StatCard
              icon={GraduationCap}
              tone="amber"
              label="Students"
              value={String(stats.students)}
              sub={`${stats.publishedCourses} published course${stats.publishedCourses === 1 ? "" : "s"}`}
            />
            <StatCard
              icon={TrendingUp}
              tone="ink"
              label="Avg. completion"
              value={`${stats.avgCompletion}%`}
              sub="Lessons finished by students"
            />
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {/* Revenue chart */}
            <section className="card p-5 shadow-card sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold tracking-tight">Revenue — last 30 days</h2>
                <span className="badge badge-grape">{formatINR(series.reduce((s, d) => s + d.total, 0))}</span>
              </div>
              {series.every((d) => d.total === 0) ? (
                <div className="grid h-40 place-items-center text-center">
                  <p className="max-w-[240px] text-[13px] text-mut">
                    No sales in the last 30 days. Share your course link to get things moving.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-5 flex h-40 items-end gap-[3px]" role="img" aria-label="Revenue chart for the last 30 days">
                    {series.map((d) => (
                      <div
                        key={d.day}
                        title={`${d.label} — ${formatINR(d.total)}`}
                        className={cn(
                          "flex-1 rounded-t-[4px] transition-all",
                          d.total > 0
                            ? "bg-gradient-to-t from-grape/30 to-grape hover:from-grape/50 hover:to-grape-deep"
                            : "bg-cream",
                        )}
                        style={{ height: `${Math.max(4, (d.total / maxSeries) * 100)}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[10.5px] text-mut">
                    <span>{series[0]?.label}</span>
                    <span>{series[series.length - 1]?.label}</span>
                  </div>
                </>
              )}
            </section>

            {/* Recent orders */}
            <section className="card p-5 shadow-card sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold tracking-tight">Recent orders</h2>
                <Link href="/dashboard/orders" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-grape-deep hover:underline">
                  View all <ArrowRight className="size-3.5" />
                </Link>
              </div>
              {recent.length === 0 ? (
                <div className="grid h-40 place-items-center">
                  <p className="max-w-[240px] text-center text-[13px] text-mut">
                    When someone enrolls through your link, the order shows up here.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 space-y-2">
                  {recent.map((o) => (
                    <li key={o.id} className="flex items-center gap-3 rounded-2xl border border-line bg-paper/60 px-3.5 py-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#b7a4ff] to-[#6d4cff] text-[10px] font-bold text-white">
                        {initials(o.buyerName)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">{o.buyerName}</span>
                        <span className="block truncate text-[11.5px] text-mut">
                          {o.courseTitle} · {formatDate(o.createdAt)}
                        </span>
                      </span>
                      <span className="ml-auto text-[13px] font-semibold tabular-nums">
                        {o.netPaise === 0 ? "Free" : formatINR(o.netPaise)}
                      </span>
                      <OrderStatusBadge status={o.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Course performance */}
          <section className="card mt-6 overflow-hidden shadow-card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
              <h2 className="text-[15px] font-semibold tracking-tight">Course performance</h2>
              <Link href="/dashboard/courses" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-grape-deep hover:underline">
                Manage <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-line bg-cream/40">
                    <th className="table-th">Course</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Students</th>
                    <th className="table-th">Lessons</th>
                    <th className="table-th">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {courseRows.map((c) => (
                    <tr key={c.id} className="border-b border-line/60 last:border-0 hover:bg-paper/60">
                      <td className="table-td">
                        <Link href={`/dashboard/courses/${c.id}`} className="font-semibold text-ink hover:underline">
                          {c.title}
                        </Link>
                        <div className="mt-0.5 font-mono text-[11px] text-mut">/c/{c.slug}</div>
                      </td>
                      <td className="table-td">
                        <CourseStatusBadge status={c.status} />
                      </td>
                      <td className="table-td tabular-nums">{c.students}</td>
                      <td className="table-td tabular-nums">{c.lessons}</td>
                      <td className="table-td font-semibold tabular-nums text-ink">{formatINR(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
