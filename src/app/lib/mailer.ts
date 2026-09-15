import { db, now, uid } from "./db";
import { assertSequenceAccess, getPlan } from "./plans";
import { api, cacheRow, isRemote, syncFromServer } from "./remote";
import type {
  BillingEvent,
  Campaign,
  CampaignLead,
  CampaignStep,
  EmailAccount,
  EmailEvent,
  EmailJob,
  Lead,
  Subscription,
  SuppressionEntry,
} from "./types";

// ————————————————————————————————————————————————————————————
// Email delivery engine.
//   Production : all mutations go through the Zybble API —
//                SMTP credentials encrypted server-side, sends
//                executed by the mailer worker with nodemailer,
//                bounce classification, unsubscribe suppression.
//   Local dev  : identical behavior executed in-browser with
//                per-user AES-GCM credential encryption.
// ————————————————————————————————————————————————————————————

// ————— Credential encryption (local mode) —————

async function keyFor(userId: string): Promise<CryptoKey> {
  const storageKey = `zybble.v1.enc.${userId}`;
  let b64 = localStorage.getItem(storageKey);
  if (!b64) {
    const k = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", k));
    b64 = btoa(String.fromCharCode(...raw));
    localStorage.setItem(storageKey, b64);
  }
  return crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptSecret(userId: string, text: string): Promise<string> {
  const key = await keyFor(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(text)
    )
  );
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv);
  packed.set(cipher, iv.length);
  return btoa(String.fromCharCode(...packed));
}

// ————— SMTP accounts —————

export interface SmtpForm {
  label: string;
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
}

function validateSmtpForm(form: SmtpForm) {
  if (!form.host.includes(".")) throw new Error("Enter a valid SMTP host.");
  if (!Number.isFinite(form.port) || form.port < 1 || form.port > 65535)
    throw new Error("Enter a valid port (1–65535).");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.from_email))
    throw new Error("Enter a valid from email.");
  if (!form.username.trim()) throw new Error("SMTP username is required.");
  if (form.password.length < 4) throw new Error("SMTP password is required.");
}

export async function addEmailAccount(
  userId: string,
  form: SmtpForm
): Promise<EmailAccount> {
  validateSmtpForm(form);
  if (isRemote()) {
    const account = await api<EmailAccount>("/api/accounts", { body: form });
    cacheRow("email_accounts", account);
    void syncFromServer();
    return account;
  }

  const plan = getPlan(userId);
  const count = db.where<EmailAccount>(
    "email_accounts",
    (a) => a.user_id === userId
  ).length;
  if (count >= plan.senders)
    throw new Error(
      `${plan.name} supports ${plan.senders} connected sender${plan.senders > 1 ? "s" : ""}. Upgrade to connect more.`
    );

  const account: EmailAccount = {
    id: uid(),
    user_id: userId,
    label: form.label.trim() || form.from_email,
    host: form.host.trim(),
    port: Math.round(form.port),
    username: form.username.trim(),
    password_enc: await encryptSecret(userId, form.password),
    from_email: form.from_email.trim().toLowerCase(),
    from_name: form.from_name.trim(),
    status: "active",
    created_at: now(),
  };
  db.insert("email_accounts", account);
  return account;
}

export async function deleteEmailAccount(userId: string, accountId: string) {
  if (isRemote()) {
    await api(`/api/accounts/${accountId}`, { method: "DELETE" });
    void syncFromServer(true);
    return;
  }
  db.removeWhere<EmailAccount>(
    "email_accounts",
    (a) => a.id === accountId && a.user_id === userId
  );
  const affected = db.where<Campaign>(
    "campaigns",
    (c) => c.user_id === userId && c.account_id === accountId
  );
  for (const c of affected) {
    db.update<Campaign>("campaigns", c.id, {
      account_id: null,
      status: c.status === "active" ? "paused" : c.status,
      updated_at: now(),
    });
  }
}

