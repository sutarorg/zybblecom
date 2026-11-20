import {
  ApiError,
  limitActor,
  readJSON,
  respond,
  sameOrigin,
} from "@/lib/backend/http";
import { archivedClip } from "@/lib/backend/media";
import { verifySession } from "@/lib/backend/session";
import { downloadLocator } from "@/lib/media/providers";

export async function POST(request: Request) {
  return respond(async () => {
    sameOrigin(request);
    const input = downloadLocator.safeParse(await readJSON(request));
    if (!input.success) throw new ApiError("validation", 400);
    const { user } = await verifySession();
    await limitActor("clip_download", user.id, 60, 60);
    const { projectId, clipId, asset } = input.data;
    const { keys, sign } = await archivedClip(projectId, clipId);
    const key = keys.get(asset);
    if (!key) throw new ApiError("not_found", 404);
    return { url: await sign(key, asset, true) };
  });
}
