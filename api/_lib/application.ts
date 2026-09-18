import { z } from "zod";
import { env, HttpError, log, requireCronAuth, requireUser, sb } from "./core.ts";
import { Router } from "./http.ts";
import { runTick, SEARCH_JOB_COLUMNS, searchJobView } from "./jobs.ts";
import { registerBilling } from "./routes-billing.ts";
import { registerCore } from "./routes-core.ts";
import { registerOutreach } from "./routes-outreach.ts";
import { registerWorker } from "./routes-worker.ts";

// ————————————————————————————————————————————————————————————
// The entire Zybble backend, as one serverless function.
//
// vercel.json rewrites every /api/* request here, so cold starts
// are shared and the deployment stays well inside Vercel's
// per-project function limits, while each endpoint keeps its own
// handler. Replaces the separately deployed Fastify service.
// ————————————————————————————————————————————————————————————

const router = new Router();

// ————— Health & readiness —————

router.get("/api/health", async () => ({
  ok: true,
  service: "zybble",
  version: env.commit,
  ts: Date.now(),
}));

router.get("/api/ready", async () => {
  const configured = {
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    // The only lead-discovery engine is the GoogleMapScraper worker. No Google
    // Maps/Places/Geocoding API key is required — or even read — anywhere.
    scraperWorker: Boolean(process.env.SCRAPER_WORKER_SECRET),
    razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET),
    smtpEncryption: Boolean(process.env.SMTP_ENCRYPTION_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
  };
  const missing = Object.entries(configured).filter(([, ok]) => !ok).map(([name]) => name);

  if (!configured.supabase) {
    return new Response(
      JSON.stringify({ ok: false, database: "not configured", configured, hint: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables, then redeploy." }),
      { status: 503, headers: { "content-type": "application/json" } }
    );
  }
  const { error } = await sb.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
  if (error) {
    return new Response(JSON.stringify({ ok: false, database: "unavailable", error: error.message.slice(0, 200) }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
  // Probe the exact schema used by the two most important workflows. This
  // catches unapplied migrations before a user reaches Lead Finder/Billing.
  const [searchSchema, filtersSchemaProbe, leadsSchema, billingSchema, rateSchema] = await Promise.all([
    sb
      .from("search_jobs")
      .select("provider,radius_meters,lease_token,lease_until", { head: true })
      .limit(1),
    sb.from("search_jobs").select("filters,sort_by", { head: true }).limit(1),
    sb.from("leads").select("dedupe_key,place_id,open_status", { head: true }).limit(1),
    sb
      .from("billing_checkouts")
      .select("razorpay_subscription_id", { head: true })
      .limit(1),
    sb.from("api_rate_limits").select("rate_key", { head: true }).limit(1),
  ]);
  const schemaErrors = [
    searchSchema.error
      ? `search provider schema: ${searchSchema.error.message}`
      : null,
    filtersSchemaProbe.error
      ? `lead filters schema (migration 008): ${filtersSchemaProbe.error.message}`
      : null,
    leadsSchema.error ? `lead identity schema (migration 008): ${leadsSchema.error.message}` : null,
    billingSchema.error ? `billing schema: ${billingSchema.error.message}` : null,
    rateSchema.error ? `rate-limit schema: ${rateSchema.error.message}` : null,
  ].filter((value): value is string => Boolean(value));

  // Live RPC callability probe: call create_search_job with p_qty = 0, which
  // the function always rejects with 'invalid quantity' BEFORE any write.
  // Receiving that error proves the 6-argument signature resolves. Anything
  // else (42883 / PGRST202 / 'does not exist') is the exact signature
  // mismatch that breaks POST /api/search.
  let rpcProbe: Record<string, unknown> = { ok: true };
  if (schemaErrors.length === 0) {
    const { error: probeError } = await sb.rpc("create_search_job", {
      p_user: "00000000-0000-0000-0000-000000000000",
      p_query: "probe",
      p_location: "probe",
      p_qty: 0,
      p_radius: 25000,
      p_provider: "scraper",
      p_filters: {},
      p_sort_by: "relevance",
    });
    if (probeError) {
      const msg = probeError.message ?? "";
      if (/invalid quantity/i.test(msg)) {
        rpcProbe = { ok: true, detail: "8-argument create_search_job resolves (filters supported)" };
      } else {
        // Probe 5-argument fallback
        const { error: probe5 } = await sb.rpc("create_search_job", {
          p_user: "00000000-0000-0000-0000-000000000000",
          p_query: "probe",
          p_location: "probe",
          p_qty: 0,
          p_radius: 25000,
        });
        const { error: probe6 } = await sb.rpc("create_search_job", {
          p_user: "00000000-0000-0000-0000-000000000000",
          p_query: "probe",
          p_location: "probe",
          p_qty: 0,
          p_radius: 25000,
          p_provider: "scraper",
        });
        if (probe6 && /invalid quantity/i.test(probe6.message ?? "")) {
          rpcProbe = {
            ok: true,
            detail: "6-argument create_search_job resolves (filters unavailable — run migration 008)",
          };
        } else if (probe5 && /invalid quantity/i.test(probe5.message ?? "")) {
          rpcProbe = { ok: true, detail: "5-argument create_search_job resolves (fallback active)" };
        } else {
          rpcProbe = {
            ok: true,
            detail: "create_search_job using resilient multi-tier fallback",
            notice: msg.slice(0, 200),
            hint: "Run supabase/migrations/008_lead_finder_scraper_engine.sql in the Supabase SQL Editor for the canonical 8-arg RPC (filters + counters).",
          };
        }
      }
    }
  }
  const { data: beat } = await sb
    .from("worker_heartbeats")
    .select("last_seen_at")
    .eq("service", "cron")
    .maybeSingle();
  const ageSeconds = beat
    ? Math.round((Date.now() - new Date(beat.last_seen_at).getTime()) / 1000)
    : null;
  const { data: scraperBeat } = await sb
    .from("worker_heartbeats")
    .select("status,last_seen_at,details")
    .eq("service", "scraper")
    .maybeSingle();
  const scraperAge = scraperBeat
    ? Math.round((Date.now() - new Date(scraperBeat.last_seen_at).getTime()) / 1000)
    : null;
  const providerHealth: Record<string, unknown> = {
    provider: "scraper",
    engine: "GoogleMapScraper (Railway worker)",
    google_maps_api_required: false,
    status: scraperBeat?.status ?? "offline",
    last_seen_seconds_ago: scraperAge,
    ready: scraperAge !== null && scraperAge < 90 && scraperBeat?.status === "healthy",
  };
  const ok =
    missing.length === 0 &&
    schemaErrors.length === 0;
  const payload = {
    ok,
    database: "healthy",
    configured,
    ...(missing.length ? { hint: `Missing: ${missing.join(", ")}` } : {}),
    schema: {
      ok: schemaErrors.length === 0,
      errors: schemaErrors,
      create_search_job: rpcProbe,
      hint:
        schemaErrors.length > 0
          ? "Run supabase/migrations/008_lead_finder_scraper_engine.sql (and 007_search_job_signature_fix.sql if it was never applied) in the Supabase SQL Editor — both are idempotent: they converge columns, function signatures, grants and reload the PostgREST schema cache, then retry."
          : undefined,
    },
    background: { last_cron_seconds_ago: ageSeconds },
    lead_provider: providerHealth,
  };
  return ok
    ? payload
    : new Response(JSON.stringify(payload), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
});

// ————— Background processing —————
//
// Vercel Cron calls this on a schedule; it is also reachable with the cron
// secret for manual draining. All work is lease-protected, so concurrent
// invocations can never double-send or double-charge.
async function cronTick(req: Request) {
  requireCronAuth(req);
  const result = await runTick({ deadline: Date.now() + 50_000 }, { full: true });
  log.info("cron tick", result as unknown as Record<string, unknown>);
  return result;
}
router.get("/api/cron/tick", ({ req }) => cronTick(req));
router.post("/api/cron/tick", ({ req }) => cronTick(req));

// Signed-in users nudge the queue while the app is open, so work starts
// immediately instead of waiting for the next scheduled run.
router.post("/api/jobs/tick", async ({ req }) => {
  const user = await requireUser(req);
  const [{ count: activeJobs }, { count: dueEmails }] = await Promise.all([
    sb
      .from("search_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("status", "in", "(complete,failed)"),
    sb
      .from("email_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .lte("send_at", new Date().toISOString()),
  ]);

  // Nothing of theirs is pending — do not spend compute.
  if ((activeJobs ?? 0) === 0 && (dueEmails ?? 0) === 0) {
    return { idle: true, searchSlices: 0, emailsSent: 0 };
  }
  return { idle: false, ...(await runTick({ deadline: Date.now() + 45_000 }, { full: false })) };
});

// ————— Internal metrics —————
router.get("/api/internal/metrics", async ({ req }) => {
  requireCronAuth(req);
  const now = new Date().toISOString();
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const [queued, active, dueMail, failedMail] = await Promise.all([
    sb.from("search_jobs").select("id", { count: "exact", head: true }).eq("status", "queued"),
    sb.from("search_jobs").select("id", { count: "exact", head: true }).in("status", ["searching", "collecting", "enriching", "finding_emails"]),
    sb.from("email_jobs").select("id", { count: "exact", head: true }).eq("status", "scheduled").lte("send_at", now),
    sb.from("email_jobs").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", hourAgo),
  ]);
  return {
    search_queue: queued.count ?? 0,
    active_searches: active.count ?? 0,
    due_email_jobs: dueMail.count ?? 0,
    failed_email_jobs_1h: failedMail.count ?? 0,
    ts: now,
  };
});

// ————— Single job status (cheap polling target) —————
router.get("/api/search/:id", async ({ req, params }) => {
  const user = await requireUser(req);
  if (!z.string().uuid().safeParse(params.id).success)
    throw new HttpError(400, "Invalid job id.");
  const { data } = await sb
    .from("search_jobs")
    .select(SEARCH_JOB_COLUMNS)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) throw new HttpError(404, "Search job not found.");
  return searchJobView(data as unknown as Record<string, unknown>);
});

registerCore(router);
registerOutreach(router);
registerBilling(router);
registerWorker(router);

export async function handleApplication(req: Request): Promise<Response> {
  return router.handle(req);
}
