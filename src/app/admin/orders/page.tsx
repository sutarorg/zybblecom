import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { courses, purchases, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { Badge, Card, EmptyState } from "@/components/ui";
import { ReceiptText } from "lucide-react";

export const metadata = { title: "Orders & transactions" };

const TONE = { paid: "green", created: "amber", failed: "red", refunded: "neutral" } as const;

export default async function AdminOrdersPage() {
  await requireAdmin();
  const creators = alias(users, "creator");

  const rows = await db
    .select({
      purchase: purchases,
      courseTitle: courses.title,
      buyerName: users.name,
      creatorName: creators.name,
    })
    .from(purchases)
    .innerJoin(courses, eq(courses.id, purchases.courseId))
    .innerJoin(users, eq(users.id, purchases.buyerId))
    .innerJoin(creators, eq(creators.id, purchases.creatorId))
    .orderBy(desc(purchases.createdAt))
    .limit(200);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-display text-lg font-bold">Orders ({rows.length})</h2>
        <p className="text-xs text-ink-soft">
          Full transaction ledger — order IDs, splits and settlement state.
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10">
          <EmptyState icon={<ReceiptText className="size-6" />} title="No orders yet" body="Orders from Razorpay checkouts will appear here with their full split." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cream/50 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-3">Order / payment</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Fee (10%)</th>
                <th className="px-4 py-3 text-right">Creator (90%)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Settlement</th>
                <th className="px-5 py-3 text-right">Purchased</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.purchase.id} className="align-top">
                  <td className="px-5 py-3.5 font-mono text-xs text-ink-soft">
                    {r.purchase.razorpayOrderId}
                    {r.purchase.razorpayPaymentId && (
                      <span className="block text-ink">{r.purchase.razorpayPaymentId}</span>
                    )}
                    {r.purchase.failureReason && (
                      <span className="block max-w-40 text-red-600">{r.purchase.failureReason}</span>
                    )}
                  </td>
                  <td className="max-w-44 truncate px-4 py-3.5">{r.courseTitle}</td>
                  <td className="px-4 py-3.5">{r.buyerName}</td>
                  <td className="px-4 py-3.5">{r.creatorName}</td>
                  <td className="px-4 py-3.5 text-right font-medium">{formatINR(r.purchase.grossPaise)}</td>
                  <td className="px-4 py-3.5 text-right text-brand">{formatINR(r.purchase.feePaise)}</td>
                  <td className="px-4 py-3.5 text-right text-emerald-600">{formatINR(r.purchase.creatorPaise)}</td>
                  <td className="px-4 py-3.5">
                    <Badge tone={TONE[r.purchase.status]}>{r.purchase.status}</Badge>
                    {r.purchase.method && (
                      <span className="mt-1 block text-[10px] uppercase text-ink-soft">{r.purchase.method}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {r.purchase.status !== "paid" ? (
                      <span className="text-xs text-ink-soft">—</span>
                    ) : r.purchase.payoutId ? (
                      <Badge tone="green">Settled</Badge>
                    ) : (
                      <Badge tone="amber">Awaiting 4 PM</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs text-ink-soft">
                    {(r.purchase.paidAt ?? r.purchase.createdAt).toLocaleString("en-IN", {
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
