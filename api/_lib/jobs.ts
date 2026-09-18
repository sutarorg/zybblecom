import { decryptSecret, HttpError, log, sb } from "./core.ts";
import { findEmail, sanitizeEmailResult } from "./email-finder.ts";
import {
  evaluateEnrichmentFilters,
  parseFilters,
  sortLeads,
  usesEnrichmentFilters,
  type FilterableLead,
  type SearchFilters,
  type SortBy,
} from "./filters.ts";
import { logEvent, scheduleStep, unsubscribeUrl } from "./sequence.ts";
import { sendEmail } from "./smtp.ts";

// ————————————————————————————————————————————————————————————
// Background processing for the single-app architecture.
//
// Lead *discovery* never happens in a serverless function: it needs a real
// browser, which is exactly what the google-maps-scraper-based Railway worker
// runs (see worker/gmaps_engine.py and worker/scraper.py). Vercel only orchestrates: it creates jobs,
// stores the batches the worker streams back, and — if a worker dies after
// discovery — finishes the remaining stages (enrichment, email discovery,
// completion) here, because those are plain HTTP and DNS lookups.
//
// Every slice is lease-protected, bounded by a deadline and idempotent, so
// the work is resumable and safe to run from cron and from the open app.
//
//   queued → searching → collecting → deduplicating → enriching
//          → finding_emails → complete | failed
// ————————————————————————————————————————————————————————————

const LEASE_SECONDS = 120;
/** Matches the worker's SCRAPER_MAX_ATTEMPTS: a broad search may need several
 *  bounded browser slices to finish its coverage, and each slice resumes from
 *  the cursor saved in the job payload. */
export const MAX_ATTEMPTS = 6;
const EMAIL_BATCH = 4;

export interface Budget {
  /** Epoch ms after which the current invocation must stop working. */
  deadline: number;
}

const timeLeft = (b: Budget) => b.deadline - Date.now();

export interface JobCounters {
  discovered: number;
  unique: number;
  duplicates: number;
  filtered: number;
  enriched: number;
  email_found: number;
  errors: number;
  saved: number;
  coverage_total: number;
  coverage_done: number;
}

interface SearchJobRow {
  id: string;
  user_id: string;
  query: string;
  location: string;
  quantity: number;
  radius_meters: number;
  status: string;
  progress: number;
  collected: number;
  worker_attempts: number;
  filters: SearchFilters | null;
  sort_by: SortBy | null;
  payload: { coverage?: Record<string, unknown> };
  lease_token: string;
}

async function setJob(id: string, patch: Record<string, unknown>) {
  await sb.from("search_jobs").update(patch).eq("id", id);
}

/** Every column the Lead Finder UI shows, including the live counters. */
export const SEARCH_JOB_COLUMNS =
  "id,user_id,query,location,quantity,radius_meters,provider,status,progress,collected,error,message," +
  "requested,discovered,unique_count,duplicate_count,filtered_count,enriched_count,email_found_count," +
  "error_count,coverage_total,coverage_done,filters,sort_by,created_at,updated_at";

/** Pre-migration-008 databases: counters simply report as zero. */
const LEGACY_SEARCH_JOB_COLUMNS =
  "id,user_id,query,location,quantity,radius_meters,provider,status,progress,collected,error,created_at,updated_at";

/**
 * Shape one search-job row for the browser: never leak lease tokens or worker
 * payloads, always expose the full counter set the UI renders.
 */
