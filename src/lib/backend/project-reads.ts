import "server-only";
import { z } from "zod";
import { ApiError } from "./http";
import { verifySession } from "./session";
import type { Project, ProjectQuery } from "@/services/workspace-contracts";

const selectProject = `id,title,status,created_at,source:media_assets!projects_source_owner_fk(original_filename,size_bytes,duration_seconds,width,height,asset_type,upload_status,storage_status)`;
const rowSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  created_at: z.iso.datetime({ offset: true }),
  status: z.enum([
    "uploading",
    "uploaded",
    "processing",
    "completed",
    "failed",
  ]),
  source: z
    .object({
      original_filename: z.string().nullable(),
      size_bytes: z.number().int().positive().nullable(),
      duration_seconds: z.number().positive().nullable(),
      width: z.number().int().positive().nullable(),
      height: z.number().int().positive().nullable(),
      asset_type: z.string(),
      upload_status: z.string(),
      storage_status: z.string(),
    })
    .nullable(),
});
const cursorSchema = z.tuple([z.iso.datetime({ offset: true }), z.uuid()]);
const count = z.number().int().nonnegative();
type Client = Awaited<ReturnType<typeof verifySession>>["client"];

async function projectsWithCounts(
  client: Client,
  rows: z.infer<typeof rowSchema>[],
): Promise<Project[]> {
  if (!rows.length) return [];
  const { data, error } = await client.rpc("ready_project_clip_counts", {
    p_projects: rows.map((row) => row.id),
  });
  const counts = z
    .array(z.object({ project_id: z.uuid(), clip_count: count }))
    .safeParse(data);
  if (error || !counts.success) throw new ApiError("unavailable", 503);
  const indexed = new Map(
    counts.data.map((row) => [row.project_id, row.clip_count]),
  );
  return rows.map((row) => {
    const source = row.source;
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      createdAt: row.created_at,
      clipCount: indexed.get(row.id) ?? 0,
      canDelete: false,
      ...(source?.asset_type === "original_video" &&
      source.upload_status === "verified" &&
      source.storage_status === "ready" &&
      source.original_filename &&
      source.duration_seconds &&
      source.size_bytes
        ? {
            source: {
              filename: source.original_filename,
              durationSeconds: source.duration_seconds,
              bytes: source.size_bytes,
              width: source.width ?? undefined,
              height: source.height ?? undefined,
            },
          }
        : {}),
    };
  });
}

export async function listOwnedProjects(input: ProjectQuery) {
  const { client, user } = await verifySession();
  const ascending = input.order === "oldest";
  let query = client
    .from("projects")
    .select(selectProject)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .neq("status", "uploading");
  if (input.status !== "all") query = query.eq("status", input.status);
  if (input.search)
    query = query.ilike(
      "title",
      `%${input.search.replace(/[\\%_]/g, "\\$&").replace(/\*/g, "%")}%`,
    );
  if (input.cursor) {
    let cursor: z.infer<typeof cursorSchema>;
    try {
      cursor = cursorSchema.parse(
        JSON.parse(Buffer.from(input.cursor, "base64url").toString("utf8")),
      );
    } catch {
      throw new ApiError("validation", 400);
    }
    const [date, id] = cursor;
    const op = ascending ? "gt" : "lt";
    query = query.or(
      `created_at.${op}.${date},and(created_at.eq.${date},id.${op}.${id})`,
    );
  }
  const size = 12;
  const { data, error } = await query
    .order("created_at", { ascending })
    .order("id", { ascending })
    .limit(size + 1);
  const rows = z.array(rowSchema).safeParse(data);
  if (error || !rows.success) throw new ApiError("unavailable", 503);
  const items = await projectsWithCounts(client, rows.data.slice(0, size));
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      last && rows.data.length > size
        ? Buffer.from(JSON.stringify([last.createdAt, last.id])).toString(
            "base64url",
          )
        : null,
  };
}

export async function getOwnedProject(id: string) {
  const { client, user } = await verifySession();
  if (!z.uuid().safeParse(id).success) throw new ApiError("not_found", 404);
  const { data, error } = await client
    .from("projects")
    .select(selectProject)
    .eq("user_id", user.id)
    .eq("id", id)
    .is("deleted_at", null)
    .neq("status", "uploading")
    .maybeSingle();
  if (error) throw new ApiError("unavailable", 503);
  if (!data) throw new ApiError("not_found", 404);
  const row = rowSchema.safeParse(data);
  if (!row.success) throw new ApiError("unavailable", 503);
  const [project] = await projectsWithCounts(client, [row.data]);
  return { project };
}

export async function workspaceOverview() {
  const { client } = await verifySession();
  const { data, error } = await client.rpc("get_workspace_overview").single();
  const counts = z
    .object({ videos_processed: count, clips_generated: count })
    .safeParse(data);
  if (error || !counts.success) throw new ApiError("unavailable", 503);
  return {
    videosProcessed: counts.data.videos_processed,
    clipsGenerated: counts.data.clips_generated,
  };
}
