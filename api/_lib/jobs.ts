import { decryptSecret, log, sb } from "./core";
import { findEmail } from "./email-finder";
import { searchPlaces, type PlaceRecord } from "./places";
import { logEvent, scheduleStep, unsubscribeUrl } from "./sequence";
import { sendEmail } from "./smtp";

// ————————————————————————————————————————————————————————————
// Background processing for the single-app architecture.
//
// The old design ran two permanently-alive daemons in an infinite
// polling loop. Here the same work is done in bounded slices:
// every invocation claims a lease, processes as much as fits in
// its time budget, persists progress, releases the lease, and
// returns. Cron and the open app both drive it, and because all
// state lives in Supabase the work is resumable and idempotent.
//
//   queued → searching → collecting → enriching → finding_emails → complete
//                                                                → failed
// ————————————————————————————————————————————————————————————

const LEASE_SECONDS = 120;
const MAX_ATTEMPTS = 3;
const COLLECT_BATCH = 25;
const EMAIL_BATCH = 4;

export interface Budget {
  /** Epoch ms after which the current invocation must stop working. */
  deadline: number;
}

const timeLeft = (b: Budget) => b.deadline - Date.now();

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
  payload: { places?: PlaceRecord[]; cursor?: number; exhausted?: boolean };
  lease_token: string;
}

function leadKey(company: string, city: string) {
  return `${company.toLowerCase().trim()}|${(city ?? "").toLowerCase().trim()}`;
}

async function setJob(id: string, patch: Record<string, unknown>) {
  await sb.from("search_jobs").update(patch).eq("id", id);
}

/** Stage 1 — ask Google for the businesses and persist the work list. */
async function stageSearch(job: SearchJobRow) {
  const { places, exhausted } = await searchPlaces({
    query: job.query,
    location: job.location,
    radiusMeters: job.radius_meters,
    limit: job.quantity,
  });

  if (places.length === 0) {
    await setJob(job.id, {
      status: "complete",
      progress: 100,
      collected: 0,
      lease_until: null,
      error: "No matching businesses were found for that search.",
    });
    await sb.rpc("refund_search_job_quota", { p_job: job.id });
    return;
  }

  await setJob(job.id, {
    status: "collecting",
    progress: 10,
    payload: { places, cursor: 0, exhausted },
  });
}

/** Stage 2 — persist businesses as deduplicated leads, in batches. */
async function stageCollect(job: SearchJobRow, budget: Budget) {
  const places = job.payload.places ?? [];
  let cursor = job.payload.cursor ?? 0;
  let collected = job.collected;

  while (cursor < places.length && timeLeft(budget) > 4_000) {
    const batch = places.slice(cursor, cursor + COLLECT_BATCH);
    // Cross-batch and historical dedupe is enforced by the
    // leads(user_id, company, city) unique index below; this only removes
    // collisions inside the batch, which upsert cannot resolve itself.
    const batchSeen = new Set<string>();
    const rows = batch
      .filter((p) => {
        const key = leadKey(p.company, p.city);
        if (batchSeen.has(key)) return false;
        batchSeen.add(key);
        return true;
      })
      .map((p) => ({
        user_id: job.user_id,
        job_id: job.id,
        company: p.company,
        category: p.category || job.query,
        address: p.address,
        city: p.city,
        state: p.state,
        country: p.country,
        phone: p.phone,
        website: p.website,
        maps_url: p.mapsUrl,
        rating: p.rating,
        reviews: p.reviews,
        hours: p.hours,
        description:
          p.rating && p.reviews
            ? `${p.company} is a ${(p.category || job.query).toLowerCase()} in ${p.city || job.location} rated ${p.rating} across ${p.reviews} Google reviews.`
            : null,
      }));

    if (rows.length) {
      const { data: inserted, error } = await sb
        .from("leads")
        .upsert(rows, { onConflict: "user_id,company,city", ignoreDuplicates: true })
        .select("id");
      if (error) throw new Error(`Could not store leads: ${error.message}`);
      collected += inserted?.length ?? 0;
    }

    cursor += batch.length;
    await setJob(job.id, {
      collected,
      progress: 10 + Math.round((cursor / places.length) * 50),
      payload: { ...job.payload, cursor },
    });
    await sb.rpc("extend_search_job_lease", {
      p_job: job.id,
      p_lease_token: job.lease_token,
      p_lease_seconds: LEASE_SECONDS,
    });
  }

  if (cursor >= places.length) {
    await setJob(job.id, { status: "enriching", progress: 62 });
  }
}

