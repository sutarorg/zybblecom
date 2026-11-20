import "server-only";
import { z } from "zod";
import { verifySession } from "./session";
import { ApiError } from "./http";
import type { LedgerEntry } from "@/services/workspace-contracts";

export async function creditSummary() {
  const { client } = await verifySession();
  const { data, error } = await client.rpc("get_credit_summary").single();
  const result = z
    .object({
      available: z.number().int().nonnegative(),
      reserved: z.number().int().nonnegative(),
      consumed: z.number().int().nonnegative(),
    })
    .safeParse(data);
  if (error || !result.success) throw new ApiError("unavailable", 503);
  return result.data;
}
const cursorSchema = z.tuple([z.iso.datetime({ offset: true }), z.uuid()]);
const creditRow = z.object({
  id: z.uuid(),
  created_at: z.string(),
  kind: z.enum([
    "purchase",
    "reserve",
    "release",
    "consume",
    "refund",
    "adjustment",
  ]),
  pack_slug: z.string().nullable(),
  amount_minor: z.number().int().nullable(),
  currency: z.enum(["INR", "USD"]).nullable(),
  payment_status: z.string().nullable(),
  fulfillment_status: z.string().nullable(),
  credits: z.number().int(),
  reference_id: z.uuid().nullable(),
});
const entryKind = {
  reserve: "reserved",
  release: "released",
  consume: "consumed",
  refund: "refund",
  adjustment: "adjustment",
} as const;
export async function creditActivity(
  filter: "all" | "purchases" | "usage",
  cursor?: string,
) {
  const { client } = await verifySession();
  let before: string | null = null,
    id: string | null = null;
  if (cursor) {
    try {
      [before, id] = cursorSchema.parse(
        JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
      );
    } catch {
      throw new ApiError("validation", 400);
    }
  }
  const { data, error } = await client.rpc("list_credit_activity", {
    p_filter: filter,
    p_before: before,
    p_cursor: id,
  });
  const rows = z.array(creditRow).safeParse(data);
  if (error || !rows.success) throw new ApiError("unavailable", 503);
  const items: LedgerEntry[] = rows.data.slice(0, 25).map((row) => {
    const base = {
      id: row.id,
      createdAt: row.created_at,
      reference: row.reference_id ?? undefined,
    };
    if (row.kind !== "purchase")
      return { ...base, kind: entryKind[row.kind], creditDelta: row.credits };
    if (!row.pack_slug || !row.currency || !row.amount_minor)
      throw new ApiError("unavailable", 503);
    const verified =
      row.payment_status === "succeeded" &&
      row.fulfillment_status === "fulfilled";
    const paymentState = verified
      ? "confirmed"
      : row.payment_status === "refunded"
        ? "refunded"
        : row.fulfillment_status === "review"
          ? "review"
          : row.payment_status === "failed"
            ? "failed"
            : ["cancelled", "expired"].includes(row.payment_status ?? "")
              ? "cancelled"
              : "pending";
    return {
      ...base,
      kind: "purchase",
      packId: row.pack_slug,
      currency: row.currency,
      amountMinor: row.amount_minor,
      paymentState,
      ...(verified ? { grantedCredits: row.credits } : {}),
    };
  });
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      last && rows.data.length > 25
        ? Buffer.from(JSON.stringify([last.createdAt, last.id])).toString(
            "base64url",
          )
        : null,
  };
}
