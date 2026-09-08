import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ReceiptText } from "lucide-react";
import { db } from "@/db";
import { courses, purchases, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { Badge, Card, EmptyState, buttonClasses } from "@/components/ui";

export const metadata = { title: "Sales & transactions" };

const STATUS_TONE = {
  paid: "green",
  created: "amber",
  failed: "red",
  refunded: "neutral",
} as const;

export default async function TransactionsPage() {
  const user = await requireUser("/creator/transactions");

  const rows = await db
    .select({
      purchase: purchases,
      courseTitle: courses.title,
      buyerName: users.name,
      buyerEmail: users.email,
    })
    .from(purchases)
    .innerJoin(courses, eq(courses.id, purchases.courseId))
    .innerJoin(users, eq(users.id, purchases.buyerId))
    .where(eq(purchases.creatorId, user.id))
    .orderBy(desc(purchases.createdAt))
    .limit(100);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-display text-lg font-bold">Transaction history</h2>
        <p className="text-xs text-ink-soft">
          Every order on your courses — gross, platform fee, and your 90%.
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10">
          <EmptyState
            icon={<ReceiptText className="size-6" />}
            title="No transactions yet"
            body="Share your course link to make your first sale."
            action={<Link href="/creator/courses" className={buttonClasses("ink", "sm")}>Your courses</Link>}
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cream/50 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-3">Buyer</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Fee</th>
                <th className="px-4 py-3 text-right">You got</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.purchase.id} className="align-top">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold">{r.buyerName}</p>
                    <p className="text-xs text-ink-soft">{r.buyerEmail}</p>
                  </td>
                  <td className="max-w-44 truncate px-4 py-3.5">{r.courseTitle}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-ink-soft">
                    {r.purchase.razorpayOrderId}
                    {r.purchase.razorpayPaymentId && (
                      <span className="block">{r.purchase.razorpayPaymentId}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium">{formatINR(r.purchase.grossPaise)}</td>
                  <td className="px-4 py-3.5 text-right text-red-600">−{formatINR(r.purchase.feePaise)}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">
                    {formatINR(r.purchase.creatorPaise)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tone={STATUS_TONE[r.purchase.status]}>{r.purchase.status}</Badge>
                    {r.purchase.status === "paid" &&
                      (r.purchase.payoutId ? (
                        <span className="mt-1 block text-[10px] font-semibold uppercase text-emerald-600">settled</span>
                      ) : (
                        <span className="mt-1 block text-[10px] font-semibold uppercase text-amber-600">unsettled</span>
                      ))}
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs text-ink-soft">
                    {r.purchase.createdAt.toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
