// Fit under the Vercel Function request limit. Send bytes, not multipart or base64.
export const avatarMaxBytes = 4_000_000;
export const avatarTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;
