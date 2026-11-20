import "server-only";
import { cache } from "react";
import type { AdminReads } from "./contracts";
import { adminService } from "./service";
import { createAdminReadGuard } from "./access";
const read = adminService<AdminReads>();
export const adminSession = cache(() => read("getSession"));
/** Session 5 adapters still verify auth/permission at the data boundary. */
export const adminRead = createAdminReadGuard(read, adminSession);