export function searchJobView(job: Record<string, unknown>) {
  const quantity = Number(job.quantity ?? 0);
  const collected = Number(job.collected ?? 0);
  return {
    id: job.id as string,
    user_id: job.user_id as string,
    query: job.query as string,
    location: job.location as string,
    quantity,
    requested: Number(job.requested ?? quantity),
    radius_meters: Number(job.radius_meters ?? 25_000),
    provider: (job.provider as string) ?? "scraper",
    status: job.status as string,
    progress: Number(job.progress ?? 0),
    collected,
    error: (job.error as string | null) ?? null,
    message: (job.message as string | null) ?? null,
    filters: parseFilters(job.filters),
    sort_by: (job.sort_by as SortBy) ?? "relevance",
    counts: {
      requested: Number(job.requested ?? quantity),
      discovered: Number(job.discovered ?? 0),
      unique: Number(job.unique_count ?? 0),
      duplicates: Number(job.duplicate_count ?? 0),
      filtered: Number(job.filtered_count ?? 0),
      enriched: Number(job.enriched_count ?? 0),
      email_found: Number(job.email_found_count ?? 0),
      errors: Number(job.error_count ?? 0),
      coverage_total: Number(job.coverage_total ?? 0),
      coverage_done: Number(job.coverage_done ?? 0),
      saved: collected,
    },
    created_at: job.created_at as string,
    updated_at: job.updated_at as string,
  };
}

/**
 * Load a user's recent searches. Falls back to the legacy column list when
 * migration 008 has not been applied yet, so the app keeps working.
 */
export async function selectSearchJobs(userId: string, limit = 25) {
  const full = await sb
    .from("search_jobs")
    .select(SEARCH_JOB_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!full.error) return (full.data ?? []).map((row) => searchJobView(row as unknown as Record<string, unknown>));

  if (/42703|column .* does not exist|schema cache/i.test(full.error.message ?? "")) {
    log.warn("search_jobs counters unavailable — run migration 008", { error: full.error.message });
    const legacy = await sb
      .from("search_jobs")
      .select(LEGACY_SEARCH_JOB_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (legacy.error) throw new HttpError(500, "Could not load your searches.");
    return (legacy.data ?? []).map((row) => searchJobView(row as unknown as Record<string, unknown>));
  }

  log.error("load searches failed", { error: full.error.message });
  throw new HttpError(500, "Could not load your searches.");
}

/**
 * Finish a search job: apply the filters that need enrichment, keep at most the
 * requested number of businesses in the requested order, write the final
 * counters and refund any unused quota.
 *
 * Shared by the worker's /complete endpoint and by the in-app recovery path so
 * both produce identical results.
 */
export async function finalizeSearchJob(opts: {
  jobId: string;
  userId: string;
  quantity: number;
  filters?: SearchFilters | null;
  sortBy?: SortBy | null;
}): Promise<{ collected: number; filteredOut: number; discarded: number; refunded: number }> {
  const filters = opts.filters ?? parseFilters(null);
  const sortBy: SortBy = opts.sortBy ?? filters.sort_by ?? "relevance";

  const { data: leads } = await sb
    .from("leads")
    .select("id,email,email_status,social_profiles,rating,reviews,created_at")
    .eq("job_id", opts.jobId)
    .eq("user_id", opts.userId)
    .limit(500);

  const rows = (leads ?? []) as (FilterableLead & { id: string })[];

  // Filters that can only be evaluated once email discovery has run.
  const filteredOut: string[] = [];
  let kept = rows;
  if (usesEnrichmentFilters(filters)) {
    kept = [];
    for (const row of rows) {
      const verdict = evaluateEnrichmentFilters(row, filters);
      if (verdict.keep) kept.push(row);
      else filteredOut.push(row.id);
    }
  }

  // Result limit + sort: keep the best `quantity` in the requested order.
  const ordered = sortLeads(kept, sortBy);
  const discard = ordered.slice(Math.max(1, opts.quantity)).map((row) => row.id);
  const finalRows = ordered.slice(0, Math.max(1, opts.quantity));

  const dropIds = [...filteredOut, ...discard];
  if (dropIds.length) {
    await sb.from("leads").delete().eq("job_id", opts.jobId).eq("user_id", opts.userId).in("id", dropIds);
  }

  const { count } = await sb
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("job_id", opts.jobId)
    .eq("user_id", opts.userId);

  const collected = count ?? finalRows.length;
  await setJob(opts.jobId, {
    status: "complete",
    progress: 100,
    collected,
    filtered_count: filteredOut.length,
    enriched_count: rows.filter((row) => row.email_status !== null).length,
    email_found_count: finalRows.filter((row) => Boolean(row.email)).length,
    lease_until: null,
    lease_token: null,
    error: null,
    message:
      collected === 0
        ? "No businesses matched this search."
        : `Saved ${collected} ${collected === 1 ? "business" : "businesses"}${
            collected < opts.quantity ? ` — the search covered the whole area and found ${collected}.` : "."
          }`,
  });

  // Requested 50, only 31 exist? Give the difference back.
  const { data: refunded } = await sb.rpc("refund_search_job_quota", { p_job: opts.jobId });
  log.info("search job complete", {
    job: opts.jobId,
    collected,
    filtered: filteredOut.length,
    discarded: discard.length,
    refunded,
  });
  return { collected, filteredOut: filteredOut.length, discarded: discard.length, refunded: Number(refunded ?? 0) };
}

/** Stage: discover and verify publicly listed emails, in bounded batches. */
async function stageFindEmails(job: SearchJobRow, budget: Budget) {
  const { data: pending } = await sb
    .from("leads")
    .select("id,website")
    .eq("job_id", job.id)
    .is("email_status", null)
    .limit(500);

  const queue = pending ?? [];
  if (queue.length === 0) {
    await finalizeSearchJob({
      jobId: job.id,
      userId: job.user_id,
      quantity: job.quantity,
      filters: job.filters,
      sortBy: job.sort_by,
    });
    return;
  }

  const { count: total } = await sb
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job.id);
  const totalLeads = total ?? queue.length;

  let index = 0;
  let emailFound = Number((job as unknown as Record<string, unknown>).email_found_count ?? 0);

  while (index < queue.length && timeLeft(budget) > 12_000) {
    const batch = queue.slice(index, index + EMAIL_BATCH);
    await Promise.all(
      batch.map(async (lead) => {
        if (!lead.website) {
          // No website: the business is kept, the address is simply unknown.
          await sb.from("leads").update({ email_status: "unknown" }).eq("id", lead.id);
          return;
        }
        try {
          const found = await findEmail(lead.website);
          const safe = sanitizeEmailResult({
            email: found?.email ?? null,
            email_status: found?.status ?? "unknown",
            email_source_url: found?.sourceUrl ?? null,
            social_profiles: found?.socialProfiles ?? [],
          });
          if (safe.email) emailFound += 1;
          await sb
            .from("leads")
            .update({
              email: safe.email,
              email_status: safe.email_status,
              email_source_url: safe.email_source_url,
              ...(safe.social_profiles.length ? { social_profiles: safe.social_profiles } : {}),
            })
            .eq("id", lead.id);
        } catch {
          // A single unreachable site must never fail the whole job.
          await sb.from("leads").update({ email_status: "unknown" }).eq("id", lead.id);
        }
      }),
    );
    index += batch.length;

    const done = totalLeads - (queue.length - index);
    await setJob(job.id, {
      progress: Math.min(98, 78 + Math.round((done / Math.max(1, totalLeads)) * 20)),
      email_found_count: emailFound,
    });
    await sb.rpc("extend_search_job_lease", {
      p_job: job.id,
      p_lease_token: job.lease_token,
      p_lease_seconds: LEASE_SECONDS,
    });
  }

  if (index >= queue.length) {
    await finalizeSearchJob({
      jobId: job.id,
      userId: job.user_id,
      quantity: job.quantity,
      filters: job.filters,
      sortBy: job.sort_by,
    });
  }
}

