import {
  ApiError,
  limitActor,
  readBytes,
  respond,
  sameOrigin,
} from "@/lib/backend/http";
import { verifySession } from "@/lib/backend/session";
import { normalizeAvatar } from "@/lib/backend/avatar-image";
import { avatarsEnabled, replaceAvatar } from "@/lib/backend/avatars";
import { avatarMaxBytes } from "@/services/avatar-policy";

export async function POST(request: Request) {
  return respond(async () => {
    sameOrigin(request, "application/octet-stream");
    const { user } = await verifySession(true);
    if (!avatarsEnabled()) throw new ApiError("unavailable", 503);
    await limitActor("avatar_user", user.id, 5, 600);
    const image = await normalizeAvatar(
      await readBytes(request, avatarMaxBytes),
    );
    if (!image) throw new ApiError("validation", 400);
    return replaceAvatar(user.id, Uint8Array.from(image));
  });
}
