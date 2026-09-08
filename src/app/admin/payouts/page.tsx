import { desc, eq, isNull, sql, and } from "drizzle-orm";
import { Landmark } from "lucide-react";
import { db } from "@/db";
import { payouts, purchases, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { initials } from "@/lib/utils";
import { Badge, Card, EmptyState } from "@/components/ui";
import { RunSettleButton } from "@/components/run-settle-button";
import { getPlatformSettings } from "@/lib/settings";

export const metadata = { title: "Payouts & settlements" };

const TONE = { processing: "amber", processed: "green", failed: "red" } as const;

export default async function AdminPayoutsPage() {
  await requireAdmin();
  const settings = await getPlatformSettings();

  const rows = await db
    .select({ payout: payouts, creator: users })
    .from(payouts)
    .innerJoin(users, eq(users.id, payouts.creatorId))
    .orderBy(desc(payouts.createdAt))
    .limit(200);

  // Unsettled balances per creator (what the next run will pay).
  const pending = await db
    .select({
      creatorId: purchases.creatorId,
      creatorName: users.name,
      amount: sql<number>`coalesce(sum(${purchases.creatorPaise}),0)::int`,
      sales: sql<number>`count(*)::int`,
    })
    .from(purchases)
    .innerJoin(users, eq(users.id, purchases.creatorId))
    .where(and(eq(purchases.status, "paid"), isNull(purchases.payoutId), sql`${purchases.grossPaise} > 0`))
    .groupBy(purchases.creatorId, users.name);

  const settledTotal = rows
    .filter((r) => r.payout.status === "processed")
    .reduce((s, r) => s + r.payout.amountPaise, 0);
  const pendingTotal = pending.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-ink p-5 text-paper">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-paper/60">
            Awaiting next 4:00 PM run
          </p>
          <p className="mt-2 font-display text-2xl font-bold">{formatINR(pendingTotal)}</p>
          <p className="mt-1 text-xs text-paper/60">across {pending.length} creator{pending.length === 1 ? "" : "s"}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            Settled all-time
          </p>
          <p className="mt-2 font-display text-2xl font-bold">{formatINR(settledTotal)}</p>
          <p className="mt-1 text-xs text-ink-soft">via {rows.filter((r) => r.payout.status === "processed").length} payouts</p>
        </Card>
        <Card className="flex items-center justify-between gap-3 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Schedule</p>
            <p className="mt-1 font-display text-lg font-bold">Daily · 4:00 PM</p>
            <p className="text-xs text-ink-soft">
              min {formatINR(settings.minPayoutPaise)}
              {settings.pendingHours > 0 && ` · clears after ${settings.pendingHours}h`}
            </p>
          </div>
          <RunSettleButton />
        </Card>
      </div>

      {pending.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-line px-5 py-3.5">
            <h3 className="font-display text-base font-bold">Queued balances</h3>
          </div>
          <ol className="divide-y divide-line">
            {pending.map((p) => (
              <li key={p.creatorId} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="grid size-8 place-items-center rounded-full bg-cream font-display text-[10px] font-bold">
                  {initials(p.creatorName)}
                </span>
                <span className="flex-1 font-semibold">{p.creatorName}</span>
                <span className="text-xs text-ink-soft">{p.sales} sales</span>
                <span className="font-display font-bold">{formatINR(p.amount)}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold">Payout records</h2>
          <p className="text-xs text-ink-soft">Amounts, creators, statuses and Razorpay transfer IDs.</p>
        </div>
        {rows.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<Landmark className="size-6" />}
              title="No payouts yet"
              body="The 4:00 PM settlement run creates payout records here — or trigger one with the button above."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-cream/50 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-3">Creator</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Sales</th>
                  <th className="px-4 py-3">Razorpay payout</th>
                  <th className="px-4 py-3">Trigger</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.payout.id} className="align-top">
                    <td className="px-5 py-3.5 font-semibold">{r.creator.name}</td>
                    <td className="px-4 py-3.5 text-right font-display font-bold">
                      {formatINR(r.payout.amountPaise)}
                    </td>
                    <td className="px-4 py-3.5 text-right">{r.payout.purchaseCount}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-ink-soft">
                      {r.payout.razorpayPayoutId ?? "—"}
                      {r.payout.failureReason && (
                        <span className="block max-w-52 text-red-600">{r.payout.failureReason}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={r.payout.trigger === "manual" ? "brand" : "neutral"}>
                        {r.payout.trigger === "manual" ? "manual" : "scheduled"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={TONE[r.payout.status]}>{r.payout.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-ink-soft">
                      {r.payout.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      {r.payout.processedAt && (
                        <span className="block">
                          → {r.payout.processedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
