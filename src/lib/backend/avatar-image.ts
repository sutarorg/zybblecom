import sharp from "sharp";
import { avatarMaxBytes } from "@/services/avatar-policy";

/** Decode and re-encode before storage, rather than trusting type or header bytes. */
export async function normalizeAvatar(input: Uint8Array) {
  if (!input.byteLength || input.byteLength > avatarMaxBytes) return null;
  // Reject other containers before invoking a decoder (e.g. SVG, GIF, TIFF, PDF).
  const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const webp =
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";
  const avif = bytes.toString("ascii", 4, 12) === "ftypavif";
  if (!png && !jpeg && !webp && !avif) return null;
  try {
    const image = sharp(bytes, {
      limitInputPixels: 24_000_000,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    const expected = png ? "png" : jpeg ? "jpeg" : webp ? "webp" : "heif";
    if (
      metadata.format !== expected ||
      (avif && metadata.compression !== "av1") ||
      (metadata.pages ?? 1) !== 1
    )
      return null;
    return await image
      .rotate()
      .resize(384, 384, { fit: "cover" })
      .webp({ quality: 84 })
      .toBuffer();
  } catch {
    return null;
  }
}
