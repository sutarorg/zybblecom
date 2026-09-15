import { decryptSecret, log, monthKey, sb } from "./core";
import { sendEmail } from "./mailer";
import { logEvent, scheduleStep } from "./sequence";

// ————————————————————————————————————————————————————————————
// Mailer worker — runs as its own process:
//   node dist/worker.js
// Responsibilities:
//   1. Deliver due email_jobs over each user's encrypted SMTP.
//   2. Classify failures: 5xx = hard bounce → suppression.
//      Transient = retry up to 3 attempts, 5 minutes apart.
//   3. Advance sequences + schedule follow-ups when due.
//   4. Complete campaigns; reconcile subscription rollovers.
// ————————————————————————————————————————————————————————————

const TICK_MS = 15_000;
const DAY = 86_400_000;

async function processDueJobs() {
  const { data: due, error } = await sb
    .from("email_jobs")
    .select("*, campaigns!inner(id,name,status,account_id,user_id)")
    .eq("status", "scheduled")
    .lte("send_at", new Date().toISOString())
    .order("send_at", { ascending: true })
    .limit(50);
  if (error) {
    log.error("due-job fetch failed", { err: error.message });
    return;
  }

  for (const job of due ?? []) {
    const campaign = job.campaigns as unknown as {
      id: string;
      name: string;
      status: string;
      account_id: string | null;
      user_id: string;
    };
    if (campaign.status !== "active") continue;

    const { data: cl } = await sb.from("campaign_leads").select("*").eq("id", job.campaign_lead_id).maybeSingle();
    if (!cl || cl.status !== "active") {
      await sb.from("email_jobs").update({ status: "skipped" }).eq("id", job.id);
      continue;
    }

    // Suppression is absolute — never send to suppressed addresses.
    const { data: suppressed } = await sb
      .from("suppression_list")
      .select("id")
      .eq("user_id", campaign.user_id)
      .eq("email", job.lead_email)
      .maybeSingle();
    if (suppressed) {
      await sb.from("email_jobs").update({ status: "skipped" }).eq("id", job.id);
      await sb.from("campaign_leads").update({ status: "removed", next_send_at: null }).eq("id", cl.id);
      await logEvent(sb, {
        user_id: campaign.user_id,
        campaign_id: campaign.id,
        email_job_id: job.id,
        type: "suppressed",
        meta: `${job.lead_email} is on the suppression list — skipped`,
      });
      continue;
    }

    const { data: account } = campaign.account_id
      ? await sb.from("email_accounts").select("*").eq("id", campaign.account_id).maybeSingle()
      : { data: null };
    if (!account) {
      await sb.from("campaigns").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", campaign.id);
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
        from: account.from_name ? `"${account.from_name}" <${account.from_email}>` : account.from_email,
        to: job.lead_email,
        subject: job.subject,
        text: job.body,
      }
    );

    if (outcome.ok) {
      const sentAt = new Date().toISOString();
      await sb.from("email_jobs").update({
        status: "sent",
        sent_at: sentAt,
        attempts: job.attempts + 1,
      }).eq("id", job.id);
      await sb.rpc("increment_sent_count", { p_campaign: campaign.id });

      const { data: lead } = await sb.from("leads").select("company").eq("id", cl.lead_id).maybeSingle();
      await logEvent(sb, {
        user_id: campaign.user_id,
        campaign_id: campaign.id,
        email_job_id: job.id,
        type: "sent",
        meta: `Sent to ${lead?.company ?? job.lead_email} (${job.lead_email})`,
      });

      // Sequence advance.
      const { data: steps } = await sb
        .from("campaign_steps")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("position");
      const currentPos = (steps ?? []).find((s) => s.id === job.step_id)?.position ?? 1;
      const next = (steps ?? []).find((s) => s.position === currentPos + 1);
      const current = (steps ?? []).find((s) => s.position === currentPos);
      if (next && current) {
        const gapMs = Math.max(1, next.day_offset - current.day_offset) * DAY;
        await sb
          .from("campaign_leads")
          .update({ current_step: currentPos, next_send_at: new Date(Date.now() + gapMs).toISOString() })
          .eq("id", cl.id);
      } else {
        await sb.from("campaign_leads").update({ status: "completed", next_send_at: null }).eq("id", cl.id);
        await maybeCompleteCampaign(campaign.id, campaign.user_id);
      }
      continue;
    }

    if (outcome.hardBounce) {
      await sb.from("email_jobs").update({ status: "failed", attempts: job.attempts + 1, last_error: outcome.error ?? "hard bounce" }).eq("id", job.id);
      await sb.from("campaign_leads").update({ status: "removed", next_send_at: null }).eq("id", cl.id);
      await sb
        .from("suppression_list")
        .upsert(
          { user_id: campaign.user_id, email: job.lead_email, reason: "bounce" },
          { onConflict: "user_id,email", ignoreDuplicates: true }
        );
      await sb.from("leads").update({ email_status: "invalid", updated_at: new Date().toISOString() }).eq("id", cl.lead_id);
      await logEvent(sb, {
        user_id: campaign.user_id,
        campaign_id: campaign.id,
        email_job_id: job.id,
        type: "bounced",
        meta: `Hard bounce for ${job.lead_email} — suppressed permanently`,
      });
      await maybeCompleteCampaign(campaign.id, campaign.user_id);
      continue;
    }

    // Transient failure → bounded retries.
    const attempts = job.attempts + 1;
    if (attempts < 3) {
      await sb.from("email_jobs").update({
        attempts,
        send_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        last_error: outcome.error ?? "SMTP error",
      }).eq("id", job.id);
      await logEvent(sb, {
        user_id: campaign.user_id,
        campaign_id: campaign.id,
        email_job_id: job.id,
        type: "retry",
        meta: `Retry ${attempts}/3 for ${job.lead_email} (${outcome.error ?? "SMTP error"})`,
      });
    } else {
      await sb.from("email_jobs").update({ status: "failed", attempts, last_error: outcome.error ?? "SMTP error" }).eq("id", job.id);
      await logEvent(sb, {
        user_id: campaign.user_id,
        campaign_id: campaign.id,
        email_job_id: job.id,
        type: "failed",
        meta: `Delivery to ${job.lead_email} failed after 3 attempts`,
      });
    }
  }
}