/**
 * Process one slice of one search job. Returns true when work was done, so the
 * caller can keep draining the queue while time remains.
 *
 * Only *recoverable* jobs are claimed here: discovery (searching/collecting)
 * belongs to the scraper worker, which owns a browser. This protects jobs whose
 * worker died after discovery and left enrichment undone.
 */
export async function processSearchSlice(budget: Budget): Promise<boolean> {
  const { data: claimed, error } = await sb.rpc("claim_recoverable_search_job", {
    p_provider: "scraper",
    p_lease_seconds: LEASE_SECONDS,
  });
  if (error) {
    // Older databases without migration 008 have no recovery RPC; nothing to do.
    log.warn("search recovery claim unavailable", { error: error.message });
    return false;
  }
  const job = (claimed as SearchJobRow[] | null)?.[0];
  if (!job) return false;

  try {
    switch (job.status) {
      case "deduplicating":
      case "enriching":
      case "finding_emails":
        await stageFindEmails(job, budget);
        break;
      default:
        break;
    }
    await sb.rpc("release_search_job", {
      p_job: job.id,
      p_lease_token: job.lease_token,
    });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("search recovery slice failed", { job: job.id, err: message });
    await setJob(job.id, {
      status: "finding_emails",
      lease_until: null,
      lease_token: null,
      last_error: message.slice(0, 280),
    });
    return true;
  }
}

