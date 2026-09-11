import { Scale, Users } from "lucide-react";
import type { Metadata } from "next";
import { CreatePayoutButton, MarkPaidButton } from "@/components/admin/settlement-actions";
import { EmptyState, PageHeader, SettlementBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getAllSettlements, getCreatorBalances } from "@/lib/queries";
import { formatDate, formatINR, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Settlements · Admin" };

export default async function AdminSettlementsPage() {
  await requireUser(["admin"]);
  const [balances, history] = await Promise.all([getCreatorBalances(), getAllSettlements()]);

  return (
    <>
      <PageHeader
        eyebrow="Money movement"
        title="Settlements"
        sub="Create payout batches for creators' unsettled earnings, then mark them paid once transferred."
      />

      <section>
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <Users className="size-4 text-grape" /> Creator balances
        </h2>
        {balances.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={Users}
              title="No creators yet"
              sub="Creator balances will appear here as soon as creators start selling."
            />
          </div>
        ) : (
          <div className="card mt-4 overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-line bg-cream/40">
                    <th className="table-th">Creator</th>
                    <th className="table-th">Courses</th>
                    <th className="table-th">Lifetime earned</th>
                    <th className="table-th">Settled</th>
                    <th className="table-th">Unsettled</th>
                    <th className="table-th text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => (
                    <tr key={b.creator.id} className="border-b border-line/60 last:border-0 hover:bg-paper/60">
                      <td className="table-td">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#b7a4ff] to-[#6d4cff] text-[9px] font-bold text-white">
                            {initials(b.creator.name)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold text-ink">{b.creator.name}</div>
                            <div className="truncate text-[11.5px] text-mut">{b.creator.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-td tabular-nums">{b.courses}</td>
                      <td className="table-td tabular-nums font-medium text-ink">{formatINR(b.earned)}</td>
                      <td className="table-td tabular-nums text-mut">{formatINR(b.settled)}</td>
                      <td className="table-td tabular-nums font-semibold text-amber">{formatINR(b.unsettled)}</td>
                      <td className="table-td text-right">
                        {b.unsettled > 0 ? (
                          <CreatePayoutButton creatorId={b.creator.id} />
                        ) : (
                          <span className="text-[12px] text-mut">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <Scale className="size-4 text-grape" /> Payout records
        </h2>
        {history.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={Scale}
              title="No payouts recorded"
              sub="When you create a payout from a creator's balance, it lands here with its status."
            />
          </div>
        ) : (
          <div className="card mt-4 overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-line bg-cream/40">
                    <th className="table-th">Created</th>
                    <th className="table-th">Creator</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Paid on</th>
                    <th className="table-th text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((s) => (
                    <tr key={s.id} className="border-b border-line/60 last:border-0 hover:bg-paper/60">
                      <td className="table-td whitespace-nowrap tabular-nums">{formatDate(s.createdAt)}</td>
                      <td className="table-td">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-ink">{s.creatorName}</div>
                          <div className="truncate text-[11.5px] text-mut">{s.creatorEmail}</div>
                        </div>
                      </td>
                      <td className="table-td font-semibold tabular-nums text-ink">
                        {formatINR(s.amountPaise)}
                      </td>
                      <td className="table-td">
                        <SettlementBadge status={s.status} />
                      </td>
                      <td className="table-td tabular-nums">{s.paidAt ? formatDate(s.paidAt) : "—"}</td>
                      <td className="table-td text-right">
                        {s.status === "pending" ? (
                          <MarkPaidButton settlementId={s.id} />
                        ) : (
                          <span className="text-[12px] text-mut">Settled</span>
                        )}
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
