import { env, randomToken, sb } from "./core";

// ————————————————————————————————————————————————————————————
// Sequence scheduling — shared by campaign routes (launch,
// add-leads) and the background tick (follow-up planner).
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

export function unsubscribeUrl(token: string): string {
  return `${env.appUrl}/#/unsubscribe/${token}`;
}

export async function logEvent(input: {
  user_id: string;
  campaign_id: string | null;
  email_job_id?: string | null;
  type: string;
  meta: string | null;
}) {
  await sb.from("email_events").insert({
    user_id: input.user_id,
    campaign_id: input.campaign_id,
    email_job_id: input.email_job_id ?? null,
    type: input.type,
    meta: input.meta,
  });
}

export function newUnsubToken(): string {
  return randomToken(16);
}

/**
 * Create email_jobs for every active campaign_lead entering `stepPosition`
 * that does not already have a job for that step. The unique index on
 * (campaign_lead_id, step_id) makes this safe to run concurrently.
 */
export async function scheduleStep(userId: string, campaignId: string, stepPosition: number) {
  const [{ data: campaign }, { data: steps }] = await Promise.all([
    sb.from("campaigns").select("*").eq("id", campaignId).maybeSingle(),
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
    .in("status", ["scheduled", "processing", "sent"]);
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
      `\n\n—\nNot interested? Unsubscribe instantly and you'll never hear from this sequence again:\n${unsubscribeUrl(cl.unsub_token)}`;

    const sendAt = new Date(Date.now() + stagger * 15_000).toISOString();
    stagger++;

    const { data: job, error } = await sb
      .from("email_jobs")
      .upsert(
        {
          user_id: userId,
          campaign_id: campaignId,
          campaign_lead_id: cl.id,
          step_id: step.id,
          lead_email: lead.email,
          subject: renderTemplate(step.subject, lead, extras),
          body,
          send_at: sendAt,
          status: "scheduled",
        },
        { onConflict: "campaign_lead_id,step_id", ignoreDuplicates: true }
      )
      .select("id")
      .maybeSingle();
    if (error) throw error;
    // Another invocation scheduled this recipient concurrently.
    if (!job) continue;

    // current_step means "last step handed to the mailer", so the planner
    // never queues a later follow-up before this one is delivered.
    await sb
      .from("campaign_leads")
      .update({ next_send_at: sendAt })
      .eq("id", cl.id);

    await logEvent({
      user_id: userId,
      campaign_id: campaignId,
      email_job_id: job.id,
      type: "scheduled",
      meta: `“${step.subject}” queued for ${lead.company}`,
    });
  }
}
