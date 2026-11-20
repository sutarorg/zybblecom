import { ApiError, readBytes, respond } from "@/lib/backend/http";
import { authSettings, privilegedDB } from "@/lib/backend/supabase";
import { terminalEvent, verifyClipSignature } from "@/lib/media/providers";

export async function POST(request: Request) {
  return respond(async () => {
    const secret = process.env.CLIPSDK_WEBHOOK_SECRET;
    if (!secret || !/^whsec_[A-Za-z0-9]{32}$/.test(secret) || !authSettings())
      throw new ApiError("unavailable", 503);
    const signature = request.headers.get("clipsdk-signature");
    if (!signature) throw new ApiError("validation", 400);
    const raw = await readBytes(request, 512_000);
    if (!verifyClipSignature(raw, signature, secret))
      throw new ApiError("validation", 400);
    let body: unknown;
    try {
      body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
    } catch {
      throw new ApiError("validation", 400);
    }
    const parsed = terminalEvent.safeParse(body);
    if (!parsed.success) throw new ApiError("validation", 400);
    const { event, job } = parsed.data;
    const eventId = `${job.id}:${job.status}`;
    if (
      request.headers.get("clipsdk-job-id") !== job.id ||
      request.headers.get("idempotency-key") !== eventId
    )
      throw new ApiError("validation", 400);
    // A webhook may beat job correlation. Retry rather than binding a job from the payload.
    const { data, error } = await privilegedDB().rpc("record_clipsdk_receipt", {
      p_provider_job: job.id,
      p_event: event,
    });
    if (error || data !== true) throw new ApiError("unavailable", 503);
    return { accepted: true };
  });
}
