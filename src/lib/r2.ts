import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type UploadKind = "video" | "pdf" | "image" | "resource";

export const UPLOAD_RULES: Record<
  UploadKind,
  { maxBytes: number; mime: string[]; label: string }
> = {
  video: {
    maxBytes: 2 * 1024 * 1024 * 1024, // 2 GB
    mime: ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"],
    label: "MP4, WebM or MOV up to 2 GB",
  },
  pdf: {
    maxBytes: 100 * 1024 * 1024, // 100 MB
    mime: ["application/pdf"],
    label: "PDF up to 100 MB",
  },
  image: {
    maxBytes: 10 * 1024 * 1024, // 10 MB
    mime: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    label: "JPG, PNG, WebP or AVIF up to 10 MB",
  },
  resource: {
    maxBytes: 200 * 1024 * 1024, // 200 MB
    mime: [
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/plain",
      "text/csv",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    label: "PDF, ZIP, DOC, XLS, PPT, CSV or image up to 200 MB",
  },
};

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

export const isR2Configured = () => getR2Config() !== null;

let cachedClient: S3Client | null = null;

function getClient(config: R2Config): S3Client {
  cachedClient ??= new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // R2 rejects the SDK's default streaming checksum headers on presigned
    // PUTs — only add checksums when a command explicitly requires them.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return cachedClient;
}

/** Strip anything that could break a URL or escape the key prefix. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(-80);
  return cleaned || "file";
}

export function buildObjectKey(input: {
  courseId: string;
  kind: UploadKind;
  filename: string;
}): string {
  const unique = crypto.randomUUID();
  return `courses/${input.courseId}/${input.kind}/${unique}-${sanitizeFilename(input.filename)}`;
}

export async function createPresignedUpload(input: {
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<{ uploadUrl: string; publicUrl: string } | null> {
  const config = getR2Config();
  if (!config) return null;

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
  });

  const uploadUrl = await getSignedUrl(getClient(config), command, {
    expiresIn: 900, // 15 minutes
  });

  return {
    uploadUrl,
    publicUrl: `${config.publicBaseUrl}/${input.key}`,
  };
}
