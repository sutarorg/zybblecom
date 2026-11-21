import "server-only";
import { randomUUID } from "node:crypto";
import { ApiError, limitActor } from "./http";
import { privilegedDB } from "./supabase";
import { verifySession } from "./session";
import { sourceStorage } from "./source-storage";
import { uploadPolicy } from "./source-upload-config";
import { InvalidSourceError, probeSource } from "@/lib/media/source-metadata";
import {
  equalETag,
  partSize,
  sourceETag,
  sourceMime,
  type UploadAction,
} from "@/lib/media/source-policy";
import type {
  UploadTicket,
  VerifiedUpload,
} from "@/services/workspace-contracts";

type Store = ReturnType<typeof sourceStorage>;
const unavailable = () => new ApiError("unavailable", 503);
const conflict = () => new ApiError("conflict", 409);
const closed = () => new ApiError("cancelled", 410);
const noRow = () => new ApiError("not_found", 404);
const db = privilegedDB;
const leaseMs = 5 * 60_000;

async function load(userId: string, uploadId: string, store: Store) {
  const { data: row, error } = await db()
    .from("upload_sessions")
    .select(
      "id,asset_id,user_id,project_id,mode,expected_bytes,multipart_id,status,staging_key,expires_at,verification_started_at,verification_token",
    )
    .eq("user_id", userId)
    .eq("id", uploadId)
    .maybeSingle();
  if (error) throw unavailable();
  if (!row) throw noRow();
  const { data: asset, error: assetError } = await db()
    .from("media_assets")
    .select(
      "id,object_key,bucket_name,mime_type,original_filename,size_bytes,duration_seconds,width,height,upload_status,storage_status",
    )
    .eq("id", row.asset_id)
    .eq("project_id", row.project_id)
    .eq("user_id", userId)
    .eq("asset_type", "original_video")
    .eq("storage_provider", "r2")
    .maybeSingle();
  if (assetError) throw unavailable();
  if (
    !asset ||
    asset.bucket_name !== store.bucket ||
    asset.object_key !== `sources/${userId}/${row.project_id}/${asset.id}` ||
    row.staging_key !== `source-staging/${userId}/${row.project_id}/${asset.id}`
  )
    throw noRow();
  const { data: project, error: projectError } = await db()
    .from("projects")
    .select("id,title,status,created_at,original_media_asset_id")
    .eq("id", row.project_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (projectError) throw unavailable();
  if (!project) throw noRow();
  return { row, asset, project };
}
type Session = Awaited<ReturnType<typeof load>>;
const remaining = (session: Session) =>
  Math.floor((Date.parse(session.row.expires_at) - Date.now()) / 1000);
const partBytes = (session: Session, number: number) =>
  Math.min(partSize, session.row.expected_bytes - (number - 1) * partSize);

function pending(session: Session) {
  if (
    remaining(session) < 1 ||
    ["aborted", "failed"].includes(session.row.status)
  )
    throw closed();
  if (
    session.row.status !== "pending" ||
    session.project.status !== "uploading"
  )
    throw conflict();
}

function verified(session: Session): VerifiedUpload {
  const { row, project, asset } = session;
  if (
    row.status !== "verified" ||
    project.status !== "uploaded" ||
    project.original_media_asset_id !== asset.id ||
    asset.upload_status !== "verified" ||
    asset.storage_status !== "ready" ||
    asset.size_bytes !== row.expected_bytes ||
    !asset.duration_seconds ||
    !asset.width ||
    !asset.height ||
    !asset.original_filename
  )
    throw conflict();
  return {
    id: project.id,
    title: project.title,
    status: "uploaded",
    createdAt: project.created_at,
    clipCount: 0,
    canDelete: false,
    source: {
      filename: asset.original_filename,
      durationSeconds: asset.duration_seconds,
      bytes: asset.size_bytes,
      width: asset.width,
      height: asset.height,
    },
  };
}

async function listParts(store: Store, session: Session, remote: string) {
  const parts = await store.list(session.row.staging_key, remote);
  return (
    parts
      ?.flatMap(({ number, etag, bytes }) =>
        number &&
        Number.isInteger(number) &&
        etag &&
        sourceETag.safeParse(etag).success &&
        partBytes(session, number) > 0 &&
        bytes === partBytes(session, number)
          ? [{ number, etag }]
          : [],
      )
      .sort((a, b) => a.number - b.number) ?? null
  );
}

async function discard(
  session: Session,
  token: string | null = null,
  expired = false,
) {
  const { data, error } = await db().rpc("discard_source_upload", {
    p_user: session.row.user_id,
    p_session: session.row.id,
    p_token: token,
    p_expired: expired,
  });
  if (error) throw unavailable();
  return data === true;
}

async function removeTemporary(
  store: Store,
  session: Session,
  terminal: boolean,
) {
  if (session.row.multipart_id && terminal)
    await store.abort(session.row.staging_key, session.row.multipart_id);
  await store.remove(session.row.staging_key);
  if (terminal) await store.remove(session.asset.object_key);
}

async function begin(
  userId: string,
  input: Extract<UploadAction, { action: "begin" }>,
  store: Store,
): Promise<UploadTicket> {
  const mime =
    sourceMime[
      input.filename.split(".").at(-1)!.toLowerCase() as keyof typeof sourceMime
    ];
  // Content type reported by a browser is advisory. The filename selects the allowed type; the demuxer must agree.
  const uploadId = input.resumeId ?? randomUUID();
  if (!input.resumeId) {
    const { error } = await db().rpc("begin_source_upload", {
      p_user: userId,
      p_project: randomUUID(),
      p_asset: randomUUID(),
      p_session: uploadId,
      p_title: input.title,
      p_filename: input.filename,
      p_mime: mime,
      p_bytes: input.bytes,
      p_bucket: store.bucket,
    });
    if (error?.message === "UPLOAD_LIMIT_REACHED")
      throw new ApiError("rate_limited", 429);
    if (error?.message === "UPLOAD_ACCOUNT_UNAVAILABLE")
      throw new ApiError("unauthorized", 403);
    if (error) throw unavailable();
  }
  const session = await load(userId, uploadId, store);
  const { row, asset, project } = session;
  if (
    row.expected_bytes !== input.bytes ||
    asset.mime_type !== mime ||
    asset.original_filename !== input.filename ||
    project.title !== input.title
  )
    throw conflict();
  const base = { uploadId, projectId: row.project_id };
  const stored = { ...base, mode: "stored" } as const;
  if (row.status === "verified") {
    verified(session);
    return stored;
  }
  if (row.status === "verifying" && remaining(session) > 0) return stored;
  pending(session);
  try {
    if (input.resumeId) {
      const stage = await store.head(row.staging_key);
      const sealed = stage ? null : await store.head(asset.object_key);
      if ((stage ?? sealed)?.bytes === row.expected_bytes) return stored;
    }
    if (row.mode === "put") {
      return {
        ...base,
        mode: "put",
        ...(await store.presign(
          row.staging_key,
          row.expected_bytes,
          remaining(session),
        )),
      };
    }
    let remote: string | null = row.multipart_id;
    if (!remote) {
      const created = await store.create(row.staging_key);
      const { data, error } = await db()
        .from("upload_sessions")
        .update({ multipart_id: created })
        .eq("id", uploadId)
        .eq("user_id", userId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .is("multipart_id", null)
        .select("id")
        .maybeSingle();
      if (error || !data) {
        // The write might have succeeded before a network failure. Leave cleanup to the lifecycle in that case.
        if (!error) await store.abort(row.staging_key, created).catch(() => {});
        if (error) throw unavailable();
        remote = (await load(userId, uploadId, store)).row.multipart_id;
        if (!remote) throw conflict();
      } else {
        remote = created;
        if (!input.resumeId)
          return { ...base, mode: "multipart", partSize, completedParts: [] };
      }
    }
    const completedParts = await listParts(store, session, remote);
    if (!completedParts) throw closed();
    return { ...base, mode: "multipart", partSize, completedParts };
  } catch (error) {
    if (!input.resumeId) await discard(session).catch(() => {});
    throw error;
  }
}

async function finish(
  userId: string,
  input: Extract<UploadAction, { action: "finish" }>,
  store: Store,
): Promise<VerifiedUpload> {
  const session = await load(userId, input.uploadId, store);
  const { row, asset } = session;
  if (row.status === "verified") return verified(session);
  if (remaining(session) < 1 || ["aborted", "failed"].includes(row.status))
    throw closed();
  const token = randomUUID();
  const now = Date.now();
  let query = db()
    .from("upload_sessions")
    .update({
      status: "verifying",
      verification_token: token,
      verification_started_at: new Date(now).toISOString(),
    })
    .eq("id", row.id)
    .eq("user_id", userId)
    .eq("status", row.status)
    .gt("expires_at", new Date(now).toISOString());
  if (row.status === "verifying")
    query = query.lt(
      "verification_started_at",
      new Date(now - leaseMs).toISOString(),
    );
  else if (row.status !== "pending") throw conflict();
  const claim = await query.select("id").maybeSingle();
  if (claim.error) throw unavailable();
  if (!claim.data) throw conflict();
  try {
    let final = await store.head(asset.object_key);
    if (!final) {
      let stage = await store.head(row.staging_key);
      if (row.mode === "multipart" && !stage) {
        if (!row.multipart_id || input.etag) throw conflict();
        const stored = await listParts(store, session, row.multipart_id);
        const submitted = new Map(
          input.parts.map((part) => [part.number, part.etag]),
        );
        if (
          !stored ||
          stored.length !== Math.ceil(row.expected_bytes / partSize) ||
          stored.length !== input.parts.length ||
          submitted.size !== stored.length ||
          !stored.every(
            ({ number, etag }, i) =>
              number === i + 1 && equalETag(etag, submitted.get(number) ?? ""),
          )
        )
          throw conflict();
        const receipt = await store.complete(
          row.staging_key,
          row.multipart_id,
          stored,
        );
        stage = await store.head(row.staging_key);
        if (!stage || !receipt.ETag || !equalETag(stage.etag, receipt.ETag))
          throw unavailable();
      }
      if (
        !stage ||
        stage.bytes !== row.expected_bytes ||
        (input.etag && !equalETag(input.etag, stage.etag))
      )
        throw conflict();
      const sealedETag = await store.copy(
        row.staging_key,
        asset.object_key,
        stage.etag,
        asset.mime_type,
      );
      final = await store.head(asset.object_key);
      if (!final || !equalETag(final.etag, sealedETag)) throw unavailable();
    }
    if (!final || final.bytes !== row.expected_bytes) throw unavailable();
    const media = await probeSource(
      final.bytes,
      store.range(
        asset.object_key,
        final.etag,
        final.bytes,
        AbortSignal.timeout(30_000),
      ),
    );
    if (media.mime !== asset.mime_type) throw new InvalidSourceError();
    const { error } = await db().rpc("verify_source_upload", {
      p_user: userId,
      p_session: row.id,
      p_token: token,
      p_bytes: final.bytes,
      p_etag: final.etag,
      p_mime: media.mime,
      p_duration: media.duration,
      p_width: media.width,
      p_height: media.height,
    });
    if (error) throw unavailable();
  } catch (error) {
    if (error instanceof InvalidSourceError) {
      if (!(await discard(session, token))) throw conflict();
      await removeTemporary(store, session, true).catch(() => {});
      throw new ApiError("invalid_media", 422);
    }
    await db()
      .from("upload_sessions")
      .update({
        status: "pending",
        verification_token: null,
        verification_started_at: null,
      })
      .eq("id", row.id)
      .eq("user_id", userId)
      .eq("status", "verifying")
      .eq("verification_token", token);
    throw error;
  }
  await store.remove(row.staging_key).catch(() => {});
  return verified(await load(userId, row.id, store));
}

export async function handleUpload(input: UploadAction) {
  if (input.action === "policy") return uploadPolicy();
  const { user, profile } = await verifySession(true);
  if (!profile.onboarding_completed) throw new ApiError("unauthorized", 403);
  const store = sourceStorage(input.action === "cancel");
  const quota = { begin: 20, part: 300, finish: 30, cancel: 30 };
  await limitActor(
    `upload_${input.action}`,
    user.id,
    quota[input.action],
    3600,
  );
  if (input.action === "begin") return begin(user.id, input, store);
  if (input.action === "finish") return finish(user.id, input, store);
  const session = await load(user.id, input.uploadId, store);
  if (input.action === "cancel") {
    if (!(await discard(session))) throw conflict();
    await removeTemporary(store, session, true);
    return null;
  }
  pending(session);
  const { row } = session;
  const bytes = partBytes(session, input.number);
  if (row.mode !== "multipart" || !row.multipart_id || bytes <= 0)
    throw conflict();
  return store.presign(row.staging_key, bytes, remaining(session), {
    id: row.multipart_id,
    number: input.number,
  });
}

export async function cleanExpiredUploads() {
  const store = sourceStorage(true);
  // Wait beyond expiration so outstanding browser writes have time to finish. R2 lifecycle is a second line of cleanup.
  const { data, error } = await db()
    .from("upload_sessions")
    .select("id,user_id,media_assets!inner(bucket_name)")
    .eq("media_assets.bucket_name", store.bucket)
    .is("cleaned_at", null)
    .lt("expires_at", new Date(Date.now() - 15 * 60_000).toISOString())
    .order("expires_at")
    .limit(30);
  if (error) throw unavailable();
  const jobs = await Promise.allSettled(
    data.map(async ({ id, user_id }) => {
      const session = await load(user_id, id, store);
      const terminal = session.row.status !== "verified";
      if (terminal && !(await discard(session, null, true))) return false;
      await removeTemporary(store, session, terminal);
      const { error } = await db()
        .from("upload_sessions")
        .update({ cleaned_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user_id);
      if (error) throw unavailable();
      return true;
    }),
  );
  return {
    cleaned: jobs.filter((job) => job.status === "fulfilled" && job.value)
      .length,
    failed: jobs.filter((job) => job.status === "rejected").length,
  };
}
