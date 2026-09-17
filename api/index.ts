import { z } from "zod";
import { env, HttpError, log, requireCronAuth, requireUser, sb } from "./_lib/core";
import { Router } from "./_lib/http";
import { runTick } from "./_lib/jobs";
import { registerBilling } from "./_lib/routes-billing";
import { registerCore } from "./_lib/routes-core";
import { registerOutreach } from "./_lib/routes-outreach";

// ————————————————————————————————————————————————————————————
// The entire Zybble backend, as one serverless function.
//
// vercel.json rewrites every /api/* request here, so cold starts
// are shared and the deployment stays well inside Vercel's
// per-project function limits, while each endpoint keeps its own
// handler. Replaces the separately deployed Fastify service.
// ————————————————————————————————————————————————————————————

export const config = {
  runtime: "nodejs",
  // Background ticks need room to drain a slice of work.
  maxDuration: 60,
};

const router = new Router();

// ————— Health & readiness —————

router.get("/api/health", async () => ({
  ok: true,
  service: "zybble",
  version: env.commit,
  ts: Date.now(),
}));

router.get("/api/ready", async () => {
  const { error } = await sb.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
  if (error) {
    return new Response(JSON.stringify({ ok: false, database: "unavailable" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
  const { data: beat } = await sb
    .from("worker_heartbeats")
    .select("last_seen_at")
    .eq("service", "cron")
    .maybeSingle();
  const ageSeconds = beat
    ? Math.round((Date.now() - new Date(beat.last_seen_at).getTime()) / 1000)
    : null;
  // Background work is serverless: a stale cron beat is reported but does
  // not fail readiness, because the app also drives ticks while in use.
  return { ok: true, database: "healthy", background: { last_cron_seconds_ago: ageSeconds } };
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
    .select("id,query,location,quantity,radius_meters,status,progress,collected,error,created_at,updated_at")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) throw new HttpError(404, "Search job not found.");
  return data;
});

registerCore(router);
registerOutreach(router);
registerBilling(router);

export default async function handler(req: Request): Promise<Response> {
  return router.handle(req);
}
