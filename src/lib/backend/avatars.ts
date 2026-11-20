import "server-only";
import { randomUUID } from "node:crypto";
import { AwsClient } from "aws4fetch";
import { r2Config } from "@/lib/media/providers";
import { ApiError } from "./http";
import { privilegedDB } from "./supabase";

const avatarSettings = () =>
  r2Config({
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_BUCKET_NAME: process.env.R2_AVATAR_BUCKET_NAME,
    R2_ACCESS_KEY_ID: process.env.R2_AVATAR_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_AVATAR_SECRET_ACCESS_KEY,
  });
export const avatarsEnabled = () =>
  Boolean(
    avatarSettings() &&
    process.env.R2_AVATAR_BUCKET_NAME !== process.env.R2_BUCKET_NAME,
  );
function avatarStore() {
  const config = avatarsEnabled() ? avatarSettings() : null;
  if (!config) throw new ApiError("unavailable", 503);
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
    retries: 0,
  });
  const url = (key: string) =>
    new URL(
      `https://${config.account}.r2.cloudflarestorage.com/${config.bucket}/${key}`,
    );
  return { client, url };
}
function validKey(userId: string, key: string | null): key is string {
  return (
    key !== null &&
    key.startsWith(`avatars/${userId}/`) &&
    /^[a-f0-9-]{36}\.webp$/.test(key.slice(`avatars/${userId}/`.length))
  );
}
async function currentKey(userId: string) {
  const { data, error } = await privilegedDB()
    .from("profiles")
    .select("avatar_object_key")
    .eq("id", userId)
    .is("suspended_at", null)
    .single();
  if (error || !data) throw new ApiError("unavailable", 503);
  return typeof data.avatar_object_key === "string"
    ? data.avatar_object_key
    : null;
}
export async function avatarUrl(userId: string) {
  if (!avatarsEnabled()) return undefined;
  try {
    const key = await currentKey(userId);
    if (!validKey(userId, key)) return undefined;
    const { client, url } = avatarStore();
    const path = url(key);
    path.searchParams.set("X-Amz-Expires", "300");
    return (
      await client.sign(path, { method: "GET", aws: { signQuery: true } })
    ).url;
  } catch {
    // An avatar outage must not hide the account or prevent profile editing.
    return undefined;
  }
}
export async function replaceAvatar(
  userId: string,
  image: Uint8Array<ArrayBuffer>,
) {
  const { client, url } = avatarStore();
  const previous = await currentKey(userId);
  const next = `avatars/${userId}/${randomUUID()}.webp`;
  const remove = async (key: string) => {
    try {
      const response = await client.fetch(url(key), {
        method: "DELETE",
        redirect: "error",
        signal: AbortSignal.timeout(4_000),
      });
      if (!response.ok) console.warn("zybble_avatar_cleanup_required");
    } catch {
      console.warn("zybble_avatar_cleanup_required");
    }
  };
  try {
    const response = await client.fetch(url(next), {
      method: "PUT",
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
      body: image,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "If-None-Match": "*",
      },
    });
    if (!response.ok) throw new Error("Storage rejected image");
  } catch {
    console.warn("zybble_avatar_upload_unconfirmed");
    throw new ApiError("unavailable", 503);
  }
  const update = privilegedDB()
    .from("profiles")
    .update({ avatar_object_key: next })
    .eq("id", userId)
    .is("suspended_at", null);
  const { data, error } = await (
    previous === null
      ? update.is("avatar_object_key", null)
      : update.eq("avatar_object_key", previous)
  )
    .select("id")
    .maybeSingle();
  if (error) {
    // The write may have committed despite a transport error: never delete its object speculatively.
    console.warn("zybble_avatar_update_unconfirmed");
    throw new ApiError("unavailable", 503);
  }
  if (!data) {
    await remove(next);
    throw new ApiError("conflict", 409);
  }
  if (validKey(userId, previous)) await remove(previous);
  return { saved: true };
}
