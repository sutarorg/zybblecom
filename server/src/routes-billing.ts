import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env, HttpError, log, requireUser, sb } from "./core";
import {
  cancelSubscription,
  createSubscription,
  ensureRazorpayPlan,
  getSubscription,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "./razorpay";

// ————————————————————————————————————————————————————————————
// Billing routes. Browser redirects are never trusted — the
// signed Razorpay webhook is the source of truth; every webhook
// is verified and processed exactly once (idempotency table).
// ————————————————————————————————————————————————————————————

function body<T>(schema: z.ZodType<T>, payload: unknown): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request.");
  return parsed.data;
}

async function recordBilling(userId: string, type: string, meta: string) {
  await sb.from("billing_events").insert({ user_id: userId, type, meta });
}

async function subById(userId: string) {
  const { data } = await sb.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
  if (!data) throw new HttpError(404, "Subscription record not found.");
  return data;
}

async function applyRazorpayState(userId: string, rzpSubId: string, source: string) {
  const rzp = await getSubscription(rzpSubId);
  // Map the Razorpay plan back to an internal plan via billing_plans.
  const { data: planRow } = await sb
    .from("billing_plans")
    .select("id")
    .eq("razorpay_plan_id", rzp.plan_id)
    .maybeSingle();
  const plan = planRow?.id ?? "growth";
  const periodEnd = rzp.current_end
    ? new Date(rzp.current_end * 1000).toISOString()
    : new Date(Date.now() + 30 * 86_400_000).toISOString();

  const active = ["active", "authenticated"].includes(rzp.status);
  await sb
    .from("subscriptions")
    .update({
      plan: active ? plan : undefined,
      status: active ? "active" : rzp.status === "halted" ? "past_due" : "canceled",
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  log.info("subscription state applied", { userId, rzpSubId, status: rzp.status, source });
  return { plan, periodEnd, status: rzp.status };
}

export async function registerBilling(app: FastifyInstance) {
  // ————— Create a Razorpay subscription for hosted checkout —————
  app.post("/api/billing/subscription", async (req) => {
    const user = await requireUser(req);
    const { plan } = body(z.object({ plan: z.enum(["growth", "agency"]) }), req.body);

    // Switching plans: end the previous subscription immediately so
    // the customer is never double-billed for two active plans.
    const existing = await subById(user.id);
    if (existing.razorpay_subscription_id && existing.status === "active" && existing.plan !== plan) {
      try {
        await cancelSubscription(existing.razorpay_subscription_id);
        log.info("previous subscription ended for plan switch", { user: user.id });
      } catch (err) {
        log.warn("could not end previous subscription", { user: user.id, err: String(err) });
      }
    }

    const rzpPlanId = await ensureRazorpayPlan(sb, plan);
    const rzp = await createSubscription(rzpPlanId);
    await sb
      .from("subscriptions")
      .update({ razorpay_subscription_id: rzp.id, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    await recordBilling(user.id, "checkout", `Checkout started for ${plan} (subscription ${rzp.id})`);

    return { key_id: env.razorpayKeyId, subscription_id: rzp.id };
  });

  // ————— Browser confirm (optimistic; webhook reconciles) —————
  app.post("/api/billing/verify", async (req) => {
    const user = await requireUser(req);
    const input = body(
      z.object({
        razorpay_payment_id: z.string().min(6).max(60),
        razorpay_subscription_id: z.string().min(6).max(60),
        razorpay_signature: z.string().min(16).max(200),
      }),
      req.body
    );
    if (!verifyCheckoutSignature(input)) throw new HttpError(400, "Invalid payment signature.");

    const sub = await subById(user.id);
    if (sub.razorpay_subscription_id !== input.razorpay_subscription_id)
      throw new HttpError(400, "Subscription mismatch.");

    const applied = await applyRazorpayState(user.id, input.razorpay_subscription_id, "browser-verify");
    await recordBilling(user.id, "upgraded", `Plan upgraded to ${applied.plan} — renews ${applied.periodEnd.slice(0, 10)}`);
    return { ok: true };
  });

  // ————— Cancel at cycle end —————
  app.post("/api/billing/cancel", async (req) => {
    const user = await requireUser(req);
    const sub = await subById(user.id);
    if (!sub.razorpay_subscription_id) throw new HttpError(400, "No paid subscription to cancel.");
    await cancelSubscription(sub.razorpay_subscription_id);
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
  app.post(
    "/api/webhooks/razorpay",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const rawBody = (req as unknown as { rawBody?: string }).rawBody ?? "";
      const signature = req.headers["x-razorpay-signature"] as string | undefined;
      if (!verifyWebhookSignature(rawBody, signature)) {
        log.warn("razorpay webhook rejected: bad signature");
        return reply.status(401).send({ error: "Invalid signature." });
      }

      const payload = req.body as {
        event?: string;
        payload?: {
          subscription?: { entity?: { id?: string; plan_id?: string; status?: string; current_end?: number } };
          payment?: { entity?: { id?: string; subscription_id?: string } };
        };
      };
      const event = payload.event ?? "unknown";
      const eventId =
        (req.headers["x-razorpay-event-id"] as string | undefined) ??
        `${event}:${payload.payload?.subscription?.entity?.id ?? "none"}:${Date.now()}`;

      // Idempotency: first writer wins; duplicates acknowledged silently.
      const { error: idemErr } = await sb.from("webhook_events").insert({ id: eventId, event });
      if (idemErr) return { ok: true, deduped: true };

      try {
        const entity = payload.payload?.subscription?.entity;
        if (!entity?.id) {
          if (event === "payment.failed") {
            const rzpSubId = payload.payload?.payment?.entity?.subscription_id;
            if (rzpSubId) {
              const { data: sub } = await sb.from("subscriptions").select("user_id").eq("razorpay_subscription_id", rzpSubId).maybeSingle();
              if (sub) {
                await sb.from("subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("user_id", sub.user_id);
                await recordBilling(sub.user_id, "payment_failed", "Payment failed — subscription past due");
              }
            }
          }
          return { ok: true };
        }

        const { data: sub } = await sb
          .from("subscriptions")
          .select("user_id")
          .eq("razorpay_subscription_id", entity.id)
          .maybeSingle();
        if (!sub) {
          log.warn("webhook for unknown subscription", { rzpSubId: entity.id, event });
          return { ok: true };
        }

        switch (event) {
          case "subscription.activated":
          case "subscription.charged": {
            const applied = await applyRazorpayState(sub.user_id, entity.id, `webhook:${event}`);
            await recordBilling(
              sub.user_id,
              event === "subscription.activated" ? "upgraded" : "renewed",
              event === "subscription.activated"
                ? `Plan upgraded to ${applied.plan} — renews ${applied.periodEnd.slice(0, 10)}`
                : `Subscription renewed — next period ends ${applied.periodEnd.slice(0, 10)}`
            );
            break;
          }
          case "subscription.cancelled":
          case "subscription.completed": {
            const end = entity.current_end ? new Date(entity.current_end * 1000).toISOString() : null;
            await sb.from("subscriptions").update({ status: "canceled", current_period_end: end, updated_at: new Date().toISOString() }).eq("user_id", sub.user_id);
            await recordBilling(sub.user_id, "canceled", "Subscription canceled at period end");
            break;
          }
          case "subscription.halted": {
            await sb.from("subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("user_id", sub.user_id);
            await recordBilling(sub.user_id, "payment_failed", "Subscription halted — payment failed");
            break;
          }
          default:
            log.info("razorpay webhook ignored", { event });
        }
      } catch (err) {
        log.error("razorpay webhook processing failed", { event, err: String(err) });
        return reply.status(500).send({ error: "Processing failed" }); // Razorpay retries
      }

      return { ok: true };
    }
  );
}
