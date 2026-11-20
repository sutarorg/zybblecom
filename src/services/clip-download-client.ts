import { z } from "zod";
import type { WorkspaceAdapter } from "./workspace-contracts";

const link = z.object({
  success: z.literal(true),
  data: z.object({ url: z.url() }),
});
export const downloadClip: WorkspaceAdapter["downloadClip"] = async ({
  projectId,
  clipId,
  asset,
}) => {
  try {
    const response = await fetch("/api/clips/download", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, clipId, asset }),
    });
    if (!response.ok)
      return {
        ok: false,
        error:
          response.status === 404
            ? "not_found"
            : response.status === 503
              ? "unavailable"
              : response.status === 429
                ? "rate_limited"
                : response.status === 401 || response.status === 403
                  ? "unauthorized"
                  : "network",
      };
    const result = link.safeParse(await response.json());
    return result.success
      ? { ok: true, value: result.data.data }
      : { ok: false, error: "network" };
  } catch {
    return { ok: false, error: "network" };
  }
};
