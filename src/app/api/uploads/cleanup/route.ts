import { timingSafeEqual } from "node:crypto";
import { ApiError, respond } from "@/lib/backend/http";
import { cleanExpiredUploads } from "@/lib/backend/source-uploads";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return respond(async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.length < 32) throw new ApiError("unavailable", 503);
    const expected = Buffer.from(`Bearer ${secret}`);
    const provided = Buffer.from(request.headers.get("authorization") ?? "");
    if (
      expected.length !== provided.length ||
      !timingSafeEqual(expected, provided)
    )
      throw new ApiError("unauthorized", 401);
    const result = await cleanExpiredUploads();
    if (result.failed) throw new ApiError("unavailable", 503);
    return result;
  });
}
