import { env, hmacSha256, HttpError, log, safeEqualHex, sb } from "./core.ts";

// ————————————————————————————————————————————————————————————
// Razorpay — USD subscriptions via REST (plans auto-provisioned),
// hosted-checkout signature verification, verified webhooks.
// ————————————————————————————————————————————————————————————

const BASE = "https://api.razorpay.com/v1";
const authHeader = () =>
  `Basic ${Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64")}`;

async function rp<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) {
    log.error("razorpay error", { status: res.status, path, body: text.slice(0, 300) });
    let msg = "Payment service error.";
    try {
      msg = (JSON.parse(text) as { error?: { description?: string } }).error?.description ?? msg;
    } catch {
      /* keep default */
    }
    throw new HttpError(res.status === 400 ? 400 : 502, msg);
  }
  return JSON.parse(text) as T;
}

export const PLAN_AMOUNTS: Record<"growth" | "agency", number> = {
  growth: 4900, // $49.00
  agency: 12900, // $129.00
};

/** Plans are created once and cached in billing_plans. */
export async function ensureRazorpayPlan(plan: "growth" | "agency"): Promise<string> {
  const { data } = await sb
    .from("billing_plans")
    .select("razorpay_plan_id")
    .eq("id", plan)
    .maybeSingle();
  if (data?.razorpay_plan_id) return data.razorpay_plan_id as string;

  const created = await rp<{ id: string }>("POST", "/plans", {
    period: "monthly",
    interval: 1,
    item: {
      name: `Zybble ${plan === "growth" ? "Growth" : "Agency"}`,
      amount: PLAN_AMOUNTS[plan],
      currency: "USD",
    },
  });
  await sb
    .from("billing_plans")
    .upsert({ id: plan, razorpay_plan_id: created.id, updated_at: new Date().toISOString() });
  log.info("razorpay plan provisioned", { plan, id: created.id });
  return created.id;
}

export async function createSubscription(razorpayPlanId: string): Promise<{ id: string }> {
  return rp<{ id: string }>("POST", "/subscriptions", {
    plan_id: razorpayPlanId,
    total_count: 120, // 10 years of monthly cycles
    customer_notify: 0,
  });
}

export async function getSubscription(id: string): Promise<{
  id: string;
  status: string;
  current_end: number | null;
  plan_id: string;
}> {
  return rp("GET", `/subscriptions/${id}`);
}

export async function cancelSubscription(id: string, atCycleEnd = true): Promise<void> {
  await rp("POST", `/subscriptions/${id}/cancel`, { cancel_at_cycle_end: atCycleEnd ? 1 : 0 });
}

/** Hosted checkout: signature = HMAC_SHA256(payment_id|subscription_id, secret). */
export function verifyCheckoutSignature(input: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}): boolean {
  const expected = hmacSha256(
    env.razorpayKeySecret,
    `${input.razorpay_payment_id}|${input.razorpay_subscription_id}`
  );
  try {
    return safeEqualHex(expected, input.razorpay_signature);
  } catch {
    return false;
  }
}

/** Webhook authenticity: X-Razorpay-Signature over the raw body. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  try {
    return safeEqualHex(hmacSha256(env.razorpayWebhookSecret, rawBody), signature);
  } catch {
    return false;
  }
}
