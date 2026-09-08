import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import {
  ArrowUpRight,
  BookOpen,
  Landmark,
  Percent,
  ReceiptText,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { db } from "@/db";
import { courses, payouts, purchases, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { Badge, Card } from "@/components/ui";
import { getPlatformSettings } from "@/lib/settings";
import { razorpayConfigured } from "@/lib/razorpay";

export const metadata = { title: "Admin overview" };

export default async function AdminOverview() {
  await requireAdmin();
  const settings = await getPlatformSettings();

  const [money] = await db
    .select({
      gmv: sql<number>`coalesce(sum(${purchases.grossPaise}),0)::int`,
      fees: sql<number>`coalesce(sum(${purchases.feePaise}),0)::int`,
      creator: sql<number>`coalesce(sum(${purchases.creatorPaise}),0)::int`,
      orders: sql<number>`count(*)::int`,
    })
    .from(purchases)
    .where(eq(purchases.status, "paid"));

  const [payoutAgg] = await db
    .select({
      settled: sql<number>`coalesce(sum(case when ${payouts.status} = 'processed' then ${payouts.amountPaise} else 0 end),0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(payouts);

  const userCount = await db.$count(users);
  const courseCount = await db.$count(courses);
  const publishedCount = await db.$count(courses, eq(courses.status, "published"));

  const recentOrders = await db
    .select({
      purchase: purchases,
      courseTitle: courses.title,
      buyerName: users.name,
    })
    .from(purchases)
    .innerJoin(courses, eq(courses.id, purchases.courseId))
    .innerJoin(users, eq(users.id, purchases.buyerId))
    .orderBy(desc(purchases.createdAt))
    .limit(6);

  const stats = [
    { icon: TrendingUp, label: "Gross sales (GMV)", value: formatINR(money.gmv), cls: "bg-ink text-lime" },
    { icon: Percent, label: `Platform revenue (${settings.feePercent}%)`, value: formatINR(money.fees), cls: "bg-brand text-white" },
    { icon: Wallet, label: "Creator earnings (90%)", value: formatINR(money.creator), cls: "bg-cream text-ink" },
    { icon: Landmark, label: `Settled via ${payoutAgg.count} payouts`, value: formatINR(payoutAgg.settled), cls: "bg-emerald-100 text-emerald-700" },
    { icon: Users, label: "Users", value: String(userCount), cls: "bg-cream text-ink" },
    { icon: BookOpen, label: `Courses (${publishedCount} live)`, value: String(courseCount), cls: "bg-cream text-ink" },
  ];

  return (
    <div className="space-y-5">
      {!razorpayConfigured() && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Razorpay keys are not configured — the platform is running in test mode with a
          simulated gateway. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and
          RAZORPAY_WEBHOOK_SECRET to go live.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((s, i) => (
          <Card key={s.label} className={`p-5 anim-fade-up delay-${Math.min(i + 1, 4)}`}>
            <span className={`grid size-9 place-items-center rounded-xl ${s.cls}`}>
              <s.icon className="size-4.5" />
            </span>
            <p className="mt-3 font-display text-2xl font-bold tracking-tight">{s.value}</p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold">Latest orders</h2>
          <Link href="/admin/orders" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
            All orders <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">
            <ReceiptText className="mx-auto mb-2 size-5" /> No orders yet.
          </p>
        ) : (
          <ol className="divide-y divide-line">
            {recentOrders.map((r) => (
              <li key={r.purchase.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {r.buyerName} → {r.courseTitle}
                  </p>
                  <p className="font-mono text-xs text-ink-soft">{r.purchase.razorpayOrderId}</p>
                </div>
                <span className="font-medium">{formatINR(r.purchase.grossPaise)}</span>
                <Badge tone={r.purchase.status === "paid" ? "green" : r.purchase.status === "failed" ? "red" : "amber"}>
                  {r.purchase.status}
                </Badge>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
