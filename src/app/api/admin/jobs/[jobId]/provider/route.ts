import { z } from "zod";
import { ApiError, limitActor, readBody, respond } from "@/lib/backend/http";
import { privilegedDB } from "@/lib/backend/supabase";
import { providerJob, providerJobId } from "@/lib/media/providers";
import { adminSession } from "@/services/admin/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  return respond(async () => {
    const key = process.env.CLIPSDK_API_KEY;
    if (!key || !/^[\x21-\x7e]{8,512}$/.test(key))
      throw new ApiError("unavailable", 503);
    const session = await adminSession();
    if (!session.ok) {
      if (session.error === "unavailable")
        throw new ApiError("unavailable", 503);
      throw new ApiError(
        "unauthorized",
        session.error === "forbidden" ? 403 : 401,
      );
    }
    const { jobId } = await params;
    if (!z.uuid().safeParse(jobId).success)
      throw new ApiError("validation", 400);
    await limitActor("clipsdk_provider_status", session.value.id, 30, 60);
    const { data, error } = await privilegedDB()
      .from("generation_jobs")
      .select("clipsdk_job_id")
      .eq("id", jobId)
      .maybeSingle();
    if (error) throw new ApiError("unavailable", 503);
    const providerId = providerJobId.safeParse(data?.clipsdk_job_id);
    if (!providerId.success) throw new ApiError("not_found", 404);
    try {
      const response = await fetch(
        `https://api.clipsdk.com/v1/jobs/${providerId.data}?wait=0`,
        {
          headers: { Authorization: `Bearer ${key}` },
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        const retry = response.headers.get("retry-after");
        if (response.status === 429 && retry && /^\d{1,6}$/.test(retry))
          throw new ApiError("rate_limited", 429, Number(retry));
        throw new ApiError("unavailable", 503);
      }
      const { job } = z
        .object({ job: providerJob })
        .parse(JSON.parse(await readBody(response, 512_000)));
      if (job.id !== providerId.data) throw new ApiError("unavailable", 503);
      return { status: job.status, stage: job.stage };
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) throw error;
      throw new ApiError("unavailable", 503);
    }
  });
}
