import "server-only";
import { cache } from "react";
import { createWorkspaceServices } from "./workspace";
import { ApiError } from "@/lib/backend/http";
import { verifySession } from "@/lib/backend/session";
import { creditActivity, creditSummary } from "@/lib/backend/credit-reads";
import { storedPreferences } from "./settings-schema";
import { archivedClip } from "@/lib/backend/media";
import { clipLocator } from "@/lib/media/providers";
import type { Clip, Result } from "./workspace-contracts";
async function read<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404)
      return { ok: false, error: "not_found" };
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
  getClip: (projectId, clipId) =>
    read<Clip>(async () => {
      // Keep disconnected preview honest even for placeholder fixture URLs.
      if (!clipLocator.safeParse({ projectId, clipId }).success)
        throw new ApiError("unavailable", 503);
      const { clip, presentation, keys, sign } = await archivedClip(
        projectId,
        clipId,
      );
      const playback = keys.get("mp4"),
        poster = keys.get("thumbnail"),
        vtt = keys.get("vtt");
      return {
        id: clip.id,
        projectId: clip.project_id,
        projectTitle: "",
        title: clip.title,
        description: clip.description ?? undefined,
        createdAt: clip.created_at,
        aspect: presentation.aspect,
        captions: presentation.captions || "clean",
        durationSeconds: clip.duration_seconds,
        startSeconds: clip.start_seconds,
        endSeconds: clip.end_seconds,
        transcript: clip.transcript ?? undefined,
        playback: playback ? await sign(playback, "mp4") : undefined,
        poster: poster ? await sign(poster, "thumbnail") : undefined,
        vtt: vtt ? await sign(vtt, "vtt") : undefined,
        downloads: [...keys.keys()],
        canEditMetadata: false,
      };
    }),
  getBalance: () => read(creditSummary),
  listLedger: ({ filter, cursor }) =>
    read(() => creditActivity(filter, cursor)),
});
export const getProfile = cache(() => workspace.run("getProfile"));
export const getBalance = cache(() => workspace.run("getBalance"));
