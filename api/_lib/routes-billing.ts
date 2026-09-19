import crypto from "node:crypto";
import { z } from "zod";
import {
  checkConfig,
  enforceRateLimit,
  env,
  HttpError,
  log,
  requireUser,
  sb,
} from "./core.ts";
import { json as jsonResponse, type Router } from "./http.ts";
import {
  cancelSubscription,
  getSubscription,
  startSubscription,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "./razorpay.ts";

// ————————————————————————————————————————————————————————————
// Billing. Browser redirects are never trusted — the signed
// Razorpay webhook is the source of truth, verified and
// processed exactly once via the idempotency table.
// ————————————————————————————————————————————————————————————

async function recordBilling(userId: string, type: string, meta: string) {
  await sb.from("billing_events").insert({ user_id: userId, type, meta });
}

async function subFor(userId: string) {
  const { data } = await sb.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
  if (!data) throw new HttpError(404, "Subscription record not found.");
  return data;
}

async function markWebhook(eventId: string, status: "processed" | "failed", error?: string) {
  await sb
    .from("webhook_events")
    .update({
      status,
      last_error: error?.slice(0, 300) ?? null,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);
}

/**
 * Which Zybble plan a Razorpay plan id belongs to.
 *
 * `billing_plans` is the cache, but it can miss: a subscription may have been
 * created before a key rotation, or by a key whose plan row was re-provisioned
 * since. The checkout row (written when the subscription was created) is the
 * authoritative record of the plan the user actually paid for, so it is the
 * fallback — never a guess.
 */
async function planForRazorpayPlan(rzpSubId: string, razorpayPlanId: string): Promise<string> {
  const { data: planRow } = await sb
    .from("billing_plans")
    .select("id")
    .eq("razorpay_plan_id", razorpayPlanId)
    .maybeSingle();
  if (planRow?.id) return planRow.id as string;

  const { data: checkout } = await sb
    .from("billing_checkouts")
    .select("plan")
    .eq("razorpay_subscription_id", rzpSubId)
    .maybeSingle();
  if (checkout?.plan) {
    // Re-cache the mapping so later webhook lookups are a plain hit.
    await sb
      .from("billing_plans")
      .update({ razorpay_plan_id: razorpayPlanId, updated_at: new Date().toISOString() })
      .eq("id", checkout.plan)
      .is("razorpay_plan_id", null);
    return checkout.plan as string;
  }
  throw new HttpError(500, "Unknown Razorpay plan mapping.");
}

async function applyRazorpayState(userId: string, rzpSubId: string, source: string) {
  const rzp = await getSubscription(rzpSubId);
  const plan = await planForRazorpayPlan(rzpSubId, rzp.plan_id);
  const periodEnd = rzp.current_end
    ? new Date(rzp.current_end * 1000).toISOString()
    : new Date(Date.now() + 30 * 86_400_000).toISOString();

  const active = ["active", "authenticated"].includes(rzp.status);
  if (!active) return { plan, periodEnd, status: rzp.status };

  await sb
    .from("subscriptions")
    .update({
      plan,
      status: "active",
      razorpay_subscription_id: rzpSubId,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  log.info("subscription state applied", { userId, status: rzp.status, source });
  return { plan, periodEnd, status: rzp.status };
}

async function retirePreviousSubscription(subscriptionId: string, replacementId: string) {
  try {
    await cancelSubscription(subscriptionId, false);
    await sb
      .from("billing_checkouts")
      .update({ previous_subscription_id: null, updated_at: new Date().toISOString() })
      .eq("razorpay_subscription_id", replacementId);
  } catch (err) {
    // The hourly reconciliation pass retries this.
    log.warn("previous subscription cancellation deferred", {
      subscription: subscriptionId,
      err: String(err),
    });
  }
}

export function registerBilling(r: Router) {
  // ————— Create a Razorpay subscription for hosted checkout —————
  r.post("/api/billing/subscription", async ({ req, json }) => {
    checkConfig("RAZORPAY_KEY_ID");
    checkConfig("RAZORPAY_KEY_SECRET");
    const user = await requireUser(req);
    const { plan } = await json(z.object({ plan: z.enum(["growth", "agency"]) }));
    await enforceRateLimit(user.id, "billing-checkout", 5, 300);

    // The current plan stays active while checkout is pending; it is only
    // retired once Razorpay confirms the replacement.
    const existing = await subFor(user.id);
    // Provisions the plan for the configured key, and repairs a stale cache
    // (e.g. the plan was created with a different key/mode) instead of
    // failing the checkout.
    const rzp = await startSubscription(plan);
    const { error: checkoutInsertError } = await sb.from("billing_checkouts").insert({
      razorpay_subscription_id: rzp.id,
      user_id: user.id,
      plan,
      previous_subscription_id: existing.razorpay_subscription_id,
      status: "pending",
    });
    if (checkoutInsertError) {
      // The Razorpay subscription exists but could not be persisted — cancel
      // it immediately so the user is never charged for an orphaned plan.
      try {
        await cancelSubscription(rzp.id, false);
      } catch { /* best effort */ }
      const hint = /does not exist/i.test(checkoutInsertError.message)
        ? " The billing_checkouts table is missing — run supabase/migrations/003_production_hardening.sql (and later migrations) in the SQL Editor."
        : ` (${checkoutInsertError.message.slice(0, 160)})`;
      throw new HttpError(500, `Could not start checkout.${hint}`);
    }
    await recordBilling(user.id, "checkout", `Checkout started for ${plan} (subscription ${rzp.id})`);
    return { key_id: env.razorpayKeyId, subscription_id: rzp.id };
  });

  // ————— Browser confirmation (webhook still reconciles) —————
  r.post("/api/billing/verify", async ({ req, json }) => {
    checkConfig("RAZORPAY_KEY_SECRET");
    const user = await requireUser(req);
    const input = await json(
      z.object({
        razorpay_payment_id: z.string().min(6).max(60),
        razorpay_subscription_id: z.string().min(6).max(60),
        razorpay_signature: z.string().min(16).max(200),
      })
    );
    if (!verifyCheckoutSignature(input)) throw new HttpError(400, "Invalid payment signature.");

    const { data: checkout } = await sb
      .from("billing_checkouts")
      .select("*")
      .eq("user_id", user.id)
      .eq("razorpay_subscription_id", input.razorpay_subscription_id)
      .eq("status", "pending")
      .maybeSingle();
    if (!checkout) throw new HttpError(400, "Subscription mismatch.");

    const applied = await applyRazorpayState(user.id, input.razorpay_subscription_id, "browser-verify");
    if (["active", "authenticated"].includes(applied.status)) {
      if (
        checkout.previous_subscription_id &&
        checkout.previous_subscription_id !== input.razorpay_subscription_id
      ) {
        await retirePreviousSubscription(
          checkout.previous_subscription_id,
          input.razorpay_subscription_id
        );
      }
      await sb
        .from("billing_checkouts")
        .update({ status: "activated", updated_at: new Date().toISOString() })
        .eq("razorpay_subscription_id", input.razorpay_subscription_id);
      await recordBilling(
        user.id,
        "upgraded",
        `Plan upgraded to ${applied.plan} — renews ${applied.periodEnd.slice(0, 10)}`
      );
    }
    return { ok: true };
  });

  // ————— Cancel at cycle end —————
  r.post("/api/billing/cancel", async ({ req }) => {
    checkConfig("RAZORPAY_KEY_ID");
    checkConfig("RAZORPAY_KEY_SECRET");
    const user = await requireUser(req);
    const sub = await subFor(user.id);
    if (!sub.razorpay_subscription_id) throw new HttpError(400, "No paid subscription to cancel.");
    await cancelSubscription(sub.razorpay_subscription_id, true);
    await sb
      .from("subscriptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    await recordBilling(
      user.id,
      "canceled",
      `Subscription canceled — access until ${sub.current_period_end?.slice(0, 10) ?? "period end"}`
    );
    return { ok: true };
  });

  // ————— Razorpay webhook (source of truth) —————
  r.post("/api/webhooks/razorpay", async ({ req, raw }) => {
    checkConfig("RAZORPAY_WEBHOOK_SECRET");
    const rawBody = await raw();
    const signature = req.headers.get("x-razorpay-signature");
    if (!verifyWebhookSignature(rawBody, signature)) {
      log.warn("razorpay webhook rejected: bad signature");
      return jsonResponse({ error: "Invalid signature." }, 401);
    }

    const payload = JSON.parse(rawBody || "{}") as {
      event?: string;
      payload?: {
        subscription?: { entity?: { id?: string; current_end?: number } };
        payment?: { entity?: { subscription_id?: string } };
      };
    };
    const event = payload.event ?? "unknown";
    const eventId =
      req.headers.get("x-razorpay-event-id") ??
      crypto.createHash("sha256").update(rawBody).digest("hex");

    // Atomic claim across all instances: processed and in-flight events
    // dedupe; failed or stale ones may be retried by Razorpay.
    const { data: claimed, error: claimError } = await sb.rpc("claim_webhook_event", {
      p_id: eventId,
      p_event: event,
    });
    if (claimError) {
      log.error("webhook idempotency unavailable", { error: claimError.message });
      return jsonResponse({ error: "Webhook persistence unavailable" }, 503);
    }
    if (!claimed) return { ok: true, deduped: true };

    try {
      const entity = payload.payload?.subscription?.entity;

      if (!entity?.id) {
        if (event === "payment.failed") {
          const rzpSubId = payload.payload?.payment?.entity?.subscription_id;
          if (rzpSubId) {
            const { data: currentSub } = await sb
              .from("subscriptions")
              .select("user_id")
              .eq("razorpay_subscription_id", rzpSubId)
              .maybeSingle();
            const { data: pending } = currentSub
              ? { data: null }
              : await sb
                  .from("billing_checkouts")
                  .select("user_id")
                  .eq("razorpay_subscription_id", rzpSubId)
                  .maybeSingle();
            const target = currentSub ?? pending;
            if (target) {
              if (currentSub) {
                await sb
                  .from("subscriptions")
                  .update({ status: "past_due", updated_at: new Date().toISOString() })
                  .eq("user_id", target.user_id);
              }
              await sb
                .from("billing_checkouts")
                .update({ status: "failed", updated_at: new Date().toISOString() })
                .eq("razorpay_subscription_id", rzpSubId);
              await recordBilling(
                target.user_id,
                "payment_failed",
                currentSub
                  ? "Payment failed — subscription past due"
                  : "Checkout payment failed — current plan unchanged"
              );
            }
          }
        }
        await markWebhook(eventId, "processed");
        return { ok: true };
      }

      const { data: currentSub } = await sb
        .from("subscriptions")
        .select("user_id")
        .eq("razorpay_subscription_id", entity.id)
        .maybeSingle();
      const { data: pendingCheckout } = currentSub
        ? { data: null }
        : await sb
            .from("billing_checkouts")
            .select("user_id,previous_subscription_id,status")
            .eq("razorpay_subscription_id", entity.id)
            .maybeSingle();
      const target = currentSub ?? pendingCheckout;
      if (!target) {
        log.warn("webhook for unknown subscription", { event });
        await markWebhook(eventId, "processed");
        return { ok: true };
      }

      switch (event) {
        case "subscription.activated":
        case "subscription.charged": {
          const applied = await applyRazorpayState(target.user_id, entity.id, `webhook:${event}`);
          if (
            pendingCheckout?.previous_subscription_id &&
            pendingCheckout.previous_subscription_id !== entity.id
          ) {
            await retirePreviousSubscription(pendingCheckout.previous_subscription_id, entity.id);
          }
          if (pendingCheckout) {
            await sb
              .from("billing_checkouts")
              .update({ status: "activated", updated_at: new Date().toISOString() })
              .eq("razorpay_subscription_id", entity.id);
          }
          await recordBilling(
            target.user_id,
            event === "subscription.activated" ? "upgraded" : "renewed",
            event === "subscription.activated"
              ? `Plan upgraded to ${applied.plan} — renews ${applied.periodEnd.slice(0, 10)}`
              : `Subscription renewed — next period ends ${applied.periodEnd.slice(0, 10)}`
          );
          break;
        }
        case "subscription.cancelled":
        case "subscription.completed": {
          const end = entity.current_end
            ? new Date(entity.current_end * 1000).toISOString()
            : null;
          await sb
            .from("subscriptions")
            .update({ status: "canceled", current_period_end: end, updated_at: new Date().toISOString() })
            .eq("user_id", target.user_id);
          await recordBilling(target.user_id, "canceled", "Subscription canceled at period end");
          break;
        }
        case "subscription.halted": {
          await sb
            .from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("user_id", target.user_id);
          await recordBilling(target.user_id, "payment_failed", "Subscription halted — payment failed");
          break;
        }
        default:
          log.info("razorpay webhook ignored", { event });
      }

      await markWebhook(eventId, "processed");
      return { ok: true };
    } catch (err) {
      log.error("razorpay webhook processing failed", { event, err: String(err) });
      await markWebhook(eventId, "failed", String(err));
      // Non-2xx makes Razorpay retry; the claim allows the retry through.
      return jsonResponse({ error: "Processing failed" }, 500);
    }
  });
}