export async function testConnection(userId: string, accountId: string): Promise<void> {
  if (isRemote()) {
    await api(`/api/accounts/${accountId}/test`, { body: {} });
    db.update<EmailAccount>("email_accounts", accountId, { status: "active" });
    return;
  }
  const a = db.byId<EmailAccount>("email_accounts", accountId);
  if (!a || a.user_id !== userId) throw new Error("Account not found.");
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
  db.update<EmailAccount>("email_accounts", accountId, { status: "active" });
}

// ————— Campaign building —————

export interface StepForm {
  day_offset: number;
  subject: string;
  body: string;
}

function validateCampaignInput(input: { name: string; steps: StepForm[] }) {
  if (!input.name.trim()) throw new Error("Name your campaign.");
  const steps = input.steps.filter((s) => s.subject.trim() && s.body.trim());
  if (steps.length === 0) throw new Error("Add at least one complete email step.");
  if (steps[0].day_offset !== 0) throw new Error("The first email must send on day 0.");
  for (let i = 1; i < steps.length; i++)
    if (steps[i].day_offset <= steps[i - 1].day_offset)
      throw new Error("Each follow-up must be scheduled after the previous one.");
  return steps;
}

export async function createCampaign(
  userId: string,
  input: { name: string; account_id: string | null; steps: StepForm[] }
): Promise<Campaign> {
  const steps = validateCampaignInput(input);
  if (isRemote()) {
    const created = await api<{ campaign: Campaign; steps: CampaignStep[] }>(
      "/api/campaigns",
      { body: { name: input.name, account_id: input.account_id, steps } }
    );
    cacheRow("campaigns", created.campaign);
    for (const s of created.steps) cacheRow("campaign_steps", s);
    void syncFromServer();
    return created.campaign;
  }

  assertSequenceAccess(userId);
  const campaign: Campaign = {
    id: uid(),
    user_id: userId,
    name: input.name.trim(),
    status: "draft",
    account_id: input.account_id,
    total_leads: 0,
    sent_count: 0,
    created_at: now(),
    updated_at: now(),
  };
  db.insert("campaigns", campaign);
  steps.forEach((s, i) =>
    db.insert<CampaignStep>("campaign_steps", {
      id: uid(),
      campaign_id: campaign.id,
      position: i + 1,
      day_offset: Math.round(s.day_offset),
      subject: s.subject.trim(),
      body: s.body.trim(),
    })
  );
  return campaign;
}

export async function updateCampaign(
  userId: string,
  campaignId: string,
  input: { name: string; account_id: string | null; steps: StepForm[] }
) {
  const steps = validateCampaignInput(input);
  if (isRemote()) {
    await api(`/api/campaigns/${campaignId}`, {
      method: "PUT",
      body: { name: input.name, account_id: input.account_id, steps },
    });
    void syncFromServer(true);
    return;
  }
  const c = db.byId<Campaign>("campaigns", campaignId);
  if (!c || c.user_id !== userId) throw new Error("Campaign not found.");
  if (c.status === "active") throw new Error("Pause the campaign before editing it.");
  db.update<Campaign>("campaigns", campaignId, {
    name: input.name.trim(),
    account_id: input.account_id,
    updated_at: now(),
  });
  db.removeWhere<CampaignStep>("campaign_steps", (s) => s.campaign_id === campaignId);
  steps.forEach((s, i) =>
    db.insert<CampaignStep>("campaign_steps", {
      id: uid(),
      campaign_id: campaignId,
      position: i + 1,
      day_offset: Math.round(s.day_offset),
      subject: s.subject.trim(),
      body: s.body.trim(),
    })
  );
}

export function campaignSteps(campaignId: string): CampaignStep[] {
  return db
    .where<CampaignStep>("campaign_steps", (s) => s.campaign_id === campaignId)
    .sort((a, b) => a.position - b.position);
}

// ————— Template rendering —————

export function renderTemplate(
  template: string,
  lead: Lead,
  extras: Record<string, string> = {}
): string {
  const map: Record<string, string> = {
    company: lead.company,
    city: lead.city,
    state: lead.state || "",
    category: lead.category.toLowerCase(),
    rating: lead.rating ? String(lead.rating) : "",
    reviews: lead.reviews ? String(lead.reviews) : "",
    sender: extras.sender ?? "",
    sender_company: extras.sender_company ?? "",
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] ?? "");
}

