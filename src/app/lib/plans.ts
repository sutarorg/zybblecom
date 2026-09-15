import { db, now } from "./db";
import type { PlanId, Subscription, UsageRow } from "./types";

// ————————————————————————————————————————————————————————————
// Plans + server-side-style usage enforcement. Every quota
// decision goes through this module (single code path), never
// through the UI alone.
// ————————————————————————————————————————————————————————————

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  leadsPerMonth: number;
  ai: boolean;
  sequences: boolean;
  senders: number;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    leadsPerMonth: 100,
    ai: false,
    sequences: false,
    senders: 1,
    features: [
      "100 leads / month",
      "Lead Finder",
      "Leads Database",
      "Email Finder & Verification",
      "Lead Enrichment",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    price: 49,
    leadsPerMonth: 5000,
    ai: true,
    sequences: true,
    senders: 3,
    features: [
      "5,000 leads / month",
      "Lead Finder",
      "Leads Database",
      "Email Finder & Verification",
      "AI Research",
      "AI Lead Scoring",
      "AI Email Writer",
      "Email Sequences & Automation",
    ],
  },
  agency: {
    id: "agency",
    name: "Agency",
    price: 129,
    leadsPerMonth: 20000,
    ai: true,
    sequences: true,
    senders: 5,
    features: [
      "20,000 leads / month",
      "Lead Finder",
      "Leads Database",
      "Email Finder & Verification",
      "AI Research",
      "AI Lead Scoring",
      "AI Email Writer",
      "Email Sequences & Automation",
    ],
  },
};

export class QuotaError extends Error {
  remaining: number;
  constructor(remaining: number, planName: string) {
    super(
      remaining <= 0
        ? `You've used all ${planName} leads for this month. Upgrade to keep finding leads.`
        : `Only ${remaining} leads remaining on ${planName} this month.`
    );
    this.remaining = remaining;
  }
}

export class PlanGateError extends Error {
  constructor(feature: string) {
    super(`${feature} is available on Growth and Agency plans.`);
  }
}

export function getSubscription(userId: string): Subscription {
  let sub = db.one<Subscription>("subscriptions", (s) => s.user_id === userId);
  if (!sub) {
    sub = db.insert("subscriptions", {
      id: crypto.randomUUID(),
      user_id: userId,
      plan: "free",
      status: "active",
      current_period_end: null,
      razorpay_subscription_id: null,
      created_at: now(),
      updated_at: now(),
    } as Subscription);
  }
  return sub;
}

export function getPlan(userId: string): Plan {
  const sub = getSubscription(userId);
  return PLANS[sub.plan] ?? PLANS.free;
}

export function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function getUsage(userId: string): UsageRow {
  const month = monthKey();
  let row = db.one<UsageRow>(
    "usage",
    (u) => u.user_id === userId && u.month === month
  );
  if (!row) {
    row = db.insert("usage", {
      id: crypto.randomUUID(),
      user_id: userId,
      month,
      leads_used: 0,
      updated_at: now(),
    } as UsageRow);
  }
  return row;
}

export function leadsRemaining(userId: string): number {
  const plan = getPlan(userId);
  const used = getUsage(userId).leads_used;
  return Math.max(0, plan.leadsPerMonth - used);
}

/** Throws QuotaError when a search of `qty` leads would exceed the plan. */
export function assertLeadQuota(userId: string, qty: number) {
  const remaining = leadsRemaining(userId);
  if (qty > remaining) throw new QuotaError(remaining, getPlan(userId).name);
}

export function consumeLeads(userId: string, n: number) {
  const row = getUsage(userId);
  db.update<UsageRow>("usage", row.id, {
    leads_used: row.leads_used + n,
    updated_at: now(),
  });
}

export function assertAiAccess(userId: string, feature: string) {
  if (!getPlan(userId).ai) throw new PlanGateError(feature);
}

export function assertSequenceAccess(userId: string) {
  if (!getPlan(userId).sequences)
    throw new PlanGateError("Email Sequences & Automation");
}
