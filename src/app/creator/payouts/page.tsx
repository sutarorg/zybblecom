import Link from "next/link";
import { desc, eq, isNull, and } from "drizzle-orm";
import { Banknote, Clock3, Landmark } from "lucide-react";
import { db } from "@/db";
import { payoutAccounts, payouts, purchases } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { maskAccount } from "@/lib/utils";
import { Badge, Card, EmptyState, buttonClasses } from "@/components/ui";
import { getPlatformSettings } from "@/lib/settings";

export const metadata = { title: "Payouts & settlements" };

const TONE = { processing: "amber", processed: "green", failed: "red" } as const;

export default async function CreatorPayoutsPage() {
  const user = await requireUser("/creator/payouts");
  const settings = await getPlatformSettings();

  const pendingRows = await db
    .select()
    .from(purchases)
    .where(
      and(
        eq(purchases.creatorId, user.id),
        eq(purchases.status, "paid"),
        isNull(purchases.payoutId),
      ),
    );
  const pendingBalance = pendingRows.reduce((s, p) => s + p.creatorPaise, 0);

  const [bank] = await db
    .select()
    .from(payoutAccounts)
    .where(eq(payoutAccounts.userId, user.id))
    .limit(1);

  const history = await db
    .select()
    .from(payouts)
    .where(eq(payouts.creatorId, user.id))
    .orderBy(desc(payouts.createdAt))
    .limit(60);

  const settledTotal = history
    .filter((p) => p.status === "processed")
    .reduce((s, p) => s + p.amountPaise, 0);

  return (
    <div className="space-y-5">
      {/* Balance cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-ink p-5 text-paper">
          <Clock3 className="size-5 text-lime" />
          <p className="mt-3 font-display text-2xl font-bold">{formatINR(pendingBalance)}</p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-paper/60">
            In next 4:00 PM run
          </p>
        </Card>
        <Card className="p-5">
          <Banknote className="size-5 text-emerald-600" />
          <p className="mt-3 font-display text-2xl font-bold">{formatINR(settledTotal)}</p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            Settled all-time
          </p>
        </Card>
        <Card className="p-5">
          <Landmark className="size-5 text-brand" />
          {bank ? (
            <>
              <p className="mt-3 font-display text-lg font-bold leading-tight">{bank.holderName}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                {maskAccount(bank.accountNumber)} · {bank.ifsc}
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 font-display text-lg font-bold">No bank account</p>
              <Link href="/creator/settings" className="mt-1 inline-block text-[13px] font-semibold text-brand hover:underline">
                Add bank details →
              </Link>
            </>
          )}
        </Card>
      </div>

      {!bank && pendingBalance > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          You have {formatINR(pendingBalance)} waiting, but settlements need a bank account.
          Add one to join the next 4:00 PM run. Minimum payout {formatINR(settings.minPayoutPaise)}.
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold">Settlement history</h2>
          <p className="text-xs text-ink-soft">
            Automatic daily payout run at 4:00 PM · min {formatINR(settings.minPayoutPaise)}
            {settings.pendingHours > 0 && ` · sales clear after ${settings.pendingHours}h`}
          </p>
        </div>
        {history.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<Landmark className="size-6" />}
              title="No payouts yet"
              body="Once you have cleared earnings, the 4:00 PM settlement run sends them to your bank automatically."
              action={<Link href="/creator/courses" className={buttonClasses("ink", "sm")}>Share a course</Link>}
            />
          </div>
        ) : (
          <ol className="divide-y divide-line">
            {history.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-2xl ${
                    p.status === "processed"
                      ? "bg-emerald-100 text-emerald-700"
                      : p.status === "failed"
                        ? "bg-red-100 text-red-600"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <Landmark className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold">{formatINR(p.amountPaise)}</p>
                  <p className="text-xs text-ink-soft">
                    {p.purchaseCount} sale{p.purchaseCount === 1 ? "" : "s"} ·{" "}
                    {p.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    {p.razorpayPayoutId && <span className="font-mono"> · {p.razorpayPayoutId}</span>}
                  </p>
                  {p.failureReason && (
                    <p className="mt-0.5 text-xs font-medium text-red-600">{p.failureReason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={p.trigger === "manual" ? "brand" : "neutral"}>
                    {p.trigger === "manual" ? "manual" : "4 PM run"}
                  </Badge>
                  <Badge tone={TONE[p.status]}>{p.status}</Badge>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