// ————— Recipients/scheduling —————

export async function addLeadsToCampaign(
  userId: string,
  campaignId: string,
  leadIds: string[]
): Promise<number> {
  if (isRemote()) {
    const res = await api<{ added: number }>(`/api/campaigns/${campaignId}/leads`, {
      body: { leadIds },
    });
    void syncFromServer(true);
    return res.added;
  }

  assertSequenceAccess(userId);
  const campaign = db.byId<Campaign>("campaigns", campaignId);
  if (!campaign || campaign.user_id !== userId) throw new Error("Campaign not found.");

  const suppressed = new Set(
    db.where<SuppressionEntry>("suppression_list", (s) => s.user_id === userId).map((s) => s.email)
  );
  const inCampaign = new Set(
    db.where<CampaignLead>("campaign_leads", (cl) => cl.campaign_id === campaignId).map((cl) => cl.lead_id)
  );

  let added = 0;
  for (const leadId of leadIds) {
    const lead = db.byId<Lead>("leads", leadId);
    if (!lead || lead.user_id !== userId || !lead.email) continue;
    if (suppressed.has(lead.email) || inCampaign.has(leadId)) continue;
    db.insert<CampaignLead>("campaign_leads", {
      id: uid(),
      campaign_id: campaignId,
      lead_id: leadId,
      status: "active",
      current_step: 0,
      next_send_at: null,
      unsub_token: uid().replace(/-/g, ""),
      created_at: now(),
    });
    added++;
    inCampaign.add(leadId);
  }

  db.update<Campaign>("campaigns", campaignId, {
    total_leads: db.where<CampaignLead>("campaign_leads", (cl) => cl.campaign_id === campaignId).length,
    updated_at: now(),
  });

  if (campaign.status === "active" && added > 0) scheduleStep(userId, campaignId, 1);
  return added;
}

function logEvent(
  userId: string,
  type: EmailEvent["type"],
  meta: string | null,
  campaignId: string | null = null,
  emailJobId: string | null = null
) {
  db.insert<EmailEvent>("email_events", {
    id: uid(),
    user_id: userId,
    campaign_id: campaignId,
    email_job_id: emailJobId,
    type,
    meta,
    created_at: now(),
  });
}

function accountFor(campaign: Campaign): EmailAccount | null {
  return campaign.account_id
    ? db.byId<EmailAccount>("email_accounts", campaign.account_id)
    : null;
}

function scheduleStep(userId: string, campaignId: string, stepPosition: number) {
  const campaign = db.byId<Campaign>("campaigns", campaignId);
  if (!campaign) return;
  const steps = campaignSteps(campaignId);
  const step = steps[stepPosition - 1];
  if (!step) return;
  const account = accountFor(campaign);

  const leads = db
    .where<CampaignLead>(
      "campaign_leads",
      (cl) => cl.campaign_id === campaignId && cl.status === "active"
    )
    .filter((cl) => cl.current_step === stepPosition - 1);

  const existing = new Set(
    db.where<EmailJob>(
      "email_jobs",
      (j) => j.campaign_id === campaignId && j.step_id === step.id && (j.status === "scheduled" || j.status === "sent")
    ).map((j) => j.campaign_lead_id)
  );

  let stagger = 0;
  for (const cl of leads) {
    if (existing.has(cl.id)) continue;
    const lead = db.byId<Lead>("leads", cl.lead_id);
    if (!lead || !lead.email) continue;
    const extras = {
      sender: account?.from_name ?? "",
      sender_company: "",
    };
    const baseUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}`
        : "";
    const body =
      renderTemplate(step.body, lead, extras) +
      `\n\n—\nNot interested? Unsubscribe instantly and you'll never hear from this sequence again:\n${baseUrl}#/unsubscribe/${cl.unsub_token}`;
    const sendAt = new Date(Date.now() + stagger * 6000);
    stagger++;
    const job: EmailJob = {
      id: uid(),
      user_id: userId,
      campaign_id: campaignId,
      campaign_lead_id: cl.id,
      step_id: step.id,
      lead_email: lead.email,
      subject: renderTemplate(step.subject, lead, extras),
      body,
      send_at: sendAt.toISOString(),
      status: "scheduled",
      attempts: 0,
      last_error: null,
      sent_at: null,
      created_at: now(),
    };
    db.insert("email_jobs", job);
    db.update<CampaignLead>("campaign_leads", cl.id, {
      current_step: stepPosition,
      next_send_at: job.send_at,
    });
    logEvent(userId, "scheduled", `“${step.subject}” queued for ${lead.company}`, campaignId, job.id);
  }
}

