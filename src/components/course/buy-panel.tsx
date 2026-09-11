"use client";

import { AlertCircle, BadgePercent, Check, Loader2, ShieldCheck, TicketPercent, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatINR, cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

let rzpLoader: Promise<boolean> | null = null;
function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  rzpLoader ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return rzpLoader;
}

type Applied = { code: string; gross: number; discount: number; net: number };

export function BuyPanel({
  slug,
  title,
  pricePaise,
}: {
  slug: string;
  title: string;
  pricePaise: number;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<Applied | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [busy, setBusy] = useState<"idle" | "creating" | "verifying">("idle");

  const payable = applied ? applied.net : pricePaise;

  async function applyCoupon() {
    if (!code.trim() || validating) return;
    setValidating(true);
    setError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, code }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string } & Partial<Applied>;
      if (!data.ok) {
        setError(data.error ?? "Invalid coupon.");
        setApplied(null);
      } else {
        setApplied({ code: data.code!, gross: data.gross!, discount: data.discount!, net: data.net! });
      }
    } catch {
      setError("Couldn't validate the coupon. Try again.");
    } finally {
      setValidating(false);
    }
  }

  function clearCoupon() {
    setApplied(null);
    setCode("");
    setError(null);
  }

  async function buy() {
    if (busy !== "idle") return;
    setError(null);
    setBusy("creating");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, coupon: applied?.code }),
      });
      const data = (await res.json()) as Record<string, unknown> & { error?: string };

      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/c/${slug}`)}`);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Couldn't start checkout. Please try again.");
        return;
      }

      if (data.kind === "free") {
        router.push(`/learn/${slug}?welcome=1`);
        router.refresh();
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setError("Couldn't load the secure checkout. Check your connection and try again.");
        return;
      }

      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Zybble",
        description: title,
        order_id: data.orderId,
        prefill: data.prefill,
        theme: { color: "#6D4CFF" },
        modal: {
          ondismiss: () => setBusy("idle"),
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setBusy("verifying");
          try {
            const verifyRes = await fetch("/api/checkout/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verifyData = (await verifyRes.json()) as { ok?: boolean; courseSlug?: string; error?: string };
            if (!verifyRes.ok || !verifyData.ok) {
              setError(verifyData.error ?? "Verification failed. If you were charged, contact support.");
              return;
            }
            router.push(`/learn/${verifyData.courseSlug}?welcome=1`);
            router.refresh();
          } catch {
            setError("Network error while verifying. If you were charged, contact support.");
          } finally {
            setBusy("idle");
          }
        },
      });
      razorpay.open();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy((b) => (b === "creating" ? "idle" : b));
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          {applied && applied.discount > 0 ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-[26px] font-bold tracking-tight tabular-nums">
                  {applied.net === 0 ? "Free" : formatINR(applied.net)}
                </span>
                <span className="text-[14px] text-mut line-through tabular-nums">
                  {formatINR(applied.gross)}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] font-medium text-mint">
                You save {formatINR(applied.discount)} with {applied.code}
              </p>
            </>
          ) : (
            <span className="text-[26px] font-bold tracking-tight tabular-nums">
              {pricePaise === 0 ? "Free" : formatINR(pricePaise)}
            </span>
          )}
        </div>
        <span className="badge badge-neutral">Lifetime access</span>
      </div>

      {pricePaise > 0 && (
        <div className="mt-5">
          {applied ? (
            <div className="flex items-center justify-between rounded-xl border border-mint/30 bg-mint-soft px-3.5 py-2.5">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-mint">
                <BadgePercent className="size-4" />
                {applied.code} applied
              </span>
              <button
                type="button"
                onClick={clearCoupon}
                aria-label="Remove coupon"
                className="rounded-md p-1 text-mint/70 transition-colors hover:text-mint"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <TicketPercent className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mut" />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCoupon())}
                  placeholder="Coupon code"
                  aria-label="Coupon code"
                  className="input h-10 pl-9 font-mono text-[13px] uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal"
                />
              </div>
              <button
                type="button"
                onClick={applyCoupon}
                disabled={validating || !code.trim()}
                className="btn btn-outline btn-sm h-10"
              >
                {validating ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-rose-soft px-3.5 py-2.5 text-[13px] font-medium text-rose">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={buy}
        disabled={busy !== "idle"}
        className={cn("btn btn-accent btn-lg mt-5 w-full", busy !== "idle" && "animate-pulse-ring")}
      >
        {busy === "creating" && <Loader2 className="size-4 animate-spin" />}
        {busy === "verifying" && <Loader2 className="size-4 animate-spin" />}
        {busy === "idle" && <Zap className="size-4" />}
        {busy === "creating"
          ? "Preparing checkout…"
          : busy === "verifying"
            ? "Confirming…"
            : payable === 0
              ? "Enroll for free"
              : `Enroll now — ${formatINR(payable)}`}
      </button>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-mut">
        <ShieldCheck className="size-3.5" /> Secure checkout · Instant access
      </p>

      {applied && (
        <p className="mt-2 flex items-center justify-center gap-1 text-[12px] text-mint">
          <Check className="size-3.5" /> Discount locked in at checkout
        </p>
      )}
    </div>
  );
}
