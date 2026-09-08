import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { payoutAccounts, payouts, purchases, users } from "@/db/schema";
import { executePayout } from "@/lib/razorpay";
import { getPlatformSettings } from "@/lib/settings";

export type SettlementSummary = {
  processed: number;
  failed: number;
  skipped: number;
  totalPaise: number;
  details: Array<{
    creatorId: string;
    creatorName: string;
    amountPaise: number;
    status: "processed" | "failed" | "skipped";
    reason?: string;
    payoutId?: string;
  }>;
};

/**
 * Daily 4:00 PM settlement — collects every cleared, unsettled earning,
 * groups it per creator and pays out to the creator's bank account.
 *
 * Payout rules (platform settings):
 *  - earnings clear `pendingHours` after the sale
 *  - a creator's payable balance must reach `minPayoutPaise`
 *  - the creator must have bank details on file
 */
export async function runSettlement(
  trigger: "scheduled" | "manual",
): Promise<SettlementSummary> {
  const settings = await getPlatformSettings();
  const cutoff = new Date(Date.now() - settings.pendingHours * 3600_000);

  const eligible = await db
    .select({
      purchase: purchases,
      creator: users,
    })
    .from(purchases)
    .innerJoin(users, eq(users.id, purchases.creatorId))
    .where(
      and(
        eq(purchases.status, "paid"),
        isNull(purchases.payoutId),
        sql`${purchases.grossPaise} > 0`,
        lte(purchases.paidAt, cutoff),
      ),
    );

  const summary: SettlementSummary = {
    processed: 0,
    failed: 0,
    skipped: 0,
    totalPaise: 0,
    details: [],
  };

  // Group by creator.
  const byCreator = new Map<string, { creator: typeof users.$inferSelect; rows: typeof eligible }>();
  for (const row of eligible) {
    const entry = byCreator.get(row.creator.id) ?? { creator: row.creator, rows: [] };
    entry.rows.push(row);
    byCreator.set(row.creator.id, entry);
  }

  for (const [creatorId, entry] of byCreator) {
    const amountPaise = entry.rows.reduce((s, r) => s + r.purchase.creatorPaise, 0);

    if (amountPaise < settings.minPayoutPaise) {
      summary.skipped++;
      summary.details.push({
        creatorId,
        creatorName: entry.creator.name,
        amountPaise,
        status: "skipped",
        reason: `Below minimum payout threshold`,
      });
      continue;
    }

    const account = await db
      .select()
      .from(payoutAccounts)
      .where(eq(payoutAccounts.userId, creatorId))
      .limit(1)
      .then((r) => r[0]);

    if (!account) {
      summary.skipped++;
      summary.details.push({
        creatorId,
        creatorName: entry.creator.name,
        amountPaise,
        status: "skipped",
        reason: "No bank account on file",
      });
      continue;
    }

    // Create the payout record and lock the purchases to it atomically.
    const payout = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(payouts)
        .values({
          creatorId,
          amountPaise,
          purchaseCount: entry.rows.length,
          status: "processing",
          trigger,
        })
        .returning();
      await tx
        .update(purchases)
        .set({ payoutId: created.id })
        .where(
          and(
            eq(purchases.creatorId, creatorId),
            eq(purchases.status, "paid"),
            isNull(purchases.payoutId),
            sql`${purchases.grossPaise} > 0`,
            lte(purchases.paidAt, cutoff),
          ),
        );
      return created;
    });

    try {
      const result = await executePayout({
        name: entry.creator.name,
        email: entry.creator.email,
        holderName: account.holderName,
        accountNumber: account.accountNumber,
        ifsc: account.ifsc,
        amountPaise,
        idempotencyKey: `zybble_payout_${payout.id}`,
      });

      await db
        .update(payouts)
        .set({
          status: "processed",
          razorpayPayoutId: result.payoutId,
          processedAt: new Date(),
        })
        .where(eq(payouts.id, payout.id));

      summary.processed++;
      summary.totalPaise += amountPaise;
      summary.details.push({
        creatorId,
        creatorName: entry.creator.name,
        amountPaise,
        status: "processed",
        payoutId: result.payoutId,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Gateway error";
      // Release the purchases so a future run can retry them.
      await db
        .update(purchases)
        .set({ payoutId: null })
        .where(eq(purchases.payoutId, payout.id));
      await db
        .update(payouts)
        .set({ status: "failed", failureReason: reason, processedAt: new Date() })
        .where(eq(payouts.id, payout.id));

      summary.failed++;
      summary.details.push({
        creatorId,
        creatorName: entry.creator.name,
        amountPaise,
        status: "failed",
        reason,
      });
    }
  }

  return summary;
}
