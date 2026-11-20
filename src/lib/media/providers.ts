import { AwsClient } from "aws4fetch";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export function r2Config(env: Readonly<Record<string, string | undefined>>) {
  const {
    R2_ACCOUNT_ID: account,
    R2_BUCKET_NAME: bucket,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
  } = env;
  if (
    !account ||
    !/^[a-f0-9]{32}$/.test(account) ||
    !bucket ||
    !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket) ||
    !accessKeyId ||
    !secretAccessKey ||
    !/^[A-Za-z0-9]+$/.test(accessKeyId) ||
    !/^[A-Za-z0-9]+$/.test(secretAccessKey)
  )
    return null;
  return { account, bucket, accessKeyId, secretAccessKey };
}
export const mediaKinds = {
  mp4: {
    column: "video_asset_id",
    type: "generated_video",
    extension: "mp4",
    mime: "video/mp4",
  },
  srt: {
    column: "srt_asset_id",
    type: "srt",
    extension: "srt",
    mime: "text/plain",
  },
  vtt: {
    column: "vtt_asset_id",
    type: "vtt",
    extension: "vtt",
    mime: "text/vtt",
  },
  thumbnail: {
    column: "thumbnail_asset_id",
    type: "thumbnail",
    extension: "jpg",
    mime: "image/jpeg",
  },
} as const;
export const mediaKind = z.enum(["mp4", "srt", "vtt", "thumbnail"]);
export const clipLocator = z.strictObject({
  projectId: z.uuid(),
  clipId: z.uuid(),
});
export const downloadLocator = clipLocator.extend({ asset: mediaKind });
export async function signArchiveGet(
  config: NonNullable<ReturnType<typeof r2Config>>,
  key: string,
  kind: z.infer<typeof mediaKind>,
  download = false,
) {
  const segments = key.split("/");
  if (
    Buffer.byteLength(key) > 1024 ||
    !segments.every(
      (segment) =>
        /^[a-zA-Z0-9_.-]+$/.test(segment) &&
        segment !== "." &&
        segment !== "..",
    )
  )
    throw new Error("Invalid archived object key");
  const url = new URL(
    `https://${config.account}.r2.cloudflarestorage.com/${config.bucket}/${key}`,
  );
  url.searchParams.set("X-Amz-Expires", download ? "60" : "300");
  url.searchParams.set("response-cache-control", "private, no-store");
  url.searchParams.set("response-content-type", mediaKinds[kind].mime);
  if (download)
    url.searchParams.set(
      "response-content-disposition",
      `attachment; filename="zybble-clip.${mediaKinds[kind].extension}"`,
    );
  // Credentials and user-supplied origins are never returned; only the signed GET.
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  return (await client.sign(url, { method: "GET", aws: { signQuery: true } }))
    .url;
}

export const providerJobId = z.string().regex(/^job_[a-z0-9]{20}$/);
export const providerJob = z.object({
  id: providerJobId,
  op: z.literal("clips"),
  status: z.enum(["queued", "running", "succeeded", "failed"]),
  stage: z
    .enum(["fetching", "transcribing", "ranking", "rendering"])
    .nullable(),
});
export const terminalEvent = z
  .object({
    event: z.enum(["job.succeeded", "job.failed"]),
    job: providerJob.pick({ id: true, op: true, status: true }),
  })
  .refine(({ event, job }) => event === `job.${job.status}`);
export function verifyClipSignature(
  raw: Uint8Array,
  header: string,
  secret: string,
  now = Date.now() / 1000,
) {
  if (header.length > 1024) return false;
  const pieces = header.split(",").map((part) => part.trim());
  const times = pieces.filter((part) => part.startsWith("t="));
  if (times.length !== 1 || !/^t=\d{10}$/.test(times[0])) return false;
  const timestamp = times[0].slice(2);
  if (Math.abs(now - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(raw)
    .digest();
  return pieces.some(
    (part) =>
      /^v1=[a-f0-9]{64}$/i.test(part) &&
      timingSafeEqual(expected, Buffer.from(part.slice(3), "hex")),
  );
}
