import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { purchases } from "@/db/schema";

export type PaidResult =
  | { kind: "paid"; courseId: string }
  | { kind: "already" }
  | { kind: "duplicate" }
  | { kind: "missing" };

/**
 * Idempotently mark a purchase as paid. Safe to call from the checkout
 * success handler AND the Razorpay webhook — only the first caller wins.
 * Uses a transaction and re-checks for an existing paid enrollment so a
 * buyer can never be granted a course twice.
 */
export async function markPurchasePaid(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  method: string | null,
): Promise<PaidResult> {
  return db.transaction(async (tx) => {
    const [purchase] = await tx
      .select()
      .from(purchases)
      .where(eq(purchases.razorpayOrderId, razorpayOrderId))
      .limit(1);
    if (!purchase) return { kind: "missing" };
    if (purchase.status === "paid") return { kind: "already" };

    // Guard against a duplicated paid enrollment for the same buyer+course
    // (backed at the DB level by a partial unique index).
    const [existing] = await tx
      .select({ id: purchases.id })
      .from(purchases)
      .where(
        and(
          eq(purchases.buyerId, purchase.buyerId),
          eq(purchases.courseId, purchase.courseId),
          eq(purchases.status, "paid"),
        ),
      )
      .limit(1);

    if (existing) {
      await tx
        .update(purchases)
        .set({
          status: "refunded",
          razorpayPaymentId,
          failureReason: "Duplicate payment — buyer already enrolled",
        })
        .where(eq(purchases.id, purchase.id));
      return { kind: "duplicate" };
    }

    const [updated] = await tx
      .update(purchases)
      .set({
        status: "paid",
        razorpayPaymentId,
        method,
        paidAt: new Date(),
      })
      .where(and(eq(purchases.id, purchase.id), eq(purchases.status, "created")))
      .returning({ courseId: purchases.courseId });

    if (!updated) return { kind: "already" };
    return { kind: "paid", courseId: updated.courseId };
  });
}
