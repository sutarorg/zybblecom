import type { AdminCommands } from "./contracts";
import { adminService } from "./service";
/** Install only credentialed same-origin admin endpoints in Session 5. */
export const command = adminService<AdminCommands>();
