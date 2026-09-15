// ————————————————————————————————————————————————————————————
// Zybble data model — mirrors supabase/migrations/001_init.sql
// ————————————————————————————————————————————————————————————

export type ID = string;

export type PlanId = "free" | "growth" | "agency";

export type JobStatus =
  | "queued"
  | "searching"
  | "collecting"
  | "enriching"
  | "finding_emails"
  | "complete"
  | "failed";

export type EmailStatus = "verified" | "risky" | "invalid" | "unknown";

export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export type LeadCampaignStatus =
  | "active"
  | "completed"
  | "unsubscribed"
  | "removed";

export interface Profile {
  id: ID;
  email: string;
  name: string;
  company: string;
  from_name: string;
  created_at: string;
}

export interface Subscription {
  id: ID;
  user_id: ID;
  plan: PlanId;
  status: "active" | "canceled" | "past_due";
  current_period_end: string | null;
  razorpay_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageRow {
  id: ID;
  user_id: ID;
  month: string; // YYYY-MM
  leads_used: number;
  updated_at: string;
}

export interface LeadCandidate {
  company: string;
  category: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string | null;
  website: string | null;
  maps_url: string;
  rating: number | null;
  reviews: number | null;
  hours: string | null;
  description: string | null;
}

export interface SearchJob {
  id: ID;
  user_id: ID;
  query: string;
  location: string;
  quantity: number;
  status: JobStatus;
  progress: number; // 0-100
  collected: number;
  candidates: LeadCandidate[]; // durable payload — jobs survive reloads
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead extends LeadCandidate {
  id: ID;
  user_id: ID;
  job_id: ID | null;
  email: string | null;
  email_status: EmailStatus | null;
  email_source_url: string | null;
  ai_score: number | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiResearch {
  id: ID;
  user_id: ID;
  lead_id: ID;
  summary: string;
  insights: { label: string; value: string }[];
  angle: string;
  created_at: string;
}

export interface AiScore {
  id: ID;
  user_id: ID;
  lead_id: ID;
  score: number;
  verdict: string;
  reasons: string[];
  created_at: string;
}

export interface EmailAccount {
  id: ID;
  user_id: ID;
  label: string;
  host: string;
  port: number;
  username: string;
  password_enc: string; // AES-GCM encrypted, never returned decrypted
  from_email: string;
  from_name: string;
  status: "active" | "error";
  created_at: string;
}

export interface Campaign {
  id: ID;
  user_id: ID;
  name: string;
  status: CampaignStatus;
  account_id: ID | null;
  total_leads: number;
  sent_count: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignStep {
  id: ID;
  campaign_id: ID;
  position: number; // 1-based
  day_offset: number; // days after previous step
  subject: string;
  body: string;
}

export interface CampaignLead {
  id: ID;
  campaign_id: ID;
  lead_id: ID;
  status: LeadCampaignStatus;
  current_step: number;
  next_send_at: string | null;
  unsub_token: string;
  created_at: string;
}

export interface EmailJob {
  id: ID;
  user_id: ID;
  campaign_id: ID;
  campaign_lead_id: ID;
  step_id: ID;
  lead_email: string;
  subject: string;
  body: string;
  send_at: string;
  status: "scheduled" | "sent" | "failed" | "skipped";
  attempts: number;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface EmailEvent {
  id: ID;
  user_id: ID;
  campaign_id: ID | null;
  email_job_id: ID | null;
  type:
    | "scheduled"
    | "sent"
    | "failed"
    | "retry"
    | "suppressed"
    | "unsubscribed"
    | "bounced";
  meta: string | null;
  created_at: string;
}

export interface SuppressionEntry {
  id: ID;
  user_id: ID;
  email: string;
  reason: "unsubscribe" | "manual" | "bounce";
  created_at: string;
}

export interface BillingEvent {
  id: ID;
  user_id: ID;
  type:
    | "checkout"
    | "upgraded"
    | "downgraded"
    | "canceled"
    | "renewed"
    | "payment_failed";
  meta: string | null;
  created_at: string;
}

// ——— auth vault tables ———

export interface AuthUser {
  id: ID;
  email: string;
  pass_hash: string;
  salt: string;
  created_at: string;
}

export interface Session {
  token: string;
  user_id: ID;
  created_at: string;
}

export interface AuthToken {
  id: ID;
  token: string;
  user_id: ID;
  type: "magic" | "reset";
  expires_at: string;
  used: boolean;
}

export type Table =
  | "auth_users"
  | "sessions"
  | "tokens"
  | "profiles"
  | "subscriptions"
  | "usage"
  | "search_jobs"
  | "leads"
  | "ai_research"
  | "ai_scores"
  | "email_accounts"
  | "campaigns"
  | "campaign_steps"
  | "campaign_leads"
  | "email_jobs"
  | "email_events"
  | "suppression_list"
  | "billing_events";
