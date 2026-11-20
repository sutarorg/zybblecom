import type { AdminReads, AdminSession, Permission, Result } from "./contracts";
import { adminService } from "./service";
type ReadOperation = Exclude<keyof AdminReads, "getSession">;
export const permissionFor = {
  overview: "overview",
  activity: "overview",
  users: "users",
  user: "users",
  projects: "projects",
  project: "projects",
  jobs: "jobs",
  job: "jobs",
  payments: "payments",
  payment: "payments",
  creditTotals: "credits",
  ledger: "credits",
  webhooks: "webhooks",
  webhook: "webhooks",
  audit: "audit",
  settings: "settings",
} satisfies Record<ReadOperation, Permission>;
export function createAdminReadGuard(
  read: ReturnType<typeof adminService<AdminReads>>,
  session: () => Promise<Result<AdminSession>>,
) {
  return async <K extends ReadOperation>(
    key: K,
    ...args: Parameters<AdminReads[K]>
  ) => {
    const auth = await session();
    if (!auth.ok) return auth;
    if (!auth.value.permissions.includes(permissionFor[key]))
      return { ok: false, error: "forbidden" } as const;
    return read(key, ...args);
  };
}
