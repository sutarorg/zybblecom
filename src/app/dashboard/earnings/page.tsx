import { BadgePercent, CircleDollarSign, Hourglass, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState, PageHeader, SettlementBadge, StatCard } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCreatorEarnings } from "@/lib/queries";
import { formatDate, formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Earnings · Creator studio" };

export default async function EarningsPage() {
  const user = await requireUser(["creator"]);
  const data = await getCreatorEarnings(user.id);

  return (
    <>
      <PageHeader
        eyebrow="Money"
        title="Earnings"
        sub="Zybble keeps a 10% commission on each sale — you keep the rest. Balances are settled to you periodically."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={CircleDollarSign}
          tone="grape"
          label="Gross sales"
          value={formatINR(data.gross)}
          sub="Everything buyers paid"
        />
        <StatCard
          icon={BadgePercent}
          tone="amber"
          label="Platform commission (10%)"
          value={formatINR(data.fees)}
          sub="Zybble's share of sales"
        />
        <StatCard
          icon={Wallet}
          tone="mint"
          label="Your earnings"
          value={formatINR(data.earned)}
          sub={`${formatINR(data.settled)} settled so far`}
        />
        <StatCard
          icon={Hourglass}
          tone="ink"
          label="Unsettled balance"
          value={formatINR(data.unsettled)}
          sub="Queued for the next payout"
        />
      </div>

      <section className="mt-8">
        <h2 className="text-[15px] font-semibold tracking-tight">Payout history</h2>
        {data.settlements.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={Wallet}
              title="No payouts yet"
              sub="Once you've earned, payouts appear here with their status and dates."
            />
          </div>
        ) : (
          <div className="card mt-4 overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-line bg-cream/40">
                    <th className="table-th">Created</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Paid on</th>
                    <th className="table-th">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {data.settlements.map((s) => (
                    <tr key={s.id} className="border-b border-line/60 last:border-0 hover:bg-paper/60">
                      <td className="table-td whitespace-nowrap tabular-nums">{formatDate(s.createdAt)}</td>
                      <td className="table-td font-semibold tabular-nums text-ink">
                        {formatINR(s.amountPaise)}
                      </td>
                      <td className="table-td">
                        <SettlementBadge status={s.status} />
                      </td>
                      <td className="table-td tabular-nums">
                        {s.paidAt ? formatDate(s.paidAt) : "—"}
                      </td>
                      <td className="table-td max-w-[220px]">
                        <span className="block truncate text-mut">{s.note ?? "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
