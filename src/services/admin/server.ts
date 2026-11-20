import "server-only";
import { cache } from "react";
import type { AdminReads } from "./contracts";
import { adminService } from "./service";
import { createAdminReadGuard } from "./access";
import { ApiError } from "@/lib/backend/http";
import { verifySession } from "@/lib/backend/session";
import { privilegedDB } from "@/lib/backend/supabase";
const read = adminService<AdminReads>({
  async getSession() {
    try {
      const { user, profile } = await verifySession();
      const { data, error } = await privilegedDB()
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return { ok: false, error: "unavailable" };
      if (!data) return { ok: false, error: "forbidden" };
      return {
        ok: true,
        value: {
          id: user.id,
          name: profile.full_name || "Administrator",
          roleLabel: "Administrator",
          permissions: [
            "overview",
            "users",
            "projects",
            "jobs",
            "payments",
            "credits",
            "webhooks",
            "audit",
            "settings",
          ],
        },
      };
    } catch (e) {
      return {
        ok: false,
        error:
          e instanceof ApiError
            ? e.code === "expired_session"
              ? "expired"
              : e.status === 401
                ? "unauthenticated"
                : e.status === 403
                  ? "forbidden"
                  : "unavailable"
            : "unavailable",
      };
    }
  },
});
export const adminSession = cache(() => read("getSession"));
/** Session 5 adapters still verify auth/permission at the data boundary. */
export const adminRead = createAdminReadGuard(read, adminSession);
