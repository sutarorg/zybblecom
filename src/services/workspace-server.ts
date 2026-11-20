import "server-only";
import { cache } from "react";
import { createWorkspaceServices } from "./workspace";
import { ApiError } from "@/lib/backend/http";
import { verifySession } from "@/lib/backend/session";
import { creditActivity, creditSummary } from "@/lib/backend/credit-reads";
import { storedPreferences } from "./settings-schema";
import type { Result } from "./workspace-contracts";
async function read<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    if (
      e instanceof ApiError &&
      [
        "unauthorized",
        "expired_session",
        "verification_required",
        "validation",
      ].includes(e.code)
    ) {
      return {
        ok: false,
        error: e.code as
          | "unauthorized"
          | "expired_session"
          | "verification_required"
          | "validation",
      };
    }
    return { ok: false, error: "unavailable" };
  }
}
export const workspace = createWorkspaceServices({
  getProfile: () =>
    read(async () => {
      const { profile } = await verifySession();
      return { name: profile.full_name, email: profile.email };
    }),
  getPreferences: () =>
    read(async () => {
      const { profile } = await verifySession();
      return storedPreferences.parse(profile.preferences);
    }),
  getBalance: () => read(creditSummary),
  listLedger: ({ filter, cursor }) =>
    read(() => creditActivity(filter, cursor)),
});
export const getProfile = cache(() => workspace.run("getProfile"));
export const getBalance = cache(() => workspace.run("getBalance"));