async function maybeCompleteCampaign(campaignId: string, userId: string) {
  const { count } = await sb
    .from("campaign_leads")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "active");
  if ((count ?? 0) === 0) {
    const { data: campaign } = await sb.from("campaigns").select("status,total_leads").eq("id", campaignId).maybeSingle();
    if (campaign?.status === "active" && campaign.total_leads > 0) {
      await sb.from("campaigns").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", campaignId);
      await logEvent(sb, {
        user_id: userId,
        campaign_id: campaignId,
        type: "sent",
        meta: "Sequence completed for all recipients",
      });
    }
  }
}

/** Follow-up planner: create next-step jobs for leads whose time has come. */
async function planFollowUps() {
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
    if (cl.current_step < 1) continue; // step 1 handled at launch
    // A job for the current step must have been sent — otherwise it's in-flight.
    const { count } = await sb
      .from("email_jobs")
      .select("id", { count: "exact", head: true })
      .eq("campaign_lead_id", cl.id)
      .in("status", ["scheduled", "sent"]);
    const { data: steps } = await sb
      .from("campaign_steps")
      .select("position")
      .eq("campaign_id", cl.campaign_id)
      .order("position");
    const maxPos = Math.max(0, ...(steps ?? []).map((s) => s.position));
    const nextPos = cl.current_step + 1;
    if (nextPos > maxPos) continue;
    const jobsForLead = count ?? 0;
    if (jobsForLead < cl.current_step) continue; // prior step in flight
    await scheduleStep(sb, campaign.user_id, cl.campaign_id, nextPos);
  }
}

/** Subscription rollovers: canceled → free at period end. Past-due grace. */
async function processRollovers() {
  const { data: subs } = await sb
    .from("subscriptions")
    .select("*")
    .not("current_period_end", "is", null)
    .lte("current_period_end", new Date().toISOString())
    .eq("status", "canceled");

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

let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try {
    await processDueJobs();
    await planFollowUps();
  } catch (err) {
    log.error("mailer tick failed", { err: String(err) });
  } finally {
    busy = false;
  }
}

async function main() {
  log.info("mailer worker started", { tickMs: TICK_MS, month: monthKey() });
  await processRollovers();
  setInterval(() => void processRollovers(), 60 * 60_000); // hourly
  await tick();
  setInterval(() => void tick(), TICK_MS);
}

main().catch((err) => {
  log.error("mailer worker fatal", { err: String(err) });
  process.exit(1);
});
