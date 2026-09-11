import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState, OrderStatusBadge, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCreatorOrders } from "@/lib/queries";
import { formatDateTime, formatINR, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders · Creator studio" };

export default async function OrdersPage() {
  const user = await requireUser(["creator"]);
  const orders = await getCreatorOrders(user.id);

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Orders"
        sub="Every enrollment through your links, with the full money trail."
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          sub="When someone enrolls through your course link, the order lands here with buyer, price, and status."
        />
      ) : (
        <div className="card overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead>
                <tr className="border-b border-line bg-cream/40">
                  <th className="table-th">Date</th>
                  <th className="table-th">Buyer</th>
                  <th className="table-th">Course</th>
                  <th className="table-th">Gross</th>
                  <th className="table-th">Discount</th>
                  <th className="table-th">Net</th>
                  <th className="table-th">Platform fee</th>
                  <th className="table-th">You earn</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-line/60 last:border-0 hover:bg-paper/60">
                    <td className="table-td whitespace-nowrap tabular-nums">{formatDateTime(o.createdAt)}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#b7a4ff] to-[#6d4cff] text-[9px] font-bold text-white">
                          {initials(o.buyerName)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-ink">{o.buyerName}</div>
                          <div className="truncate text-[11.5px] text-mut">{o.buyerEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td max-w-[180px]">
                      <span className="block truncate">{o.courseTitle}</span>
                    </td>
                    <td className="table-td tabular-nums">{formatINR(o.grossPaise)}</td>
                    <td className="table-td tabular-nums text-mut">
                      {o.discountPaise > 0 ? `−${formatINR(o.discountPaise)}` : "—"}
                    </td>
                    <td className="table-td tabular-nums font-semibold text-ink">{formatINR(o.netPaise)}</td>
                    <td className="table-td tabular-nums text-mut">
                      {o.status === "paid" ? formatINR(o.platformFeePaise) : "—"}
                    </td>
                    <td className="table-td tabular-nums font-semibold text-mint">
                      {o.status === "paid" ? formatINR(o.creatorEarningPaise) : "—"}
                    </td>
                    <td className="table-td">
                      <OrderStatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
