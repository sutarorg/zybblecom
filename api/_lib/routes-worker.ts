import { z } from "zod";
import {
  HttpError,
  log,
  requireWorkerAuth,
  sb,
} from "./core.ts";
import { sanitizeEmailResult } from "./email-finder.ts";
import {
  evaluateDiscoveryFilters,
  parseFilters,
  sortLeads,
  type SearchFilters,
  type SortBy,
} from "./filters.ts";
import { finalizeSearchJob } from "./jobs.ts";
import type { Router } from "./http.ts";

// ————————————————————————————————————————————————————————————
// Secure control plane for the scraper worker.
//
// The worker holds only SCRAPER_WORKER_SECRET — never the Supabase
// service-role key — and every mutation is bound to a one-job lease token, so
// a stale or concurrent worker cannot write to a job it no longer owns.
//
// Discovery itself runs in the worker's engine child process
// (worker/gmaps_engine.py → gosom/google-maps-scraper, orchestrated by
// worker/scraper.py). The API is the durable
// half of the pipeline: it deduplicates, applies filters, stores crash-safe
// batches, tracks every counter the UI shows, and finalises the job.
// ————————————————————————————————————————————————————————————

const jobStatuses = z.enum([
  "searching",
  "collecting",
  "deduplicating",
  "enriching",
  "finding_emails",
]);

const countersSchema = z.object({
  discovered: z.number().int().min(0).optional(),
  unique: z.number().int().min(0).optional(),
  duplicates: z.number().int().min(0).optional(),
  filtered: z.number().int().min(0).optional(),
  enriched: z.number().int().min(0).optional(),
  email_found: z.number().int().min(0).optional(),
  errors: z.number().int().min(0).optional(),
  saved: z.number().int().min(0).optional(),
  coverage_total: z.number().int().min(0).optional(),
  coverage_done: z.number().int().min(0).optional(),
});

const statusSchema = z.object({
  status: jobStatuses,
  progress: z.number().int().min(1).max(99),
  message: z.string().max(280).optional(),
  counts: countersSchema.optional(),
});

async function leasedJob(req: Request, jobId: string) {
  requireWorkerAuth(req);
  const token = req.headers.get("x-job-lease");
  if (!token || !z.string().uuid().safeParse(token).success)
    throw new HttpError(409, "Missing or invalid job lease.");
  const { data: job } = await sb
    .from("search_jobs")
    .select("*")
    .eq("id", jobId)
    .in("provider", ["worker", "scraper"])
    .eq("lease_token", token)
    .not("status", "in", "(complete,failed)")
    .maybeSingle();
  if (!job) throw new HttpError(409, "Job lease expired or belongs to another worker.");
  return { job, token };
}

/** Google appends tracking parameters; collapse them to one stable identity. */
const TRACKING_PREFIXES = ["entry=", "g_ep=", "utm_", "sa=", "ved=", "source=", "hl=", "authuser="];

export function canonicalMapsUrl(raw: string): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    const kept = (url.search || "")
      .replace(/^\?/, "")
      .split("&")
      .filter((segment) => segment && !TRACKING_PREFIXES.some((prefix) => segment.startsWith(prefix)));
    const query = kept.length ? `?${kept.join("&")}` : "";
    return `${url.origin}${url.pathname}${query}`;
  } catch {
    return value.split("?")[0];
  }
}

function normaliseText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** place id → canonical Maps URL → normalised name + address. */
export function dedupeKeyFor(lead: {
  place_id?: string | null;
  maps_url?: string | null;
  company?: string | null;
  address?: string | null;
}): string {
  if (lead.place_id) return `pid:${lead.place_id}`;
  const canonical = canonicalMapsUrl(lead.maps_url ?? "");
  if (canonical && canonical.includes("/maps/place/")) return `url:${canonical}`;
  return `na:${normaliseText(lead.company)}|${normaliseText(lead.address)}`;
}

function counterPatch(counts: z.infer<typeof countersSchema> | undefined) {
  if (!counts) return {};
  const patch: Record<string, number> = {};
  if (counts.discovered !== undefined) patch.discovered = counts.discovered;
  if (counts.unique !== undefined) patch.unique_count = counts.unique;
  if (counts.duplicates !== undefined) patch.duplicate_count = counts.duplicates;
  if (counts.filtered !== undefined) patch.filtered_count = counts.filtered;
  if (counts.enriched !== undefined) patch.enriched_count = counts.enriched;
  if (counts.email_found !== undefined) patch.email_found_count = counts.email_found;
  if (counts.errors !== undefined) patch.error_count = counts.errors;
  if (counts.saved !== undefined) patch.collected = counts.saved;
  if (counts.coverage_total !== undefined) patch.coverage_total = counts.coverage_total;
  if (counts.coverage_done !== undefined) patch.coverage_done = counts.coverage_done;
  return patch;
}

