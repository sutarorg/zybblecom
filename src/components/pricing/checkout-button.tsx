"use client";

import { hostedCheckoutURL, type DodoMode } from "@/lib/payments/dodo-url";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function CheckoutButton({
  packId,
  mode,
  label = mode === "test_mode"
    ? "Continue to test checkout"
    : "Continue to checkout",
  variant = "primary",
}: {
  packId: string;
  mode: DodoMode;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function checkout() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setMessage("");
    let leaving = false;
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, requestKey: crypto.randomUUID() }),
        cache: "no-store",
      });
      if (response.status === 401) {
        router.replace(`/login?pack=${encodeURIComponent(packId)}`);
        leaving = true;
        return;
      }
      if (response.status === 429) {
        setMessage("Too many attempts. Please wait before trying again.");
        return;
      }
      if (response.status === 503) {
        setMessage(
          "Checkout isn’t available for this pack right now. Please try again later.",
        );
        return;
      }
      const payload = await response.json();
      if (
        !response.ok ||
        payload.success !== true ||
        typeof payload.data?.checkoutUrl !== "string"
      )
        throw new Error();
      const url = hostedCheckoutURL(payload.data.checkoutUrl, mode);
      if (!url) throw new Error();
      window.location.assign(url.href);
      leaving = true;
    } catch {
      setMessage(
        "Couldn’t open checkout. Check purchase history if you already submitted a payment.",
      );
    } finally {
      if (!leaving) {
        setPending(false);
        busy.current = false;
      }
    }
  }
  return (
    <>
      <button
        type="button"
        className={`button button-${variant}`}
        disabled={pending}
        onClick={checkout}
      >
        {pending ? "Opening checkout…" : label}
      </button>
      {message && <p role="alert">{message}</p>}
    </>
  );
}
