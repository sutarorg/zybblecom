"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Lock, ShieldCheck, X } from "lucide-react";
import { Button, Spinner, buttonClasses } from "@/components/ui";
import { formatINR } from "@/lib/money";
import Script from "next/script";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

type CheckoutStarted = {
  orderId: string;
  keyId: string | null;
  testMode: boolean;
  amountPaise: number;
  currency: string;
  courseTitle: string;
  courseId: string;
  prefill: { name: string; email: string };
};

export function BuyButton({
  courseId,
  pricePaise,
  loggedIn,
  loginNext,
  className,
}: {
  courseId: string;
  pricePaise: number;
  loggedIn: boolean;
  loginNext: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sim, setSim] = useState<CheckoutStarted | null>(null);
  const [rzpReady, setRzpReady] = useState(false);

  async function begin() {
    setError(null);
    if (!loggedIn) {
      router.push(`/auth?next=${encodeURIComponent(loginNext)}`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "auth_required") {
          router.push(`/auth?next=${encodeURIComponent(loginNext)}`);
          return;
        }
        if (data.error === "already_owned") {
          router.refresh();
          setError("You already own this course.");
          return;
        }
        setError(data.error ?? "Could not start checkout.");
        return;
      }
      if (data.free) {
        router.push(`/learn/${data.courseId}?welcome=1`);
        router.refresh();
        return;
      }
      if (data.testMode) {
        setSim(data as CheckoutStarted);
        return;
      }
      openRazorpay(data as CheckoutStarted);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  function openRazorpay(order: CheckoutStarted) {
    if (!window.Razorpay) {
      setError("Payment gateway still loading — try again in a second.");
      return;
    }
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amountPaise,
      currency: order.currency,
      name: "Zybble",
      description: order.courseTitle,
      order_id: order.orderId,
      prefill: order.prefill,
      theme: { color: "#5b3df5" },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        setBusy(true);
        const res = await fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          }),
        });
        const data = await res.json();
        setBusy(false);
        if (res.ok && data.ok) {
          router.push(`/learn/${data.courseId}?welcome=1`);
          router.refresh();
        } else {
          setError(data.error ?? "Payment verification failed. Contact support with your payment ID.");
        }
      },
    });
    rzp.open();
  }

  async function finishSim(outcome: "success" | "failure") {
    if (!sim) return;
    setBusy(true);
    const res = await fetch("/api/checkout/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: sim.orderId, outcome }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok && data.ok) {
      setSim(null);
      router.push(`/learn/${data.courseId}?welcome=1`);
      router.refresh();
    } else {
      setSim(null);
      setError(data.error ?? "Payment failed.");
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRzpReady(true)}
        strategy="lazyOnload"
      />
      <div className={className}>
        <Button variant="brand" size="lg" onClick={begin} disabled={busy} className="w-full">
          {busy ? (
            <Spinner />
          ) : pricePaise === 0 ? (
            <>Get free access</>
          ) : (
            <>
              <Lock className="size-4" /> Buy for {formatINR(pricePaise)}
            </>
          )}
        </Button>
        {error && (
          <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-center text-[13px] font-medium text-red-700">
            {error}
          </p>
        )}
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-ink-soft">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          Secure checkout via Razorpay · instant access
        </p>
      </div>

      {/* Test-mode gateway modal (only when Razorpay keys are not configured) */}
      {sim && (
        <div className="fixed inset-0 z-[60] grid place-items-end bg-ink/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-line bg-ink px-5 py-4 text-paper">
              <div>
                <p className="font-display text-sm font-bold">Zybble Test Checkout</p>
                <p className="text-[11px] text-paper/60">No real money moves in test mode</p>
              </div>
              <button
                onClick={() => setSim(null)}
                className="grid size-8 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold leading-snug">{sim.courseTitle}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{sim.orderId}</p>
                </div>
                <p className="font-display text-xl font-bold">{formatINR(sim.amountPaise)}</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="size-4" /> Razorpay keys not configured — simulated gateway.
              </div>
              <div className="grid gap-2">
                <button
                  onClick={() => finishSim("success")}
                  disabled={busy}
                  className={buttonClasses("brand", "lg") + " w-full"}
                >
                  {busy ? <Spinner /> : <>Pay {formatINR(sim.amountPaise)} (test)</>}
                </button>
                <button
                  onClick={() => finishSim("failure")}
                  disabled={busy}
                  className={buttonClasses("ghost", "sm") + " w-full text-red-600"}
                >
                  Simulate failed payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