const leadSchema = z.object({
  external_id: z.string().trim().max(500).nullish(),
  place_id: z.string().trim().max(500).nullish(),
  company: z.string().trim().min(1).max(300),
  category: z.string().trim().max(200).default(""),
  address: z.string().trim().max(500).default(""),
  city: z.string().trim().max(160).default(""),
  state: z.string().trim().max(160).default(""),
  country: z.string().trim().max(160).default(""),
  phone: z.string().trim().max(100).nullable().default(null),
  website: z.string().trim().max(1000).nullable().default(null),
  maps_url: z.string().trim().max(2000).default(""),
  rating: z.number().min(0).max(5).nullable().default(null),
  reviews: z.number().int().min(0).nullable().default(null),
  hours: z.string().max(2000).nullable().default(null),
  open_status: z.enum(["open", "closed", "permanently_closed", "unknown"]).nullable().default(null),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
  social_profiles: z.array(z.string().trim().max(500)).max(10).nullish(),
  source_query: z.string().trim().max(300).nullish(),
  description: z.string().max(2000).nullable().default(null),
});

type LeadInput = z.infer<typeof leadSchema>;

function normaliseWebsite(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed.slice(0, 1000);
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) return `https://${trimmed}`.slice(0, 1000);
  return null;
}

function buildRow(lead: LeadInput, job: Record<string, unknown>) {
  const category = lead.category || String(job.query ?? "");
  const website = normaliseWebsite(lead.website);
  const city = lead.city || "";
  const rating = lead.rating ?? null;
  const reviews = lead.reviews ?? null;
  return {
    user_id: job.user_id as string,
    job_id: job.id as string,
    company: lead.company,
    category,
    address: lead.address,
    city,
    state: lead.state,
    country: lead.country,
    phone: lead.phone,
    website,
    maps_url: canonicalMapsUrl(lead.maps_url) || lead.maps_url || null,
    rating,
    reviews,
    hours: lead.hours,
    open_status: lead.open_status ?? "unknown",
    place_id: lead.place_id ?? lead.external_id ?? null,
    latitude: lead.latitude,
    longitude: lead.longitude,
    social_profiles: lead.social_profiles ?? [],
    dedupe_key: dedupeKeyFor(lead),
    description:
      lead.description ??
      (rating !== null && reviews !== null
        ? `${lead.company} is a ${category.toLowerCase()} in ${city || (job.location as string)} rated ${rating} across ${reviews} Google reviews.`
        : null),
  };
}

