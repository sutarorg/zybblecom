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

export type PaidPlan = "growth" | "agency";

interface PlanRow {
  id: string;
  razorpay_plan_id: string | null;
  razorpay_key_id: string | null;
}

/**
 * Razorpay plan ids only exist inside the account *and mode* that created
 * them: a plan provisioned with a live key is invisible to a test key, and
 * vice versa. Using such an id is exactly what produces
 * "The ID provided is invalid or could not be found." — so the cache is keyed
 * by the configured key, and anything else is treated as a miss.
 */
async function readCachedPlan(plan: PaidPlan): Promise<PlanRow | null> {
  const { data } = await sb
    .from("billing_plans")
    .select("id,razorpay_plan_id,razorpay_key_id")
    .eq("id", plan)
    .maybeSingle();
  return (data as PlanRow | null) ?? null;
}

async function rememberPlan(plan: PaidPlan, razorpayPlanId: string): Promise<void> {
  // One Razorpay plan maps to exactly one Zybble plan: drop a stale mapping
  // before writing the new one, so the unique index never rejects the write.
  await sb
    .from("billing_plans")
    .update({ razorpay_plan_id: null })
    .eq("razorpay_plan_id", razorpayPlanId)
    .neq("id", plan);
  const { error } = await sb.from("billing_plans").upsert(
    {
      id: plan,
      razorpay_plan_id: razorpayPlanId,
      razorpay_key_id: env.razorpayKeyId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    log.warn("billing plan cache could not be written", { plan, error: error.message });
  }
}

async function forgetPlan(plan: PaidPlan): Promise<void> {
  // The row is a cache: clearing it is always safe, including when the id was
  // created by a key this deployment no longer uses.
  const { error } = await sb
    .from("billing_plans")
    .update({ razorpay_plan_id: null, razorpay_key_id: null, updated_at: new Date().toISOString() })
    .eq("id", plan);
  if (error) log.warn("billing plan cache could not be cleared", { plan, error: error.message });
}

/** Is this plan id visible to the key currently configured? */
async function planExists(razorpayPlanId: string): Promise<boolean> {
  try {
    await rp<{ id: string }>("GET", `/plans/${encodeURIComponent(razorpayPlanId)}`);
    return true;
  } catch (err) {
    if (err instanceof HttpError && err.status === 400) return false;
    throw err;
  }
}

async function provisionPlan(plan: PaidPlan): Promise<string> {
  const created = await rp<{ id: string }>("POST", "/plans", {
    period: "monthly",
    interval: 1,
    item: {
      name: `Zybble ${plan === "growth" ? "Growth" : "Agency"}`,
      amount: PLAN_AMOUNTS[plan],
      currency: "USD",
    },
  });
  await rememberPlan(plan, created.id);
  log.info("razorpay plan provisioned", { plan, id: created.id, key: env.razorpayKeyId.slice(0, 12) });
  return created.id;
}

/** Plans are provisioned once per Razorpay key and cached in billing_plans. */
export async function ensureRazorpayPlan(plan: PaidPlan): Promise<string> {
  const cached = await readCachedPlan(plan);
  if (cached?.razorpay_plan_id) {
    if (cached.razorpay_key_id === env.razorpayKeyId) return cached.razorpay_plan_id;
    // Cached under another key — or before key scoping existed (null). It is
    // only reusable if this account can actually see it.
    if (await planExists(cached.razorpay_plan_id)) {
      await rememberPlan(plan, cached.razorpay_plan_id);
      return cached.razorpay_plan_id;
    }
    log.warn("cached razorpay plan belongs to another key — provisioning a new one", {
      plan,
      stale: cached.razorpay_plan_id,
    });
    await forgetPlan(plan);
  }
  return provisionPlan(plan);
}

/** Razorpay's answer when a plan id does not exist for the current key. */
function isUnusablePlanError(err: unknown): boolean {
  return (
    err instanceof HttpError &&
    err.status === 400 &&
    /invalid or could not be found|does not exist|invalid plan/i.test(err.message)
  );
}

export async function createSubscription(razorpayPlanId: string): Promise<{ id: string }> {
  return rp<{ id: string }>("POST", "/subscriptions", {
    plan_id: razorpayPlanId,
    total_count: 120, // 10 years of monthly cycles
    customer_notify: 0,
  });
}

/**
 * Start a subscription for a Zybble plan, repairing a stale plan cache once.
 *
 * This is the path the checkout button takes: if Razorpay rejects the cached
 * plan id (the "invalid or could not be found" failure), the cache is dropped,
 * the plan is provisioned for the configured key and the subscription is
 * retried exactly once.
 */
export async function startSubscription(plan: PaidPlan): Promise<{ id: string }> {
  const razorpayPlanId = await ensureRazorpayPlan(plan);
  try {
    return await createSubscription(razorpayPlanId);
  } catch (err) {
    if (!isUnusablePlanError(err)) throw err;
    log.warn("razorpay rejected the cached plan — provisioning a fresh one", {
      plan,
      plan_id: razorpayPlanId,
    });
    await forgetPlan(plan);
    return createSubscription(await provisionPlan(plan));
  }
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
