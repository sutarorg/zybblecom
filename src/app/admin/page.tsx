import {
  ArrowRight,
  BadgePercent,
  BookOpen,
  CircleDollarSign,
  GraduationCap,
  Hourglass,
  ShoppingBag,
  Store,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge, PageHeader, StatCard } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getAdminOverview } from "@/lib/queries";
import { formatDateTime, formatINR, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverviewPage() {
  await requireUser(["admin"]);
  const data = await getAdminOverview();

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Admin overview"
        sub="Marketplace health at a glance — sales, creators, and money owed."
        actions={
          <Link href="/admin/settlements" className="btn btn-ink btn-md">
            Manage settlements <ArrowRight className="size-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={CircleDollarSign}
          tone="grape"
          label="Gross merchandise value"
          value={formatINR(data.gmv)}
          sub="All paid order volume"
        />
        <StatCard
          icon={BadgePercent}
          tone="mint"
          label="Platform revenue (10%)"
          value={formatINR(data.platformRevenue)}
          sub="Commission earned by Zybble"
        />
        <StatCard
          icon={ShoppingBag}
          tone="amber"
          label="Paid orders"
          value={String(data.paidOrders)}
        />
        <StatCard
          icon={Hourglass}
          tone="ink"
          label="Pending payouts"
          value={formatINR(data.pendingSettlementAmount)}
          sub={`${data.pendingSettlements} settlement${data.pendingSettlements === 1 ? "" : "s"} in queue`}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard icon={Store} tone="grape" label="Creators" value={String(data.creators)} />
        <StatCard icon={GraduationCap} tone="mint" label="Learners" value={String(data.learners)} />
        <StatCard icon={BookOpen} tone="amber" label="Published courses" value={String(data.publishedCourses)} />
      </div>

      <section className="card mt-6 overflow-hidden shadow-card">
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <h2 className="text-[15px] font-semibold tracking-tight">Recent activity</h2>
        </div>
        {data.recent.length === 0 ? (
          <p className="px-6 py-10 text-center text-[13.5px] text-mut">
            Orders across the platform will appear here.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {data.recent.map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#b7a4ff] to-[#6d4cff] text-[10px] font-bold text-white">
                  {initials(o.buyerName)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold">
                    {o.buyerName} <span className="font-normal text-mut">enrolled in</span> {o.courseTitle}
                  </span>
                  <span className="block text-[11.5px] text-mut">{formatDateTime(o.createdAt)}</span>
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
    </>
  );
}
