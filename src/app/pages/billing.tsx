import { motion } from "framer-motion";
import { Check, Lock, ShieldCheck, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cn } from "../../utils/cn";
import { useDb, db } from "../lib/db";
import { api, syncFromServer } from "../lib/remote";
import { getPlan, getSubscription, getUsage, PLANS, type Plan } from "../lib/plans";
import type { BillingEvent } from "../lib/types";
import { Badge, Button, Card, Field, Input, Modal, toast, UsageMeter } from "../ui/kit";

// Card details are collected by Razorpay's hosted checkout — never by this app.
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () =>
      reject(new Error("Could not load Razorpay checkout — check your connection."));
    document.body.appendChild(s);
  });
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

function CheckoutModal({
  open,
  onClose,
  plan,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  plan: Plan | null;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "processing" | "success">("form");

  const reset = () => {
    setName("");
    setError(null);
    setPhase("form");
  };

  const pay = async (e: FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setError(null);

    // Razorpay hosted checkout: the server creates the subscription,
    // Razorpay collects the card details, and the signed webhook is the
    // source of truth for activation.
    {
      setPhase("processing");
      try {
        const order = await api<{
          key_id: string;
          subscription_id: string;
        }>("/api/billing/subscription", { body: { plan: plan.id } });
        await loadRazorpayScript();
        const RazorpayCtor = (
          window as unknown as { Razorpay: new (opts: Record<string, unknown>) => { open(): void; on(ev: string, cb: (r: { error?: { description?: string } }) => void): void } }
        ).Razorpay;
        const rzp = new RazorpayCtor({
          key: order.key_id,
          subscription_id: order.subscription_id,
          name: "Zybble",
          description: `${plan.name} — monthly`,
          prefill: { name: name || undefined },
          theme: { color: "#14120f" },
          modal: {
            ondismiss: () => setPhase("form"),
          },
          handler: (resp: RazorpaySuccessResponse) => {
            void (async () => {
              try {
                await api("/api/billing/verify", { body: resp });
                await syncFromServer(true);
                setPhase("success");
                setTimeout(() => {
                  toast(`Welcome to ${plan.name} — ${plan.features[0]} unlocked`);
                  onDone();
                  reset();
                }, 1400);
              } catch (err) {
                setPhase("form");
                setError(err instanceof Error ? err.message : "Verification failed — if you were charged, payment will sync automatically.");
              }
            })();
          },
        });
        rzp.on("payment.failed", (r) => {
          setPhase("form");
          setError(r?.error?.description ?? "Payment failed — please try again.");
        });
        rzp.open();
      } catch (err) {
        setPhase("form");
        setError(err instanceof Error ? err.message : "Could not start checkout.");
      }
      return;
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        setTimeout(reset, 300);
      }}
      title="Secure checkout"
    >
      {phase === "success" ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-10 text-center"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </span>
          <p className="mt-4 font-display text-[18px] font-semibold text-neutral-950">
            You're on {plan?.name}
          </p>
          <p className="mt-1 text-[13px] text-neutral-500">
            {plan?.features[0]} · renews monthly · cancel anytime
          </p>
        </motion.div>
      ) : (
        <form onSubmit={(e) => void pay(e)} className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-neutral-950 px-4 py-3.5 text-white">
            <div>
              <p className="text-[11px] font-medium text-neutral-400">Zybble {plan?.name}</p>
              <p className="font-display text-[20px] font-semibold">
                ${plan?.price}
                <span className="text-[12px] font-medium text-neutral-400">/month</span>
              </p>
            </div>
            <Badge tone="neutral" className="bg-white/10 text-neutral-200">
              USD · monthly
            </Badge>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200/70 bg-red-50/70 px-3.5 py-2.5 text-[12.5px] font-medium text-red-600">
              {error}
            </p>
          )}

          <Field label="Name on card">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" autoComplete="cc-name" />
          </Field>

          <Button type="submit" loading={phase === "processing"} className="w-full">
            <Lock className="h-3.5 w-3.5" />
            {phase === "processing" ? "Opening secure checkout…" : "Continue to secure payment"}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Processed by Razorpay. Webhooks — not the browser — confirm payment.
          </p>
        </form>
      )}
    </Modal>
  );
}