export function registerWorker(r: Router) {
  r.post("/api/worker/claim", async ({ req, json }) => {
    requireWorkerAuth(req);
    const { instance_id } = await json(
      z.object({ instance_id: z.string().trim().min(1).max(120) }),
    );
    await sb.from("worker_heartbeats").upsert(
      {
        service: "scraper",
        instance_id,
        status: "healthy",
        details: {},
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "service" },
    );
    const { data, error } = await sb.rpc("claim_search_job", {
      p_provider: "scraper",
      p_lease_seconds: 180,
    });
    if (error) {
      // Pre-migration-008 databases still queue jobs under the 'worker'
      // provider; claim those too instead of leaving them stranded.
      const legacy = await sb.rpc("claim_search_job", {
        p_provider: "worker",
        p_lease_seconds: 180,
      });
      if (legacy.error) throw new HttpError(503, `Could not claim search work: ${error.message}`);
      return { job: claimView(legacy.data) };
    }
    return { job: claimView(data) };
  });

  function claimView(rows: unknown) {
    const job = (rows as Array<Record<string, unknown>> | null)?.[0];
    if (!job) return null;
    return {
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
      filters: parseFilters(job.filters),
      sort_by: (job.sort_by as SortBy) ?? "relevance",
      coverage_state: (job.payload as Record<string, unknown> | null)?.coverage ?? {},
    };
  }

  r.post("/api/worker/heartbeat", async ({ req, json }) => {
    requireWorkerAuth(req);
    const input = await json(
      z.object({
        instance_id: z.string().trim().min(1).max(120),
        status: z.enum(["healthy", "degraded"]).default("healthy"),
        details: z.record(z.string(), z.unknown()).default({}),
      }),
    );
    await sb.from("worker_heartbeats").upsert(
      {
        service: "scraper",
        instance_id: input.instance_id,
        status: input.status,
        details: input.details,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "service" },
    );
    return { ok: true };
  });

  // ——— Progress + live counters ———
  r.post("/api/worker/jobs/:id/progress", async ({ req, params, json }) => {
    const { job, token } = await leasedJob(req, params.id);
    const input = await json(statusSchema);
    const patch: Record<string, unknown> = {
      status: input.status,
      progress: input.progress,
      lease_until: new Date(Date.now() + 180_000).toISOString(),
    };
    if (input.message) patch.message = input.message;
    Object.assign(patch, counterPatch(input.counts));
    const { error } = await sb
      .from("search_jobs")
      .update(patch)
      .eq("id", job.id)
      .eq("lease_token", token);
    if (error) {
      // Older schemas without the counter columns: never lose a job over them.
      log.warn("progress counters unavailable — run migration 008", { error: error.message });
      await sb
        .from("search_jobs")
        .update({ status: input.status, progress: input.progress, lease_until: patch.lease_until })
        .eq("id", job.id)
        .eq("lease_token", token);
    }
    return { ok: true };
  });

  // ——— Resumable coverage cursor ———
  r.post("/api/worker/jobs/:id/state", async ({ req, params, json }) => {
    const { job, token } = await leasedJob(req, params.id);
    const { state } = await json(z.object({ state: z.record(z.string(), z.unknown()) }));
    const payload = { ...((job.payload as Record<string, unknown>) ?? {}), coverage: state };
    await sb
      .from("search_jobs")
      .update({ payload, lease_until: new Date(Date.now() + 180_000).toISOString() })
      .eq("id", job.id)
      .eq("lease_token", token);
    return { ok: true };
  });

  r.get("/api/worker/jobs/:id/state", async ({ req, params }) => {
    const { job } = await leasedJob(req, params.id);
    return { state: ((job.payload as Record<string, unknown>) ?? {}).coverage ?? {} };
  });

  // ——— Crash-safe batch ingestion ———
  r.post("/api/worker/jobs/:id/leads", async ({ req, params, json }) => {
    const { job, token } = await leasedJob(req, params.id);
    const { leads } = await json(z.object({ leads: z.array(leadSchema).min(1).max(25) }));
    const filters: SearchFilters = parseFilters(job.filters);
    const quantity = Math.max(1, Number(job.quantity ?? 1));

    // How many businesses this job has already saved.
    const { count: alreadySaved } = await sb
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("job_id", job.id);
    let remaining = Math.max(0, quantity - Number(alreadySaved ?? 0));

    // ——— deduplicate + filter before touching the database ———
    const prepared = leads.map((lead) => {
      const row = buildRow(lead, job as unknown as Record<string, unknown>);
      return { lead, row };
    });

    const keys = prepared.map((item) => item.row.dedupe_key as string);
    const companies = Array.from(new Set(prepared.map((item) => item.row.company)));
    let existingKeys = new Set<string>();
    let existingPairs = new Set<string>();
    if (filters.exclude_previously_collected) {
      const { data: existing } = await sb
        .from("leads")
        .select("dedupe_key,company,city,place_id,maps_url")
        .eq("user_id", job.user_id)
        .in("company", companies.slice(0, 25))
        .limit(500);
      for (const row of existing ?? []) {
        const record = row as Record<string, unknown>;
        if (record.dedupe_key) existingKeys.add(String(record.dedupe_key));
        existingPairs.add(`${normaliseText(record.company)}|${normaliseText(record.city)}`);
      }
      const { data: byKey } = await sb
        .from("leads")
        .select("dedupe_key")
        .eq("user_id", job.user_id)
        .in("dedupe_key", keys.slice(0, 25))
        .limit(500);
      for (const row of byKey ?? []) existingKeys.add(String((row as Record<string, unknown>).dedupe_key));
    }

    const accepted: Record<string, unknown>[] = [];
    const seenInBatch = new Set<string>();
    let duplicates = 0;
    let filtered = 0;

    for (const item of prepared) {
      const key = item.row.dedupe_key as string;
      if (seenInBatch.has(key) || existingKeys.has(key)) {
        duplicates += 1;
        continue;
      }
      if (existingPairs.has(`${normaliseText(item.row.company)}|${normaliseText(item.row.city)}`)) {
        duplicates += 1;
        continue;
      }
      const verdict = evaluateDiscoveryFilters(item.row, filters);
      if (!verdict.keep) {
        filtered += 1;
        continue;
      }
      if (accepted.length >= remaining) {
        // Requested quantity already reached: extra businesses are not saved.
        filtered += 1;
        continue;
      }
      seenInBatch.add(key);
      accepted.push(item.row);
    }

    let collected = Number(alreadySaved ?? 0);
    let inserted: Array<Record<string, unknown>> = [];
    if (accepted.length) {
      const rows = sortLeads(accepted as never[], "relevance") as unknown as Record<string, unknown>[];
      const upsert = await sb
        .from("leads")
        .upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
        .select("id,company,city,website");
      if (upsert.error && /dedupe_key|42703|constraint/i.test(upsert.error.message ?? "")) {
        // Pre-migration-008 schema: fall back to the original unique index.
        const legacy = await sb
          .from("leads")
          .upsert(
            rows.map(({ dedupe_key: _key, ...rest }) => rest),
            { onConflict: "user_id,company,city", ignoreDuplicates: true },
          )
          .select("id,company,city,website");
        if (legacy.error) throw new HttpError(500, `Could not store lead batch: ${legacy.error.message}`);
        inserted = (legacy.data ?? []) as Array<Record<string, unknown>>;
        duplicates += accepted.length - inserted.length;
      } else if (upsert.error) {
        throw new HttpError(500, `Could not store lead batch: ${upsert.error.message}`);
      } else {
        inserted = (upsert.data ?? []) as Array<Record<string, unknown>>;
        duplicates += accepted.length - inserted.length;
      }
    }

    const { count } = await sb
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("job_id", job.id);
    collected = count ?? collected + inserted.length;

    const patch: Record<string, unknown> = {
      collected,
      lease_until: new Date(Date.now() + 180_000).toISOString(),
    };
    const duplicateCount = Number(job.duplicate_count ?? 0) + duplicates;
    const filteredCount = Number(job.filtered_count ?? 0) + filtered;
    Object.assign(patch, { duplicate_count: duplicateCount, filtered_count: filteredCount });
    const updated = await sb.from("search_jobs").update(patch).eq("id", job.id).eq("lease_token", token);
    if (updated.error) {
      log.warn("lead counters unavailable — run migration 008", { error: updated.error.message });
      await sb
        .from("search_jobs")
        .update({ collected, lease_until: new Date(Date.now() + 180_000).toISOString() })
        .eq("id", job.id)
        .eq("lease_token", token);
    }
    return {
      leads: inserted,
      accepted: inserted.length,
      duplicates,
      filtered,
      collected,
      remaining: Math.max(0, quantity - collected),
    };
  });

  // ——— Enrichment: normalise what was stored ———
  r.post("/api/worker/jobs/:id/enrich", async ({ req, params }) => {
    const { job, token } = await leasedJob(req, params.id);
    const { data: leads } = await sb
      .from("leads")
      .select("id,company,category,city,rating,reviews,open_status,social_profiles,description")
      .eq("job_id", job.id)
      .limit(500);

    let enriched = 0;
    for (const row of leads ?? []) {
      const lead = row as Record<string, unknown>;
      const patch: Record<string, unknown> = {};
      if (!lead.category) patch.category = String(job.query ?? "");
      if (!lead.open_status) patch.open_status = "unknown";
      if (!Array.isArray(lead.social_profiles)) patch.social_profiles = [];
      if (!lead.description && lead.rating !== null && lead.reviews !== null) {
        patch.description = `${lead.company} is a ${String(lead.category || job.query).toLowerCase()} in ${
          lead.city || job.location
        } rated ${lead.rating} across ${lead.reviews} Google reviews.`;
      }
      if (Object.keys(patch).length) {
        await sb.from("leads").update(patch).eq("id", lead.id);
        enriched += 1;
      }
    }

    const patch: Record<string, unknown> = {
      lease_until: new Date(Date.now() + 180_000).toISOString(),
      enriched_count: (leads ?? []).length,
    };
    const updated = await sb.from("search_jobs").update(patch).eq("id", job.id).eq("lease_token", token);
    if (updated.error) {
      await sb
        .from("search_jobs")
        .update({ lease_until: new Date(Date.now() + 180_000).toISOString() })
        .eq("id", job.id)
        .eq("lease_token", token);
    }
    return { enriched, total: (leads ?? []).length };
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

  // ——— Email discovery result ———
  //
  // Tolerant by design: an invalid or missing address is stored as "unknown"
  // and never fails the job (the old zod `.email()` validation turned one bad
  // address into a 400 that killed the whole search).
  r.post("/api/worker/jobs/:id/leads/:leadId/email", async ({ req, params, json }) => {
    const { job, token } = await leasedJob(req, params.id);
    const input = await json(
      z.object({
        email: z.string().max(320).nullable().optional(),
        email_status: z.enum(["verified", "risky", "invalid", "unknown"]).optional(),
        email_source_url: z.string().max(2000).nullable().optional(),
        social_profiles: z.array(z.string().trim().max(500)).max(10).optional(),
      }),
    );
    const { data: lead } = await sb
      .from("leads")
      .select("id,email_status")
      .eq("id", params.leadId)
      .eq("job_id", job.id)
      .eq("user_id", job.user_id)
      .maybeSingle();
    if (!lead) throw new HttpError(404, "Lead does not belong to this job.");

    const safe = sanitizeEmailResult(input);
    const patch: Record<string, unknown> = {
      email: safe.email,
      email_status: safe.email_status,
      email_source_url: safe.email_source_url,
      ...(safe.social_profiles.length ? { social_profiles: safe.social_profiles } : {}),
    };
    const updated = await sb.from("leads").update(patch).eq("id", lead.id);
    if (updated.error) {
      log.warn("email update fell back to legacy columns", { error: updated.error.message });
      const { email_source_url: _source, social_profiles: _socials, ...legacy } = patch;
      await sb.from("leads").update(legacy).eq("id", lead.id);
    }

    if (safe.rejected) {
      log.warn("discarded an invalid email address", { job: job.id, lead: lead.id });
      const errorCount = Number(job.error_count ?? 0) + 1;
      await sb
        .from("search_jobs")
        .update({ error_count: errorCount })
        .eq("id", job.id)
        .eq("lease_token", token)
        .then(({ error }) => {
          if (error) log.warn("error counter unavailable", { error: error.message });
        });
    }

    await sb.rpc("extend_search_job_lease", {
      p_job: job.id,
      p_lease_token: token,
      p_lease_seconds: 180,
    });
    return { ok: true, email_status: safe.email_status, rejected: safe.rejected };
  });

  // ——— Hand a job back to the queue for its next slice ———
  r.post("/api/worker/jobs/:id/resume", async ({ req, params, json }) => {
    const { job, token } = await leasedJob(req, params.id);
    const input = await json(
      z.object({
        message: z.string().trim().max(280).optional(),
        max_attempts: z.number().int().min(1).max(24).optional(),
      }),
    );
    const attempts = Number(job.worker_attempts ?? 0);
    const maxAttempts = input.max_attempts ?? 6;

    if (attempts >= maxAttempts) {
      // Coverage ran out of attempts: finish with whatever was collected.
      const result = await finalizeSearchJob({
        jobId: job.id,
        userId: job.user_id as string,
        quantity: Number(job.quantity ?? 1),
        filters: parseFilters(job.filters),
        sortBy: (job.sort_by as SortBy) ?? "relevance",
      });
      return { ok: true, resumed: false, ...result };
    }

    const { data: resumed, error } = await sb.rpc("resume_search_job", {
      p_job: job.id,
      p_lease_token: token,
      p_message: input.message ?? null,
      p_progress: Number(job.progress ?? 0),
    });
    if (error) {
      log.warn("resume_search_job unavailable — run migration 008", { error: error.message });
      await sb
        .from("search_jobs")
        .update({
          status: "queued",
          lease_until: null,
          lease_token: null,
          message: input.message ?? null,
        })
        .eq("id", job.id)
        .eq("lease_token", token);
    }
    log.info("search job resumed for another coverage slice", {
      job: job.id,
      attempt: attempts,
      max_attempts: maxAttempts,
      collected: job.collected,
    });
    return { ok: true, resumed: Boolean(resumed ?? true) };
  });

  r.post("/api/worker/jobs/:id/complete", async ({ req, params }) => {
    const { job } = await leasedJob(req, params.id);
    const result = await finalizeSearchJob({
      jobId: job.id,
      userId: job.user_id as string,
      quantity: Number(job.quantity ?? 1),
      filters: parseFilters(job.filters),
      sortBy: (job.sort_by as SortBy) ?? "relevance",
    });
    log.info("worker search completed", {
      job: job.id,
      collected: result.collected,
      refunded: result.refunded,
    });
    return { ok: true, ...result };
  });

  r.post("/api/worker/jobs/:id/fail", async ({ req, params, json }) => {
    const { job, token } = await leasedJob(req, params.id);
    const { error, retryable, max_attempts } = await json(
      z.object({
        error: z.string().trim().min(1).max(280),
        retryable: z.boolean().default(true),
        max_attempts: z.number().int().min(1).max(24).optional(),
      }),
    );
    const maxAttempts = max_attempts ?? 6;
    const retry = retryable && Number(job.worker_attempts) < maxAttempts;
    await sb
      .from("search_jobs")
      .update({
        status: retry ? "queued" : "failed",
        progress: retry ? 0 : job.progress,
        error,
        last_error: error,
        message: retry ? "Retrying with a fresh browser session…" : error,
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