// ————————————————————————————————————————————————————————————
// Email delivery
// ————————————————————————————————————————————————————————————
// Email delivery
// ————————————————————————————————————————————————————————————

const DAY_MS = 86_400_000;

async function maybeCompleteCampaign(campaignId: string, userId: string) {
  const { count } = await sb
    .from("campaign_leads")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "active");
  if ((count ?? 0) > 0) return;
  const { data: campaign } = await sb
    .from("campaigns")
    .select("status,total_leads")
    .eq("id", campaignId)
    .maybeSingle();
  if (campaign?.status === "active" && campaign.total_leads > 0) {
    await sb
      .from("campaigns")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", campaignId);
    await logEvent({
      user_id: userId,
      campaign_id: campaignId,
      type: "sent",
      meta: "Sequence completed for all recipients",
    });
  }
}

/** Deliver due email jobs. Leases are atomic, so sends are never duplicated. */
export async function processDueEmails(budget: Budget): Promise<number> {
  const { data: due, error } = await sb.rpc("claim_due_email_jobs", { p_limit: 25 });
  if (error) {
    log.error("email claim failed", { error: error.message });
    return 0;
  }

  let processed = 0;
  for (const job of (due ?? []) as Record<string, never>[] as unknown as {
    id: string;
    campaign_id: string;
    campaign_lead_id: string;
    step_id: string;
    lead_email: string;
    subject: string;
    body: string;
    attempts: number;
  }[]) {
    if (timeLeft(budget) < 8_000) {
      // Hand the job back rather than risk being killed mid-send.
      await sb
        .from("email_jobs")
        .update({ status: "scheduled", locked_at: null })
        .eq("id", job.id)
        .eq("status", "processing");
      continue;
    }

    try {
      const { data: campaign } = await sb
        .from("campaigns")
        .select("id,status,account_id,user_id")
        .eq("id", job.campaign_id)
        .maybeSingle();
      if (!campaign || campaign.status !== "active") {
        await sb
          .from("email_jobs")
          .update({ status: "scheduled", locked_at: null })
          .eq("id", job.id)
          .eq("status", "processing");
        continue;
      }

      const { data: cl } = await sb
        .from("campaign_leads")
        .select("*")
        .eq("id", job.campaign_lead_id)
        .maybeSingle();
      if (!cl || cl.status !== "active") {
        await sb.from("email_jobs").update({ status: "skipped", locked_at: null }).eq("id", job.id);
        continue;
      }

      // Suppression is absolute.
      const { data: suppressed } = await sb
        .from("suppression_list")
        .select("id")
        .eq("user_id", campaign.user_id)
        .eq("email", job.lead_email)
        .maybeSingle();
      if (suppressed) {
        await sb.from("email_jobs").update({ status: "skipped", locked_at: null }).eq("id", job.id);
        await sb
          .from("campaign_leads")
          .update({ status: "removed", next_send_at: null })
          .eq("id", cl.id);
        await logEvent({
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          email_job_id: job.id,
          type: "suppressed",
          meta: `${job.lead_email} is on the suppression list — skipped`,
        });
        await maybeCompleteCampaign(campaign.id, campaign.user_id);
        continue;
      }

      const { data: account } = campaign.account_id
        ? await sb.from("email_accounts").select("*").eq("id", campaign.account_id).maybeSingle()
        : { data: null };
      if (!account) {
        await sb
          .from("campaigns")
          .update({ status: "paused", updated_at: new Date().toISOString() })
          .eq("id", campaign.id);
        await sb
          .from("email_jobs")
          .update({
            status: "scheduled",
            locked_at: null,
            send_at: new Date(Date.now() + 5 * 60_000).toISOString(),
          })
          .eq("id", job.id);
        log.warn("campaign paused: sender missing", { campaign: campaign.id });
        continue;
      }

      const outcome = await sendEmail(
        {
          host: account.host,
          port: account.port,
          username: account.username,
          password: decryptSecret(account.password_enc as string),
        },
        {
          id: job.id,
          from: account.from_name
            ? `"${account.from_name}" <${account.from_email}>`
            : account.from_email,
          to: job.lead_email,
          subject: job.subject,
          text: job.body,
          unsubscribeUrl: unsubscribeUrl(cl.unsub_token),
        }
      );
      processed++;

      if (outcome.ok) {
        await sb
          .from("email_jobs")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempts: job.attempts + 1,
            locked_at: null,
          })
          .eq("id", job.id);
        await sb.rpc("increment_sent_count", { p_campaign: campaign.id });

        const { data: lead } = await sb
          .from("leads")
          .select("company")
          .eq("id", cl.lead_id)
          .maybeSingle();
        await logEvent({
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          email_job_id: job.id,
          type: "sent",
          meta: `Sent to ${lead?.company ?? job.lead_email} (${job.lead_email})`,
        });

        const { data: steps } = await sb
          .from("campaign_steps")
          .select("*")
          .eq("campaign_id", campaign.id)
          .order("position");
        const current = (steps ?? []).find((s) => s.id === job.step_id);
        const currentPos = current?.position ?? 1;
        const next = (steps ?? []).find((s) => s.position === currentPos + 1);
        if (next && current) {
          const gapMs = Math.max(1, next.day_offset - current.day_offset) * DAY_MS;
          await sb
            .from("campaign_leads")
            .update({
              current_step: currentPos,
              next_send_at: new Date(Date.now() + gapMs).toISOString(),
            })
            .eq("id", cl.id);
        } else {
          await sb
            .from("campaign_leads")
            .update({ current_step: currentPos, status: "completed", next_send_at: null })
            .eq("id", cl.id);
          await maybeCompleteCampaign(campaign.id, campaign.user_id);
        }
        continue;
      }

      if (outcome.hardBounce) {
        await sb
          .from("email_jobs")
          .update({
            status: "failed",
            locked_at: null,
            attempts: job.attempts + 1,
            last_error: outcome.error ?? "hard bounce",
          })
          .eq("id", job.id);
        await sb
          .from("campaign_leads")
          .update({ status: "removed", next_send_at: null })
          .eq("id", cl.id);
        await sb
          .from("suppression_list")
          .upsert(
            { user_id: campaign.user_id, email: job.lead_email, reason: "bounce" },
            { onConflict: "user_id,email", ignoreDuplicates: true }
          );
        await sb
          .from("leads")
          .update({ email_status: "invalid", updated_at: new Date().toISOString() })
          .eq("id", cl.lead_id);
        await logEvent({
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          email_job_id: job.id,
          type: "bounced",
          meta: `Hard bounce for ${job.lead_email} — suppressed permanently`,
        });
        await maybeCompleteCampaign(campaign.id, campaign.user_id);
        continue;
      }

      const attempts = job.attempts + 1;
      if (attempts < 3) {
        await sb
          .from("email_jobs")
          .update({
            status: "scheduled",
            locked_at: null,
            attempts,
            send_at: new Date(Date.now() + 5 * 60_000).toISOString(),
            last_error: outcome.error ?? "SMTP error",
          })
          .eq("id", job.id);
        await logEvent({
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          email_job_id: job.id,
          type: "retry",
          meta: `Retry ${attempts}/3 for ${job.lead_email} (${outcome.error ?? "SMTP error"})`,
        });
      } else {
        await sb
          .from("email_jobs")
          .update({
            status: "failed",
            locked_at: null,
            attempts,
            last_error: outcome.error ?? "SMTP error",
          })
          .eq("id", job.id);
        await logEvent({
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          email_job_id: job.id,
          type: "failed",
          meta: `Delivery to ${job.lead_email} failed after 3 attempts`,
        });
      }
    } catch (err) {
      const attempts = Number(job.attempts ?? 0) + 1;
      await sb
        .from("email_jobs")
        .update({
          status: attempts >= 3 ? "failed" : "scheduled",
          locked_at: null,
          attempts,
          last_error: String(err).slice(0, 180),
          send_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        })
        .eq("id", job.id)
        .eq("status", "processing");
      log.error("email job failed unexpectedly", { job: job.id, err: String(err) });
    }
  }
  return processed;
}

