import { z } from "zod";

export const maxSourceBytes = 2_000_000_000;
export const partSize = 16 * 1024 * 1024;
export const maxParts = Math.ceil(maxSourceBytes / partSize);
export const sourceMime = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
} as const;
export type SourceMime = (typeof sourceMime)[keyof typeof sourceMime];
export const sourceETag = z.string().regex(/^"?[a-f0-9]{32}(?:-\d{1,4})?"?$/i);
export const equalETag = (a: string, b: string) =>
  a.replaceAll('"', "") === b.replaceAll('"', "");
export const uploadPart = z.strictObject({
  number: z.number().int().min(1).max(maxParts),
  etag: sourceETag,
});
export const uploadAction = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("policy") }),
  z.strictObject({
    action: z.literal("begin"),
    title: z.string().trim().min(1).max(100),
    filename: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[^\\/\u0000-\u001f\u007f]+\.(mp4|mov|webm)$/i),
    bytes: z.number().int().min(1).max(maxSourceBytes),
    mime: z.string().max(128),
    resumeId: z.uuid().optional(),
  }),
  z.strictObject({
    action: z.literal("part"),
    uploadId: z.uuid(),
    number: uploadPart.shape.number,
  }),
  z.strictObject({
    action: z.literal("finish"),
    uploadId: z.uuid(),
    parts: z.array(uploadPart).max(maxParts),
    etag: sourceETag.optional(),
  }),
  z.strictObject({ action: z.literal("cancel"), uploadId: z.uuid() }),
]);
export type UploadAction = z.infer<typeof uploadAction>;
export type UploadPart = z.infer<typeof uploadPart>;
