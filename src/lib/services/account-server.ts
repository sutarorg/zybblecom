import "server-only";
import { createFrontendServices } from "./index";
import { ApiError } from "@/lib/backend/http";
import { hasRecovery, verifySession } from "@/lib/backend/session";

export const accountServer = createFrontendServices({
  async getSession() {
    try {
      const { profile } = await verifySession();
      return {
        ok: true,
        value: { onboardingComplete: profile.onboarding_completed },
      };
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "unauthorized" && e.status === 401)
          return { ok: true, value: null };
        if (
          e.code === "unauthorized" ||
          e.code === "expired_session" ||
          e.code === "verification_required"
        )
          return { ok: false, error: e.code };
      }
      return { ok: false, error: "unavailable" };
    }
  },
  async getEmailVerification() {
    const state = await accountServer.getSession();
    if (!state.ok && state.error !== "verification_required") return state;
    return { ok: true, value: { verified: state.ok && Boolean(state.value) } };
  },
  async getRecoveryState() {
    try {
      const { client } = await verifySession();
      return (await hasRecovery(client))
        ? { ok: true, value: { active: true } }
        : { ok: false, error: "invalid_link" };
    } catch (e) {
      return {
        ok: false,
        error:
          e instanceof ApiError && e.code === "unavailable"
            ? "unavailable"
            : "invalid_link",
      };
    }
  },
});
