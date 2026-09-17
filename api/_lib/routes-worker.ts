import { z } from "zod";
import {
  HttpError,
  log,
  requireWorkerAuth,
  sb,
} from "./core.ts";
import type { Router } from "./http.ts";

// ————————————————————————————————————————————————————————————
// Secure control plane for the optional Python/Selenium provider.
// The worker holds only SCRAPER_WORKER_SECRET — never the Supabase
// service-role key. Every mutation is additionally bound to a
// one-job lease token, preventing stale/concurrent workers from
// writing to a job they no longer own.
// ————————————————————————————————————————————————————————————

const jobStatuses = z.enum([
  "searching",
  "collecting",
  "enriching",
  "finding_emails",
]);

async function leasedJob(req: Request, jobId: string) {
  requireWorkerAuth(req);
  const token = req.headers.get("x-job-lease");
  if (!token || !z.string().uuid().safeParse(token).success)
    throw new HttpError(409, "Missing or invalid job lease.");
  const { data: job } = await sb
    .from("search_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("provider", "worker")
    .eq("lease_token", token)
    .not("status", "in", "(complete,failed)")
    .maybeSingle();
  if (!job) throw new HttpError(409, "Job lease expired or belongs to another worker.");
  return { job, token };
}

export function registerWorker(r: Router) {
  r.post("/api/worker/claim", async ({ req, json }) => {
    requireWorkerAuth(req);
    const { instance_id } = await json(
      z.object({ instance_id: z.string().trim().min(1).max(120) })
    );
    await sb.from("worker_heartbeats").upsert(
      {
        service: "scraper",
        instance_id,
        status: "healthy",
        details: {},
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "service" }
    );
    const { data, error } = await sb.rpc("claim_search_job", {
      p_provider: "worker",
      p_lease_seconds: 180,
    });
    if (error) throw new HttpError(503, `Could not claim search work: ${error.message}`);
    const job = data?.[0];
    if (!job) return { job: null };
    return {
      job: {
        id: job.id,
        query: job.query,
        location: job.location,
        quantity: job.quantity,
        radius_meters: job.radius_meters,
        status: job.status,
        progress: job.progress,
        collected: job.collected,
        worker_attempts: job.worker_attempts,
        lease_token: job.lease_token,
      },
    };
  });

  r.post("/api/worker/heartbeat", async ({ req, json }) => {
    requireWorkerAuth(req);
    const input = await json(
      z.object({
        instance_id: z.string().trim().min(1).max(120),
        status: z.enum(["healthy", "degraded"]).default("healthy"),
        details: z.record(z.string(), z.unknown()).default({}),
      })
    );
    await sb.from("worker_heartbeats").upsert(
      {
        service: "scraper",
        instance_id: input.instance_id,
        status: input.status,
        details: input.details,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "service" }
    );
    return { ok: true };
  });

  r.post("/api/worker/jobs/:id/progress", async ({ req, params, json }) => {
    const { job, token } = await leasedJob(req, params.id);
    const input = await json(
      z.object({
        status: jobStatuses,
        progress: z.number().int().min(1).max(99),
        collected: z.number().int().min(0).optional(),
        message: z.string().max(280).optional(),
      })
    );
    const { error } = await sb
      .from("search_jobs")
      .update({
        status: input.status,
        progress: input.progress,
        ...(input.collected === undefined ? {} : { collected: input.collected }),
        ...(input.message ? { last_error: input.message } : {}),
        lease_until: new Date(Date.now() + 180_000).toISOString(),
      })
      .eq("id", job.id)
      .eq("lease_token", token);
    if (error) throw new HttpError(500, "Could not update progress.");
    return { ok: true };
  });

  const leadSchema = z.object({
    external_id: z.string().trim().max(500).optional(),
    company: z.string().trim().min(1).max(300),
    category: z.string().trim().max(200).default(""),
    address: z.string().trim().max(500).default(""),
    city: z.string().trim().max(160).default(""),
    state: z.string().trim().max(160).default(""),
    country: z.string().trim().max(160).default(""),
    phone: z.string().trim().max(100).nullable().default(null),
    website: z.string().url().max(1000).nullable().default(null),
    maps_url: z.string().url().max(2000),
    rating: z.number().min(0).max(5).nullable().default(null),
    reviews: z.number().int().min(0).nullable().default(null),
    hours: z.string().max(2000).nullable().default(null),
    description: z.string().max(2000).nullable().default(null),
  });

  // Persist a crash-safe batch of detail results. Unique(user, company, city)
  // provides historical dedupe; duplicate rows are ignored and cost no quota.
  r.post("/api/worker/jobs/:id/leads", async ({ req, params, json }) => {
    const { job, token } = await leasedJob(req, params.id);
    const { leads } = await json(z.object({ leads: z.array(leadSchema).min(1).max(25) }));
    const rows = leads.map((lead) => ({
      user_id: job.user_id,
      job_id: job.id,
      company: lead.company,
      category: lead.category || job.query,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      country: lead.country,
      phone: lead.phone,
      website: lead.website,
      maps_url: lead.maps_url,
      rating: lead.rating,
      reviews: lead.reviews,
      hours: lead.hours,
      description:
        lead.description ??
        (lead.rating && lead.reviews
          ? `${lead.company} is a ${(lead.category || job.query).toLowerCase()} in ${lead.city || job.location} rated ${lead.rating} across ${lead.reviews} Google reviews.`
          : null),
    }));
    const { data: inserted, error } = await sb
      .from("leads")
      .upsert(rows, { onConflict: "user_id,company,city", ignoreDuplicates: true })
      .select("id,company,city,website");
    if (error) throw new HttpError(500, `Could not store lead batch: ${error.message}`);

    const { count } = await sb
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("job_id", job.id);
    await sb
      .from("search_jobs")
      .update({
        collected: count ?? job.collected,
        lease_until: new Date(Date.now() + 180_000).toISOString(),
      })
      .eq("id", job.id)
      .eq("lease_token", token);
    return { leads: inserted ?? [], collected: count ?? job.collected };
  });

  r.post("/api/worker/jobs/:id/leads/:leadId/email", async ({ req, params, json }) => {
    const { job, token } = await leasedJob(req, params.id);
    const input = await json(
      z.object({
        email: z.string().email().max(320).nullable(),
        email_status: z.enum(["verified", "risky", "invalid", "unknown"]),
        email_source_url: z.string().url().max(2000).nullable(),
      })
    );
    const { data: lead } = await sb
      .from("leads")
      .select("id")
      .eq("id", params.leadId)
      .eq("job_id", job.id)
      .eq("user_id", job.user_id)
      .maybeSingle();
    if (!lead) throw new HttpError(404, "Lead does not belong to this job.");
    await sb.from("leads").update(input).eq("id", lead.id);
    await sb.rpc("extend_search_job_lease", {
      p_job: job.id,
      p_lease_token: token,
      p_lease_seconds: 180,
    });
    return { ok: true };
  });

  r.get("/api/worker/jobs/:id/pending-emails", async ({ req, params }) => {
    const { job } = await leasedJob(req, params.id);
    const { data, error } = await sb
      .from("leads")
      .select("id,website")
      .eq("job_id", job.id)
      .eq("user_id", job.user_id)
      .is("email_status", null)
      .limit(500);
    if (error) throw new HttpError(500, "Could not load leads for enrichment.");
    return { leads: data ?? [] };
  });

  r.post("/api/worker/jobs/:id/complete", async ({ req, params }) => {
    const { job, token } = await leasedJob(req, params.id);
    const { count } = await sb
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("job_id", job.id);
    await sb
      .from("search_jobs")
      .update({
        status: "complete",
        progress: 100,
        collected: count ?? job.collected,
        lease_until: null,
        lease_token: null,
        error: null,
      })
      .eq("id", job.id)
      .eq("lease_token", token);
    const { data: refunded } = await sb.rpc("refund_search_job_quota", {
      p_job: job.id,
    });
    log.info("worker search completed", {
      job: job.id,
      collected: count,
      refunded,
    });
    return { ok: true, collected: count ?? 0, refunded: Number(refunded ?? 0) };
  });

  r.post("/api/worker/jobs/:id/fail", async ({ req, params, json }) => {
    const { job, token } = await leasedJob(req, params.id);
    const { error, retryable } = await json(
      z.object({
        error: z.string().trim().min(1).max(280),
        retryable: z.boolean().default(true),
      })
    );
    const retry = retryable && Number(job.worker_attempts) < 3;
    await sb
      .from("search_jobs")
      .update({
        status: retry ? "queued" : "failed",
        progress: retry ? 0 : job.progress,
        error,
        last_error: error,
        lease_until: null,
        lease_token: null,
      })
      .eq("id", job.id)
      .eq("lease_token", token);
    if (!retry) await sb.rpc("refund_search_job_quota", { p_job: job.id });
    log.warn("worker search failed", {
      job: job.id,
      attempt: job.worker_attempts,
      retry,
      error,
    });
    return { ok: true, retry };
  });
}