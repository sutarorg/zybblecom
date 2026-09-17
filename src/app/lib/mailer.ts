import { db } from "./db";
import { api, cacheRow, syncFromServer } from "./remote";
import type { Campaign, CampaignStep, EmailAccount, Lead, SuppressionEntry } from "./types";

// ————————————————————————————————————————————————————————————
// Outreach client. SMTP credentials are encrypted and verified
// server-side; sending is performed by the background processor.
// ————————————————————————————————————————————————————————————

export interface SmtpForm {
  label: string;
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
}

export async function addEmailAccount(form: SmtpForm): Promise<EmailAccount> {
  const account = await api<EmailAccount>("/api/accounts", { body: form, timeoutMs: 45_000 });
  cacheRow("email_accounts", account);
  void syncFromServer();
  return account;
}

export async function deleteEmailAccount(accountId: string) {
  await api(`/api/accounts/${accountId}`, { method: "DELETE" });
  await syncFromServer(true);
}

export async function testConnection(accountId: string): Promise<void> {
  await api(`/api/accounts/${accountId}/test`, { body: {}, timeoutMs: 45_000 });
  db.update<EmailAccount>("email_accounts", accountId, { status: "active" });
}

// ————— Campaigns —————

export interface StepForm {
  day_offset: number;
  subject: string;
  body: string;
}

function validate(input: { name: string; steps: StepForm[] }) {
  if (!input.name.trim()) throw new Error("Name your campaign.");
  const steps = input.steps.filter((s) => s.subject.trim() && s.body.trim());
  if (steps.length === 0) throw new Error("Add at least one complete email step.");
  if (steps[0].day_offset !== 0) throw new Error("The first email must send on day 0.");
  for (let i = 1; i < steps.length; i++)
    if (steps[i].day_offset <= steps[i - 1].day_offset)
      throw new Error("Each follow-up must be scheduled after the previous one.");
  return steps;
}

export async function createCampaign(input: {
  name: string;
  account_id: string | null;
  steps: StepForm[];
}): Promise<Campaign> {
  const steps = validate(input);
  const created = await api<{ campaign: Campaign; steps: CampaignStep[] }>("/api/campaigns", {
    body: { name: input.name, account_id: input.account_id, steps },
  });
  cacheRow("campaigns", created.campaign);
  for (const s of created.steps) cacheRow("campaign_steps", s);
  void syncFromServer();
  return created.campaign;
}

export async function updateCampaign(
  campaignId: string,
  input: { name: string; account_id: string | null; steps: StepForm[] }
) {
  const steps = validate(input);
  await api(`/api/campaigns/${campaignId}`, {
    method: "PUT",
    body: { name: input.name, account_id: input.account_id, steps },
  });
  await syncFromServer(true);
}

export function campaignSteps(campaignId: string): CampaignStep[] {
  return db
    .where<CampaignStep>("campaign_steps", (s) => s.campaign_id === campaignId)
    .sort((a, b) => a.position - b.position);
}

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

export async function addLeadsToCampaign(
  campaignId: string,
  leadIds: string[]
): Promise<number> {
  const res = await api<{ added: number }>(`/api/campaigns/${campaignId}/leads`, {
    body: { leadIds },
  });
  await syncFromServer(true);
  return res.added;
}

export async function launchCampaign(campaignId: string) {
  await api(`/api/campaigns/${campaignId}/launch`, { body: {} });
  await syncFromServer(true);
}

export async function pauseCampaign(campaignId: string) {
  await api(`/api/campaigns/${campaignId}/pause`, { body: {} });
  db.update<Campaign>("campaigns", campaignId, { status: "paused" });
}

export async function resumeCampaign(campaignId: string) {
  await api(`/api/campaigns/${campaignId}/resume`, { body: {} });
  db.update<Campaign>("campaigns", campaignId, { status: "active" });
}

export async function deleteCampaign(campaignId: string) {
  await api(`/api/campaigns/${campaignId}`, { method: "DELETE" });
  await syncFromServer(true);
}

// ————— Suppression & unsubscribe —————

export async function unsubscribeByToken(token: string): Promise<{ email: string } | null> {
  return api<{ email: string }>("/api/public/unsubscribe", { body: { token }, auth: false });
}

export async function suppressEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email.");
  const row = await api<SuppressionEntry>("/api/suppression", {
    body: { email: email.toLowerCase() },
  });
  cacheRow("suppression_list", row);
}

export async function unsuppressEmail(email: string) {
  await api(`/api/suppression/${encodeURIComponent(email)}`, { method: "DELETE" });
  await syncFromServer(true);
}