/** Stage 3 — enrichment checkpoint (Google data already normalized). */
async function stageEnrich(job: SearchJobRow) {
  await setJob(job.id, { status: "finding_emails", progress: 70 });
}

/** Stage 4 — discover and verify publicly listed emails, in batches. */
async function stageFindEmails(job: SearchJobRow, budget: Budget) {
  const { data: pending } = await sb
    .from("leads")
    .select("id,website")
    .eq("job_id", job.id)
    .is("email_status", null)
    .limit(500);

  const queue = pending ?? [];
  if (queue.length === 0) {
    await finishJob(job);
    return;
  }

  const { count: total } = await sb
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job.id);
  const totalLeads = total ?? queue.length;

  let index = 0;
  while (index < queue.length && timeLeft(budget) > 12_000) {
    const batch = queue.slice(index, index + EMAIL_BATCH);
    await Promise.all(
      batch.map(async (lead) => {
        if (!lead.website) {
          await sb.from("leads").update({ email_status: "unknown" }).eq("id", lead.id);
          return;
        }
        try {
          const found = await findEmail(lead.website);
          await sb
            .from("leads")
            .update(
              found
                ? {
                    email: found.email,
                    email_status: found.status,
                    email_source_url: found.sourceUrl,
                  }
                : { email_status: "unknown" }
            )
            .eq("id", lead.id);
        } catch {
          // A single unreachable site must never fail the whole job.
          await sb.from("leads").update({ email_status: "unknown" }).eq("id", lead.id);
        }
      })
    );
    index += batch.length;

    const done = totalLeads - (queue.length - index);
    await setJob(job.id, {
      progress: Math.min(99, 70 + Math.round((done / Math.max(1, totalLeads)) * 29)),
    });
    await sb.rpc("extend_search_job_lease", {
      p_job: job.id,
      p_lease_token: job.lease_token,
      p_lease_seconds: LEASE_SECONDS,
    });
  }

  if (index >= queue.length) await finishJob(job);
}

async function finishJob(job: SearchJobRow) {
  const { count } = await sb
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job.id);
  await setJob(job.id, {
    status: "complete",
    progress: 100,
    collected: count ?? job.collected,
    lease_until: null,
  });
  // Requested 50 but Google only had 31? Give the difference back.
  const { data: refunded } = await sb.rpc("refund_search_job_quota", { p_job: job.id });
  log.info("search job complete", { job: job.id, collected: count, refunded });
}

/**
 * Process one slice of one search job. Returns true when work was done,
 * so the caller can keep draining the queue while time remains.
 */
export async function processSearchSlice(budget: Budget): Promise<boolean> {
  const { data: claimed, error } = await sb.rpc("claim_search_job", {
    p_provider: "places",
    p_lease_seconds: LEASE_SECONDS,
  });
  if (error) {
    log.error("search claim failed", { error: error.message });
    return false;
  }
  const job = (claimed as SearchJobRow[] | null)?.[0];
  if (!job) return false;

  try {
    switch (job.status) {
      case "queued":
      case "searching":
        await stageSearch(job);
        break;
      case "collecting":
        await stageCollect(job, budget);
        break;
      case "enriching":
        await stageEnrich(job);
        break;
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
    log.error("search slice failed", { job: job.id, attempt: job.worker_attempts, err: message });

    if (job.worker_attempts >= MAX_ATTEMPTS) {
      await setJob(job.id, {
        status: "failed",
        lease_until: null,
        error: message.slice(0, 280),
      });
      await sb.rpc("refund_search_job_quota", { p_job: job.id });
    } else {
      // Requeue for another attempt; the lease is dropped immediately.
      await setJob(job.id, {
        status: "queued",
        lease_until: null,
        error: message.slice(0, 280),
      });
    }
    return true;
  }
}

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
