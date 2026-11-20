import { one, listingHref, type Query } from "@/services/workspace-query";
export { one, listingHref, type Query };
export const choice = <T extends string>(
  q: Query,
  k: string,
  allowed: readonly T[],
) => allowed.find((item) => item === one(q, k));
export const cursor = (q: Query, key = "cursor") =>
  one(q, key, 2048) || undefined;
export const date = (q: Query, k: string) => {
  const value = one(q, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
    ? value
    : undefined;
};
export const dateRange = (q: Query) => {
  const from = date(q, "from"),
    to = date(q, "to");
  return { from, to };
};
export const invalidDateRange = (q: Query) => {
  const { from, to } = dateRange(q);
  return Boolean(
    (q.from && !from) || (q.to && !to) || (from && to && from > to),
  );
};
export const country = (q: Query) => {
  const c = one(q, "country").toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : undefined;
};
export const userPath = (id: string) =>
  `/admin/users/${encodeURIComponent(id)}`;
export const jobPath = (id: string) => `/admin/jobs/${encodeURIComponent(id)}`;
export const accountStates = ["active", "suspended"] as const;
export const projectStates = [
  "uploading",
  "uploaded",
  "processing",
  "completed",
  "failed",
] as const;
export const jobFilters = [
  "processing",
  "completed",
  "failed",
  "stuck",
  "asset_copy_failed",
] as const;
export const paymentStates = [
  "pending",
  "succeeded",
  "failed",
  "refunded",
  "disputed",
] as const;
export const ledgerKinds = [
  "purchase",
  "reserve",
  "consume",
  "release",
  "refund",
  "adjustment",
] as const;
export const hookSources = ["clipsdk", "dodo"] as const;
export const hookSignatures = ["verified", "invalid", "not_checked"] as const;
export const hookStates = [
  "processed",
  "duplicate",
  "failed",
  "pending_reconciliation",
] as const;
export const auditCategories = [
  "users",
  "jobs",
  "credits",
  "webhooks",
  "settings",
  "access",
] as const;