export default function BillingPage({ userId }: { userId: string }) {
  useDb(["subscriptions", "usage", "billing_events"]);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const sub = getSubscription(userId);
  const plan = getPlan(userId);
  const usage = getUsage(userId);
  const events = db
    .where<BillingEvent>("billing_events", (b) => b.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const orderedPlans: Plan[] = [PLANS.free, PLANS.growth, PLANS.agency];

  const changePlan = (p: Plan) => {
    if (p.id === plan.id) return;
    if (p.id === "free") {
      setConfirmCancel(true);
      return;
    }
    setCheckoutPlan(p);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Current plan */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <p className="font-display text-[17px] font-semibold text-neutral-950">{plan.name} plan</p>
              {sub.status === "canceled" ? (
                <Badge tone="amber">Cancels {sub.current_period_end?.slice(0, 10)}</Badge>
              ) : (
                <Badge tone={plan.id === "free" ? "neutral" : "green"}>Active</Badge>
              )}
            </div>
            <p className="mt-1 text-[13px] text-neutral-500">
              {plan.id === "free"
                ? "Free forever — upgrade to unlock AI and automation."
                : sub.status === "canceled"
                  ? `Access continues until ${sub.current_period_end?.slice(0, 10)}, then moves to Free.`
                  : `$${plan.price}/month · renews ${sub.current_period_end?.slice(0, 10) ?? "monthly"}`}
            </p>
          </div>
          <div className="w-full sm:w-64">
            <UsageMeter used={usage.leads_used} total={plan.leadsPerMonth} />
          </div>
          {plan.id !== "free" && sub.status === "active" && (
            <Button variant="secondary" size="sm" onClick={() => setConfirmCancel(true)}>
              Cancel subscription
            </Button>
          )}
          {sub.status === "canceled" && (
            <Button
              size="sm"
              onClick={() => {
                // Razorpay cannot reliably undo cancel-at-cycle-end, so a
                // fresh hosted checkout reactivates the plan.
                setCheckoutPlan(plan);
              }}
            >
              Resume subscription
            </Button>
          )}
        </div>
      </Card>

      {/* Plans */}
      <div className="grid gap-4 md:grid-cols-3">
        {orderedPlans.map((p) => {
          const current = p.id === plan.id;
          return (
            <Card
              key={p.id}
              className={cn(
                "relative flex flex-col p-6 transition-shadow",
                p.id === "growth" && "border-neutral-950 shadow-[0_2px_4px_rgba(20,18,15,0.06),0_24px_48px_-20px_rgba(20,18,15,0.25)]"
              )}
            >
              {p.id === "growth" && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-neutral-950 px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white">
                  Most popular
                </span>
              )}
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{p.name}</p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-[36px] font-semibold leading-none tracking-[-0.03em] text-neutral-950">
                  ${p.price}
                </span>
                <span className="text-[12px] font-medium text-neutral-400">/month</span>
              </div>
              <ul className="mt-5 space-y-2 border-t border-black/[0.05] pt-5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12.5px] text-neutral-600">
                    <Check className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", current ? "text-neutral-950" : "text-neutral-400")} strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <Button
                  variant={p.id === "growth" ? "primary" : "secondary"}
                  className="w-full"
                  disabled={current}
                  onClick={() => changePlan(p)}
                >
                  {current ? "Current plan" : p.id === "free" ? "Downgrade" : sub.plan !== "free" && PLANS[sub.plan].price > p.price ? "Switch to " + p.name : `Upgrade to ${p.name}`}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* History */}
      <Card className="overflow-hidden">
        <div className="border-b border-black/[0.05] px-5 py-4">
          <p className="font-display text-[14.5px] font-semibold text-neutral-950">Billing activity</p>
          <p className="mt-0.5 text-[11.5px] text-neutral-400">
            Subscription events synchronised from payment webhooks.
          </p>
        </div>
        {events.length === 0 ? (
          <p className="px-5 py-8 text-center text-[12.5px] text-neutral-400">
            No billing activity yet.
          </p>
        ) : (
          <div className="divide-y divide-black/[0.04]">
            {events.slice(0, 10).map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                <Badge tone={e.type === "payment_failed" ? "red" : e.type === "canceled" || e.type === "downgraded" ? "amber" : "green"}>
                  {e.type}
                </Badge>
                <p className="min-w-0 flex-1 truncate text-[12.5px] text-neutral-600">{e.meta}</p>
                <p className="shrink-0 text-[11px] text-neutral-400">
                  {new Date(e.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="px-1 text-center text-[11.5px] text-neutral-400">
        Payments are processed by Razorpay in USD. Webhook events are verified and treated as the
        only source of truth — browser redirects are never trusted.
      </p>

      <CheckoutModal
        open={!!checkoutPlan}
        onClose={() => setCheckoutPlan(null)}
        plan={checkoutPlan}
        onDone={() => setCheckoutPlan(null)}
      />

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel subscription">
        <div className="flex items-start gap-3">
          <X className="mt-0.5 h-4 w-4 text-neutral-400" />
          <p className="text-[13.5px] leading-relaxed text-neutral-600">
            Your {plan.name} access continues until{" "}
            <span className="font-semibold text-neutral-900">{sub.current_period_end?.slice(0, 10)}</span>,
            then your account moves to Free (100 leads/month). Your leads and campaigns are never deleted.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmCancel(false)}>Keep {plan.name}</Button>
          <Button
            variant="danger"
            onClick={async () => {
              try {
                await api("/api/billing/cancel", { body: {} });
                await syncFromServer(true);
                toast("Subscription canceled at period end", "info");
              } catch (e) {
                toast(e instanceof Error ? e.message : "Cancellation failed.", "error");
              }
              setConfirmCancel(false);
            }}
          >
            Cancel subscription
          </Button>
        </div>
      </Modal>
    </div>
  );
}
