import "server-only";
import { AwsClient } from "aws4fetch";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListPartsCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { ApiError } from "./http";
import { sourceETag, type UploadPart } from "@/lib/media/source-policy";

import {
  sourceStorageConfig,
  sourceUploadsEnabled,
} from "./source-upload-config";

export function sourceStorage(cleanup = false) {
  const config = sourceStorageConfig(process.env);
  if (!config || (!cleanup && !sourceUploadsEnabled(process.env)))
    throw new ApiError("unavailable", 503);
  const { bucket, account, accessKeyId, secretAccessKey } = config;
  const endpoint = `https://${account}.r2.cloudflarestorage.com`;
  const credentials = { accessKeyId, secretAccessKey };
  const sdk = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: true,
    credentials,
    maxAttempts: 1,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const signer = new AwsClient({
    ...credentials,
    service: "s3",
    region: "auto",
  });
  const options = () => ({ abortSignal: AbortSignal.timeout(10_000) });
  const missing = (error: unknown) =>
    error instanceof S3ServiceException &&
    error.$metadata.httpStatusCode === 404;
  async function available<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("unavailable", 503);
    }
  }
  return {
    bucket,
    async presign(
      key: string,
      bytes: number,
      expires: number,
      part?: { id: string; number: number },
    ) {
      if (expires < 1) throw new ApiError("conflict", 409);
      const url = new URL(`${endpoint}/${bucket}/${key}`);
      url.searchParams.set("X-Amz-Expires", String(Math.min(900, expires)));
      if (part) {
        url.searchParams.set("uploadId", part.id);
        url.searchParams.set("partNumber", String(part.number));
      }
      // Browsers set Content-Length themselves. Signing it prevents oversized PUTs.
      const headers: Record<string, string> = part
        ? {}
        : { "Content-Type": "application/octet-stream", "If-None-Match": "*" };
      const signed = await signer.sign(url, {
        method: "PUT",
        headers: { ...headers, "Content-Length": String(bytes) },
        aws: { signQuery: true, allHeaders: true },
      });
      return { url: signed.url, headers };
    },
    create(key: string) {
      return available(async () => {
        const result = await sdk.send(
          new CreateMultipartUploadCommand({
            Bucket: bucket,
            Key: key,
            ContentType: "application/octet-stream",
            CacheControl: "private, no-store",
          }),
          options(),
        );
        if (!result.UploadId) throw new ApiError("unavailable", 503);
        return result.UploadId;
      });
    },
    list(key: string, remote: string) {
      return available(async () => {
        try {
          const page = await sdk.send(
            new ListPartsCommand({
              Bucket: bucket,
              Key: key,
              UploadId: remote,
              MaxParts: 1000,
            }),
            options(),
          );
          if (page.IsTruncated) throw new ApiError("conflict", 409);
          return (page.Parts ?? []).map((part) => ({
            number: part.PartNumber,
            etag: part.ETag,
            bytes: part.Size,
          }));
        } catch (error) {
          if (missing(error)) return null;
          throw error;
        }
      });
    },
    async complete(key: string, remote: string, parts: UploadPart[]) {
      return available(() =>
        sdk.send(
          new CompleteMultipartUploadCommand({
            Bucket: bucket,
            Key: key,
            UploadId: remote,
            MultipartUpload: {
              Parts: parts.map(({ number, etag }) => ({
                PartNumber: number,
                ETag: etag,
              })),
            },
          }),
          options(),
        ),
      );
    },
    head(key: string) {
      return available(async () => {
        try {
          const result = await sdk.send(
            new HeadObjectCommand({ Bucket: bucket, Key: key }),
            options(),
          );
          if (
            !Number.isSafeInteger(result.ContentLength) ||
            !sourceETag.safeParse(result.ETag).success
          )
            throw new ApiError("unavailable", 503);
          return { etag: result.ETag!, bytes: result.ContentLength! };
        } catch (error) {
          if (missing(error)) return null;
          throw error;
        }
      });
    },
    copy(from: string, to: string, etag: string, mime: string) {
      return available(async () => {
        try {
          const result = await sdk.send(
            new CopyObjectCommand({
              Bucket: bucket,
              Key: to,
              CopySource: `${bucket}/${from}`,
              CopySourceIfMatch: etag,
              MetadataDirective: "REPLACE",
              ContentType: mime,
              CacheControl: "private, no-store",
            }),
            options(),
          );
          const sealedETag = result.CopyObjectResult?.ETag;
          if (!sealedETag || !sourceETag.safeParse(sealedETag).success)
            throw new ApiError("unavailable", 503);
          return sealedETag;
        } catch (error) {
          if (
            error instanceof S3ServiceException &&
            error.$metadata.httpStatusCode === 412
          )
            throw new ApiError("conflict", 409);
          throw error;
        }
      });
    },
    range(key: string, etag: string, bytes: number, deadline: AbortSignal) {
      return (start: number, end: number) =>
        available(async () => {
          const signal = AbortSignal.any([deadline, AbortSignal.timeout(8000)]);
          const response = await sdk.send(
            new GetObjectCommand({
              Bucket: bucket,
              Key: key,
              IfMatch: etag,
              Range: `bytes=${start}-${end - 1}`,
            }),
            { abortSignal: signal },
          );
          const stream = response.Body?.transformToWebStream();
          if (
            !stream ||
            response.ContentLength !== end - start ||
            response.ContentRange !== `bytes ${start}-${end - 1}/${bytes}`
          ) {
            await stream?.cancel();
            throw new ApiError("unavailable", 503);
          }
          const reader = stream.getReader();
          const buffer = new Uint8Array(end - start);
          let written = 0;
          const abort = () => {
            void reader.cancel().catch(() => {});
          };
          signal.addEventListener("abort", abort, { once: true });
          if (signal.aborted) abort();
          try {
            for (;;) {
              const { value, done } = await reader.read();
              if (done) break;
              buffer.set(value, written);
              written += value.length;
            }
            if (written !== buffer.length)
              throw new ApiError("unavailable", 503);
            return buffer;
          } finally {
            signal.removeEventListener("abort", abort);
            await reader.cancel().catch(() => {});
          }
        });
    },
    abort(key: string, remote: string) {
      return available(async () => {
        try {
          await sdk.send(
            new AbortMultipartUploadCommand({
              Bucket: bucket,
              Key: key,
              UploadId: remote,
            }),
            options(),
          );
        } catch (error) {
          if (!missing(error)) throw error;
        }
      });
    },
    remove(key: string) {
      return available(() =>
        sdk.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: key }),
          options(),
        ),
      );
    },
  };
}
