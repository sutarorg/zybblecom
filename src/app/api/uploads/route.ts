import { ApiError, readJSON, respond, sameOrigin } from "@/lib/backend/http";
import { handleUpload } from "@/lib/backend/source-uploads";
import { uploadAction } from "@/lib/media/source-policy";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  return respond(async () => {
    sameOrigin(request);
    const parsed = uploadAction.safeParse(await readJSON(request, 16_384));
    if (!parsed.success) throw new ApiError("validation", 400);
    return handleUpload(parsed.data);
  });
}