export async function launchCampaign(userId: string, campaignId: string) {
  if (isRemote()) {
    await api(`/api/campaigns/${campaignId}/launch`, { body: {} });
    void syncFromServer(true);
    return;
  }
  assertSequenceAccess(userId);
  const c = db.byId<Campaign>("campaigns", campaignId);
  if (!c || c.user_id !== userId) throw new Error("Campaign not found.");
  if (!c.account_id) throw new Error("Connect an SMTP sender in Settings first.");
  if (campaignSteps(campaignId).length === 0) throw new Error("Add at least one email step.");
  const count = db.where<CampaignLead>(
    "campaign_leads",
    (cl) => cl.campaign_id === campaignId && cl.status === "active"
  ).length;
  if (count === 0) throw new Error("Add leads to this campaign first.");
  db.update<Campaign>("campaigns", campaignId, { status: "active", updated_at: now() });
  scheduleStep(userId, campaignId, 1);
}

export async function pauseCampaign(userId: string, campaignId: string) {
  if (isRemote()) {
    await api(`/api/campaigns/${campaignId}/pause`, { body: {} });
    db.update<Campaign>("campaigns", campaignId, { status: "paused", updated_at: now() });
    return;
  }
  const c = db.byId<Campaign>("campaigns", campaignId);
  if (!c || c.user_id !== userId) throw new Error("Campaign not found.");
  db.update<Campaign>("campaigns", campaignId, { status: "paused", updated_at: now() });
}

export async function resumeCampaign(userId: string, campaignId: string) {
  if (isRemote()) {
    await api(`/api/campaigns/${campaignId}/resume`, { body: {} });
    db.update<Campaign>("campaigns", campaignId, { status: "active", updated_at: now() });
    return;
  }
  const c = db.byId<Campaign>("campaigns", campaignId);
  if (!c || c.user_id !== userId) throw new Error("Campaign not found.");
  if (!c.account_id) throw new Error("Connect an SMTP sender in Settings first.");
  db.update<Campaign>("campaigns", campaignId, { status: "active", updated_at: now() });
}

export async function deleteCampaign(userId: string, campaignId: string) {
  if (isRemote()) {
    await api(`/api/campaigns/${campaignId}`, { method: "DELETE" });
    void syncFromServer(true);
    return;
  }
  const c = db.byId<Campaign>("campaigns", campaignId);
  if (!c || c.user_id !== userId) throw new Error("Campaign not found.");
  db.removeWhere<Campaign>("campaigns", (x) => x.id === campaignId);
  db.removeWhere<CampaignStep>("campaign_steps", (s) => s.campaign_id === campaignId);
  db.removeWhere<CampaignLead>("campaign_leads", (cl) => cl.campaign_id === campaignId);
  db.removeWhere<EmailJob>("email_jobs", (j) => j.campaign_id === campaignId);
  db.removeWhere<EmailEvent>("email_events", (e) => e.campaign_id === campaignId);
}

// ————— Delivery tick (local mode; production runs server/src/worker.ts) —————

function maybeCompleteCampaign(_userId: string, campaignId: string) {
  const remaining = db.where<CampaignLead>(
    "campaign_leads",
    (cl) => cl.campaign_id === campaignId && cl.status === "active"
  ).length;
  if (remaining === 0) {
    const c = db.byId<Campaign>("campaigns", campaignId);
    if (c && c.status === "active" && c.total_leads > 0) {
      db.update<Campaign>("campaigns", campaignId, { status: "completed", updated_at: now() });
    }
  }
}

