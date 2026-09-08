"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { courses, platformSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { runSettlement, type SettlementSummary } from "@/lib/settlement";
import { getPlatformSettings } from "@/lib/settings";

/** Admin moderation: force publish/unpublish any course. */
export async function adminSetCourseStatus(courseId: string, status: "draft" | "published") {
  await requireAdmin();
  await db
    .update(courses)
    .set({ status, updatedAt: new Date() })
    .where(eq(courses.id, courseId));
  revalidatePath("/admin/courses");
}

export async function runSettlementNow(): Promise<{
  error?: string;
  summary?: SettlementSummary;
}> {
  await requireAdmin();
  const summary = await runSettlement("manual");
  revalidatePath("/admin");
  revalidatePath("/admin/payouts");
  revalidatePath("/admin/orders");
  return { summary };
}

const settingsSchema = z.object({
  feePercent: z.coerce.number().int().min(0).max(30),
  minPayoutRupees: z.coerce.number().int().min(1).max(1_000_000),
  pendingHours: z.coerce.number().int().min(0).max(720),
});

export type SettingsState = { error?: string; success?: string } | null;

export async function savePlatformSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await requireAdmin();
  const current = await getPlatformSettings();
  const parsed = settingsSchema.safeParse({
    feePercent: formData.get("feePercent") ?? current.feePercent,
    minPayoutRupees: formData.get("minPayoutRupees") ?? current.minPayoutPaise / 100,
    pendingHours: formData.get("pendingHours") ?? current.pendingHours,
  });
  if (!parsed.success) return { error: "Invalid settings values." };

  await db
    .update(platformSettings)
    .set({
      feePercent: parsed.data.feePercent,
      minPayoutPaise: parsed.data.minPayoutRupees * 100,
      pendingHours: parsed.data.pendingHours,
    })
    .where(eq(platformSettings.id, 1));

  revalidatePath("/admin");
  return { success: "Platform settings updated." };
}
