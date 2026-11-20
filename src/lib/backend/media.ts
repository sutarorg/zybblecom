import "server-only";
import { mediaKinds, r2Config, signArchiveGet } from "@/lib/media/providers";
import { z } from "zod";
import type { AssetKind } from "@/services/workspace-contracts";
import { ApiError } from "./http";
import { verifySession } from "./session";
import { privilegedDB } from "./supabase";

export async function archivedClip(projectId: string, clipId: string) {
  const config = r2Config(process.env);
  if (!config) throw new ApiError("unavailable", 503);
  const { client, user } = await verifySession();
  // User RLS is the first boundary; the privilege-escalated asset lookup is scoped again below.
  const { data: clip, error } = await client
    .from("clips")
    .select(
      "id,title,description,transcript,start_seconds,end_seconds,duration_seconds,project_id,created_at,generation_job_id,video_asset_id,thumbnail_asset_id,srt_asset_id,vtt_asset_id",
    )
    .eq("id", clipId)
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .eq("status", "ready")
    .maybeSingle();
  if (error) throw new ApiError("unavailable", 503);
  if (!clip) throw new ApiError("not_found", 404);
  const { data: job, error: jobError } = await client
    .from("generation_jobs")
    .select("aspect,captions")
    .eq("id", clip.generation_job_id)
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .eq("status", "completed")
    .eq("reservation_status", "consumed")
    .maybeSingle();
  if (jobError) throw new ApiError("unavailable", 503);
  if (!job) throw new ApiError("not_found", 404);
  const presentation = z
    .object({
      aspect: z.enum(["9:16", "1:1", "4:5", "16:9"]),
      captions: z.union([
        z.literal(false),
        z.enum(["bold", "karaoke", "minimal"]),
      ]),
    })
    .safeParse(job);
  if (!presentation.success) throw new ApiError("unavailable", 503);
  const kinds = Object.keys(mediaKinds) as AssetKind[];
  const ids = kinds.flatMap((kind) => {
    const id = clip[mediaKinds[kind].column];
    return id ? [id] : [];
  });
  const db = privilegedDB();
  const { data: assets, error: assetError } = ids.length
    ? await db
        .from("media_assets")
        .select("id,asset_type,object_key")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .eq("storage_provider", "r2")
        .eq("bucket_name", config.bucket)
        .eq("upload_status", "verified")
        .eq("storage_status", "ready")
        .in("id", ids)
    : { data: [], error: null };
  if (assetError) throw new ApiError("unavailable", 503);
  const keys = new Map<AssetKind, string>();
  for (const kind of kinds) {
    const spec = mediaKinds[kind];
    const row = assets?.find(
      (asset) =>
        asset.id === clip[spec.column] && asset.asset_type === spec.type,
    );
    if (row) keys.set(kind, row.object_key);
  }
  return {
    clip,
    presentation: presentation.data,
    keys,
    sign: (key: string, kind: AssetKind, download = false) =>
      signArchiveGet(config, key, kind, download),
  };
}
