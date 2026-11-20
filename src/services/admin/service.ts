import type { AdminError, AdminIntent, PreparedAction } from "./contracts";
type AsyncMethod = (...args: never[]) => Promise<unknown>;
type Failure = { ok: false; error: "unavailable" | "network" };
export function adminService<T extends { [K in keyof T]: AsyncMethod }>(
  adapter: Partial<T> = {},
) {
  return async <K extends keyof T>(
    key: K,
    ...args: Parameters<T[K]>
  ): Promise<Awaited<ReturnType<T[K]>> | Failure> => {
    const operation = adapter[key];
    if (!operation) return { ok: false, error: "unavailable" };
    try {
      return (await operation(...args)) as Awaited<ReturnType<T[K]>>;
    } catch {
      return { ok: false, error: "network" };
    }
  };
}
export const errorCopy: Record<AdminError, string> = {
  unavailable:
    "The administrative service is not connected. No records were loaded or changed.",
  unauthenticated: "Sign in with an authorized administrator account.",
  expired: "Your administrator session has expired. Sign in again to continue.",
  forbidden: "Your current role does not have permission to access this area.",
  not_found: "This record could not be found or is not accessible.",
  network: "Could not reach the administrative service. Try again.",
  invalid: "Check the information supplied and try again.",
  conflict:
    "The record changed or the confirmation is no longer valid. Review the current state and try again.",
  rate_limited: "Too many requests. Wait a moment and try again.",
  unexpected: "This operation could not be completed. Try again.",
};
export const validReason = (reason: string) =>
  reason.trim().length >= 8 && reason.trim().length <= 500;
export const validAmount = (value: number) =>
  Number.isSafeInteger(value) && value > 0;
export function canConfirm(
  intent: AdminIntent,
  prepared: PreparedAction,
  now = Date.now(),
) {
  const expiry = Date.parse(prepared.expiresAt);
  if (
    !prepared.id ||
    !prepared.targetLabel.trim() ||
    !prepared.summary.trim() ||
    !Number.isFinite(expiry) ||
    expiry <= now
  )
    return false;
  if (intent.kind === "add_credits" || intent.kind === "deduct_credits") {
    const balance = prepared.balance;
    const delta =
      intent.kind === "deduct_credits" ? -intent.amount : intent.amount;
    return Boolean(
      validAmount(intent.amount) &&
      balance &&
      Number.isSafeInteger(balance.previous) &&
      Number.isSafeInteger(balance.next) &&
      balance.delta === delta &&
      balance.previous + delta === balance.next,
    );
  }
  if (intent.kind === "reprocess") {
    const impact = prepared.reprocessing;
    return Boolean(
      impact?.creditImpact.trim() &&
      impact.providerCost.currency.match(/^[A-Z]{3}$/) &&
      Number.isSafeInteger(impact.providerCost.amountMinor) &&
      impact.providerCost.amountMinor >= 0 &&
      Number.isInteger(impact.providerCost.minorUnit) &&
      impact.providerCost.minorUnit >= 0 &&
      impact.providerCost.minorUnit <= 4,
    );
  }
  return true;
}
