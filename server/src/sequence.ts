import type { SupabaseClient } from "@supabase/supabase-js";
import { env, randomToken } from "./core";

// ————————————————————————————————————————————————————————————
// Shared sequence scheduling — used by API routes (launch,
// add-leads) and the mailer worker (follow-up planner).
// Renders variables per lead and appends the unsubscribe footer
// with a signed-per-recipient token.
// ————————————————————————————————————————————————————————————

export function renderTemplate(
  template: string,
  lead: Record<string, unknown>,
  extras: Record<string, string> = {}
): string {
  const map: Record<string, string> = {
    company: String(lead.company ?? ""),
    city: String(lead.city ?? ""),
    state: String(lead.state ?? ""),
    category: String(lead.category ?? "").toLowerCase(),
    rating: lead.rating ? String(lead.rating) : "",
    reviews: lead.reviews ? String(lead.reviews) : "",
    sender: extras.sender ?? "",
    sender_company: extras.sender_company ?? "",
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => map[k] ?? "");
}

export async function logEvent(
  sb: SupabaseClient,
  input: {
    user_id: string;
    campaign_id: string | null;
    email_job_id?: string | null;
    type: string;
    meta: string | null;
  }
) {
  await sb.from("email_events").insert({
    user_id: input.user_id,
    campaign_id: input.campaign_id,
    email_job_id: input.email_job_id ?? null,
    type: input.type,
    meta: input.meta,
  });
}

/**
 * Create email_jobs for every active campaign_lead entering
 * `stepPosition` who doesn't already have a job for that step.
 */
export async function scheduleStep(
  sb: SupabaseClient,
  userId: string,
  campaignId: string,
  stepPosition: number
) {
  const [{ data: campaign }, { data: steps }] = await Promise.all([
    sb.from("campaigns").select("*").eq("id", campaignId).single(),
    sb.from("campaign_steps").select("*").eq("campaign_id", campaignId).order("position"),
  ]);

  const step = (steps ?? []).find((s) => s.position === stepPosition);
  if (!campaign || !step) return;

  const { data: cls } = await sb
    .from("campaign_leads")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "active")
    .eq("current_step", stepPosition - 1);
  if (!cls || cls.length === 0) return;

  const { data: existingJobs } = await sb
    .from("email_jobs")
    .select("campaign_lead_id")
    .eq("campaign_id", campaignId)
    .eq("step_id", step.id)
    .in("status", ["scheduled", "sent"]);
  const alreadyQueued = new Set((existingJobs ?? []).map((j) => j.campaign_lead_id));

  const { data: senderAccount } = campaign.account_id
    ? await sb
        .from("email_accounts")
        .select("from_email,from_name")
        .eq("id", campaign.account_id)
        .maybeSingle()
    : { data: null };

  let stagger = 0;
  for (const cl of cls) {
    if (alreadyQueued.has(cl.id)) continue;
    const { data: lead } = await sb.from("leads").select("*").eq("id", cl.lead_id).maybeSingle();
    if (!lead?.email) continue;

    const extras = { sender: senderAccount?.from_name ?? "", sender_company: "" };
    const body =
      renderTemplate(step.body, lead, extras) +
      `\n\n—\nNot interested? Unsubscribe instantly and you'll never hear from this sequence again:\n${env.appUrl}#/unsubscribe/${cl.unsub_token}`;

    const sendAt = new Date(Date.now() + stagger * 15_000).toISOString();
    stagger++;

    const { data: job } = await sb
      .from("email_jobs")
      .insert({
        user_id: userId,
        campaign_id: campaignId,
        campaign_lead_id: cl.id,
        step_id: step.id,
        lead_email: lead.email,
        subject: renderTemplate(step.subject, lead, extras),
        body,
        send_at: sendAt,
        status: "scheduled",
      })
      .select("id")
      .single();

    await sb
      .from("campaign_leads")
      .update({ current_step: stepPosition, next_send_at: sendAt })
      .eq("id", cl.id);

    await logEvent(sb, {
      user_id: userId,
      campaign_id: campaignId,
      email_job_id: job?.id ?? null,
      type: "scheduled",
      meta: `“${step.subject}” queued for ${lead.company}`,
    });
  }
}

export function newUnsubToken(): string {
  return randomToken(16);
}
