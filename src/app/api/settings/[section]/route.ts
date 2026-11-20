import { ApiError, readJSON, respond, sameOrigin } from "@/lib/backend/http";
import { verifySession } from "@/lib/backend/session";
import { preferencesChange, profileChange } from "@/services/settings-schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ section: string }> },
) {
  return respond(async () => {
    sameOrigin(request);
    const { section } = await params;
    if (section !== "profile" && section !== "preferences")
      throw new ApiError("validation", 404);
    const body = await readJSON(request);
    const { client, user } = await verifySession(true);
    if (section === "profile") {
      const update = profileChange.safeParse(body);
      if (!update.success) throw new ApiError("validation", 400);
      const { data, error } = await client
        .from("profiles")
        .update({ full_name: update.data.name })
        .eq("id", user.id)
        .is("suspended_at", null)
        .select("full_name,email")
        .maybeSingle();
      if (error) throw new ApiError("unavailable", 503);
      if (!data) throw new ApiError("unauthorized", 403);
      return { name: data.full_name, email: data.email };
    }
    const update = preferencesChange.safeParse(body);
    if (!update.success) throw new ApiError("validation", 400);
    const { data, error } = await client.rpc("save_creator_preferences", {
      p_aspect: update.data.defaultAspect,
      p_captions: update.data.defaultCaptions,
    });
    if (error) throw new ApiError("unavailable", 503);
    if (data !== true) throw new ApiError("unauthorized", 403);
    return update.data;
  });
}