/** Queue the next follow-up for recipients whose wait has elapsed. */
export async function planFollowUps() {
  const { data: pending } = await sb
    .from("campaign_leads")
    .select("*, campaigns!inner(id,user_id,status)")
    .eq("status", "active")
    .not("next_send_at", "is", null)
    .lte("next_send_at", new Date().toISOString())
    .limit(200);

  for (const cl of pending ?? []) {
    const campaign = cl.campaigns as unknown as { id: string; user_id: string; status: string };
    if (campaign.status !== "active") continue;
    if (cl.current_step < 1) continue; // step 1 is scheduled at launch

    const { data: steps } = await sb
      .from("campaign_steps")
      .select("position")
      .eq("campaign_id", cl.campaign_id)
      .order("position");
    const maxPos = Math.max(0, ...(steps ?? []).map((s) => s.position));
    const nextPos = cl.current_step + 1;
    if (nextPos > maxPos) continue;

    await scheduleStep(campaign.user_id, cl.campaign_id, nextPos);
  }
}

/** Canceled subscriptions fall back to Free once their period ends. */
export async function processRollovers() {
  const { data: subs } = await sb
    .from("subscriptions")
    .select("*")
    .not("current_period_end", "is", null)
    .lte("current_period_end", new Date().toISOString())
    .eq("status", "canceled")
    .limit(100);

  for (const sub of subs ?? []) {
    await sb
      .from("subscriptions")
      .update({
        plan: "free",
        status: "active",
        current_period_end: null,
        razorpay_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", sub.user_id);
    await sb.from("billing_events").insert({
      user_id: sub.user_id,
      type: "downgraded",
      meta: "Subscription ended — moved to Free plan",
    });
    log.info("subscription downgraded to free", { user: sub.user_id });
  }
}

export interface TickResult {
  searchSlices: number;
  emailsSent: number;
  failedStaleJobs: number;
  /** Searches handed back to the queue after their worker stopped mid-sweep. */
  requeuedJobs?: number;
}

/**
 * One bounded pass over all background work. Safe to call concurrently
 * from cron and from the app — every unit of work is lease-protected.
 */
export async function runTick(budget: Budget, opts: { full: boolean }): Promise<TickResult> {
  const result: TickResult = { searchSlices: 0, emailsSent: 0, failedStaleJobs: 0 };

  while (timeLeft(budget) > 15_000) {
    const worked = await processSearchSlice(budget);
    if (!worked) break;
    result.searchSlices++;
  }

  if (timeLeft(budget) > 10_000) {
    result.emailsSent = await processDueEmails(budget);
  }

  if (timeLeft(budget) > 5_000) {
    await planFollowUps();
  }

  if (opts.full) {
    // A worker that was killed mid-sweep leaves its job in searching/collecting.
    // Hand it back to the queue (it resumes from its saved coverage cursor) or,
    // if it has run out of attempts, fail it and refund the unused quota.
    const { data: requeued } = await sb.rpc("requeue_stalled_search_jobs", {
      p_provider: "scraper",
      p_stalled_seconds: 120,
      p_max_attempts: MAX_ATTEMPTS,
    });
    if (requeued !== null && requeued !== undefined) result.requeuedJobs = Number(requeued);

    const { data: failed } = await sb.rpc("fail_exhausted_search_jobs", {
      p_max_attempts: MAX_ATTEMPTS,
    });
    result.failedStaleJobs = Number(failed ?? 0);
    await processRollovers();
    await sb.from("worker_heartbeats").upsert(
      {
        service: "cron",
        instance_id: process.env.VERCEL_REGION ?? "local",
        status: "healthy",
        details: result as unknown as Record<string, unknown>,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "service" }
    );
  }

  return result;
}