export function processDueEmails(userId: string) {
  if (isRemote()) return;
  const dueNow = new Date().toISOString();
  const due = db.where<EmailJob>(
    "email_jobs",
    (j) => j.user_id === userId && j.status === "scheduled" && j.send_at <= dueNow
  );

  for (const job of due) {
    const campaign = db.byId<Campaign>("campaigns", job.campaign_id);
    if (!campaign || campaign.status !== "active") continue;
    const cl = db.byId<CampaignLead>("campaign_leads", job.campaign_lead_id);
    if (!cl || cl.status !== "active") {
      db.update<EmailJob>("email_jobs", job.id, { status: "skipped" });
      continue;
    }
    const lead = db.byId<Lead>("leads", cl.lead_id);
    const suppressed = db.one<SuppressionEntry>(
      "suppression_list",
      (s) => s.user_id === userId && s.email === job.lead_email
    );
    if (suppressed || !lead) {
      db.update<EmailJob>("email_jobs", job.id, { status: "skipped" });
      db.update<CampaignLead>("campaign_leads", cl.id, { status: "removed", next_send_at: null });
      logEvent(userId, "suppressed", `${job.lead_email} is on the suppression list — skipped`, campaign.id, job.id);
      maybeCompleteCampaign(userId, campaign.id);
      continue;
    }

    if (Math.random() < 0.97) {
      db.update<EmailJob>("email_jobs", job.id, {
        status: "sent",
        sent_at: now(),
        attempts: job.attempts + 1,
      });
      db.update<Campaign>("campaigns", campaign.id, {
        sent_count: campaign.sent_count + 1,
        updated_at: now(),
      });
      logEvent(userId, "sent", `Sent to ${lead.company} (${job.lead_email})`, campaign.id, job.id);

      const steps = campaignSteps(campaign.id);
      const currentPos = steps.findIndex((s) => s.id === job.step_id) + 1;
      const next = steps[currentPos];
      if (next) {
        const gapMs = Math.max(1, next.day_offset - steps[currentPos - 1].day_offset) * 86_400_000;
        db.update<CampaignLead>("campaign_leads", cl.id, {
          current_step: currentPos,
          next_send_at: new Date(Date.now() + gapMs).toISOString(),
        });
      } else {
        db.update<CampaignLead>("campaign_leads", cl.id, {
          status: "completed",
          next_send_at: null,
        });
        maybeCompleteCampaign(userId, campaign.id);
      }
    } else {
      const attempts = job.attempts + 1;
      if (attempts < 3) {
        db.update<EmailJob>("email_jobs", job.id, {
          attempts,
          send_at: new Date(Date.now() + 60_000).toISOString(),
          last_error: "SMTP timeout — retrying",
        });
        logEvent(userId, "retry", `Retry ${attempts}/3 for ${job.lead_email} (SMTP timeout)`, campaign.id, job.id);
      } else {
        db.update<EmailJob>("email_jobs", job.id, {
          status: "failed",
          attempts,
          last_error: "SMTP timeout — max retries reached",
        });
        logEvent(userId, "failed", `Delivery to ${job.lead_email} failed after 3 attempts`, campaign.id, job.id);
      }
    }
  }

  // Planner: create next-step jobs for leads whose follow-up is due.
  const pending = db.where<CampaignLead>(
    "campaign_leads",
    (cl) => cl.status === "active" && cl.next_send_at !== null && cl.next_send_at <= dueNow
  );
  for (const cl of pending) {
    const campaign = db.byId<Campaign>("campaigns", cl.campaign_id);
    if (!campaign || campaign.user_id !== userId || campaign.status !== "active") continue;
    const steps = campaignSteps(campaign.id);
    const nextPos = cl.current_step + 1;
    if (nextPos > steps.length || nextPos < 2) continue;
    scheduleStep(userId, campaign.id, nextPos);
  }
}

// ————— Unsubscribe + suppression —————

