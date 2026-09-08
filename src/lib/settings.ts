import { db } from "@/db";
import { platformSettings, type PlatformSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const DEFAULT_SETTINGS = {
  feePercent: 10,
  minPayoutPaise: 100, // ₹1
  pendingHours: 0,
};

/** Fetch the single settings row, creating defaults on first access. */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const rows = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.id, 1))
    .limit(1);
  if (rows[0]) return rows[0];
  const created = await db
    .insert(platformSettings)
    .values({ id: 1, ...DEFAULT_SETTINGS })
    .onConflictDoNothing()
    .returning();
  if (created[0]) return created[0];
  const again = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.id, 1))
    .limit(1);
  return again[0];
}
