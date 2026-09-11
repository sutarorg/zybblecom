"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { courses, orders, settlements } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export type AdminResult =
  | { ok: true; id?: string; amount?: number }
  | { ok: false; error: string };

export async function createSettlementAction(creatorId: string, note?: string): Promise<AdminResult> {
  await requireUser(["admin"]);

  try {
    return await db.transaction(async (tx) => {
      const unsettled = await tx
        .select({ id: orders.id, earning: orders.creatorEarningPaise })
        .from(orders)
        .innerJoin(courses, eq(orders.courseId, courses.id))
        .where(
          and(
            eq(courses.creatorId, creatorId),
            eq(orders.status, "paid"),
            isNull(orders.settlementId),
          ),
        );

      if (unsettled.length === 0) {
        return { ok: false, error: "This creator has no unsettled earnings." };
      }

      const amount = unsettled.reduce((sum, r) => sum + r.earning, 0);
      const [settlement] = await tx
        .insert(settlements)
        .values({ creatorId, amountPaise: amount, note: note?.trim() || null })
        .returning();

      await tx
        .update(orders)
        .set({ settlementId: settlement.id })
        .where(inArray(orders.id, unsettled.map((o) => o.id)));

      return { ok: true, id: settlement.id, amount };
    });
  } catch {
    return { ok: false, error: "Could not create the payout. Please try again." };
  } finally {
    revalidatePath("/admin");
    revalidatePath("/admin/settlements");
  }
}

export async function markSettlementPaidAction(settlementId: string): Promise<AdminResult> {
  await requireUser(["admin"]);
  const [row] = await db.select().from(settlements).where(eq(settlements.id, settlementId)).limit(1);
  if (!row) return { ok: false, error: "Payout not found." };
  if (row.status === "paid") return { ok: false, error: "This payout is already marked as paid." };

  await db
    .update(settlements)
    .set({ status: "paid", paidAt: new Date() })
    .where(eq(settlements.id, settlementId));

  revalidatePath("/admin");
  revalidatePath("/admin/settlements");
  revalidatePath("/dashboard/earnings");
  return { ok: true, id: settlementId };
}

export async function getUnsettledForCreator(creatorId: string) {
  const [row] = await db
    .select({ amount: sql<number>`coalesce(sum(${orders.creatorEarningPaise}), 0)::bigint` })
    .from(orders)
    .innerJoin(courses, eq(orders.courseId, courses.id))
    .where(
      and(
        eq(courses.creatorId, creatorId),
        eq(orders.status, "paid"),
        isNull(orders.settlementId),
      ),
    );
  return Number(row?.amount ?? 0);
}