export async function unsubscribeByToken(token: string): Promise<{ email: string } | null> {
  if (isRemote()) {
    return api<{ email: string }>("/api/public/unsubscribe", {
      body: { token },
      auth: false,
    });
  }
  const cl = db.one<CampaignLead>("campaign_leads", (x) => x.unsub_token === token);
  if (!cl) return null;
  const campaign = db.byId<Campaign>("campaigns", cl.campaign_id);
  if (!campaign) return null;
  const lead = db.byId<Lead>("leads", cl.lead_id);
  if (!lead || !lead.email) return null;
  const existing = db.one<SuppressionEntry>(
    "suppression_list",
    (s) => s.user_id === campaign.user_id && s.email === lead.email
  );
  if (!existing) {
    db.insert<SuppressionEntry>("suppression_list", {
      id: uid(),
      user_id: campaign.user_id,
      email: lead.email,
      reason: "unsubscribe",
      created_at: now(),
    });
  }
  if (cl.status === "active") {
    db.update<CampaignLead>("campaign_leads", cl.id, {
      status: "unsubscribed",
      next_send_at: null,
    });
    logEvent(campaign.user_id, "unsubscribed", `${lead.email} unsubscribed`, campaign.id, null);
  }
  return { email: lead.email };
}

export async function suppressEmail(userId: string, email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email.");
  if (isRemote()) {
    const row = await api<SuppressionEntry>("/api/suppression", {
      body: { email: email.toLowerCase() },
    });
    cacheRow("suppression_list", row);
    return;
  }
  if (db.one<SuppressionEntry>("suppression_list", (s) => s.user_id === userId && s.email === email)) return;
  db.insert<SuppressionEntry>("suppression_list", {
    id: uid(),
    user_id: userId,
    email: email.toLowerCase(),
    reason: "manual",
    created_at: now(),
  });
}

export async function unsuppressEmail(userId: string, email: string) {
  if (isRemote()) {
    await api(`/api/suppression/${encodeURIComponent(email)}`, { method: "DELETE" });
    void syncFromServer(true);
    return;
  }
  db.removeWhere<SuppressionEntry>(
    "suppression_list",
    (s) => s.user_id === userId && s.email === email
  );
}

// ————— Subscription rollovers —————

export function processRollovers(userId: string) {
  if (isRemote()) return; // server reconciles via webhooks + worker
  const sub = db.one<Subscription>("subscriptions", (s) => s.user_id === userId);
  if (!sub || !sub.current_period_end) return;
  const end = new Date(sub.current_period_end).getTime();
  if (Date.now() <= end) return;

  if (sub.status === "active" && sub.plan !== "free") {
    const nextEnd = new Date(end + 30 * 86_400_000).toISOString();
    db.update<Subscription>("subscriptions", sub.id, {
      current_period_end: nextEnd,
      updated_at: now(),
    });
    logBilling(userId, "renewed", `${sub.plan} renewed — next period ends ${nextEnd.slice(0, 10)}`);
  } else if (sub.status === "canceled") {
    db.update<Subscription>("subscriptions", sub.id, {
      plan: "free",
      status: "active",
      current_period_end: null,
      razorpay_subscription_id: null,
      updated_at: now(),
    });
    logBilling(userId, "downgraded", "Subscription ended — moved to Free plan");
  }
}

export function logBilling(userId: string, type: BillingEvent["type"], meta: string) {
  if (isRemote()) return; // server records billing events
  db.insert<BillingEvent>("billing_events", {
    id: uid(),
    user_id: userId,
    type,
    meta,
    created_at: now(),
  });
}

// ————— Engine loop (local mode) —————

let interval: ReturnType<typeof setInterval> | null = null;

export function startMailer(userId: string): () => void {
  if (isRemote()) return () => undefined;
  resumePlanner(userId);
  interval = setInterval(() => processDueEmails(userId), 4000);
  return () => {
    if (interval) clearInterval(interval);
    interval = null;
  };
}

function resumePlanner(userId: string) {
  processRollovers(userId);
  processDueEmails(userId);
}
