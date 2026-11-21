import "server-only";
import { maxSourceBytes } from "@/lib/media/source-policy";
import type { UploadPolicy } from "@/services/workspace-contracts";
import { ApiError } from "./http";
import { verifySession } from "./session";

export function sourceStorageConfig(
  env: Readonly<Record<string, string | undefined>>,
) {
  const account = env.R2_ACCOUNT_ID;
  const bucket = env.R2_SOURCE_BUCKET_NAME;
  const accessKeyId = env.R2_SOURCE_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SOURCE_SECRET_ACCESS_KEY;
  if (
    !account ||
    !/^[a-f0-9]{32}$/.test(account) ||
    !bucket ||
    !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket) ||
    bucket === env.R2_BUCKET_NAME ||
    bucket === env.R2_AVATAR_BUCKET_NAME ||
    !accessKeyId ||
    !/^[a-zA-Z0-9]+$/.test(accessKeyId) ||
    accessKeyId === env.R2_ACCESS_KEY_ID ||
    accessKeyId === env.R2_AVATAR_ACCESS_KEY_ID ||
    !secretAccessKey ||
    !/^[a-zA-Z0-9]+$/.test(secretAccessKey)
  )
    return null;
  return { account, bucket, accessKeyId, secretAccessKey };
}

export const sourceUploadsEnabled = (
  env: Readonly<Record<string, string | undefined>>,
) =>
  env.R2_SOURCE_UPLOAD_ENABLED === "1" && (env.CRON_SECRET?.length ?? 0) >= 32;

export async function uploadPolicy(): Promise<UploadPolicy> {
  const { profile } = await verifySession();
  if (!profile.onboarding_completed) throw new ApiError("unauthorized", 403);
  if (!sourceUploadsEnabled(process.env) || !sourceStorageConfig(process.env))
    throw new ApiError("unavailable", 503);
  return { maxBytes: maxSourceBytes, mode: "multipart" };
}
