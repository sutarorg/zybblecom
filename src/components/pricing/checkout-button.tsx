"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

export function CheckoutButton({
  packId,
  label = "Continue to test checkout",
  enabled = true,
  variant = "primary",
}: {
  packId: string;
  label?: string;
  enabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const hint = useId();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function checkout() {
    if (busy.current || !enabled) return;
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
          "Test checkout isn’t available for this pack right now. Please try again later.",
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
      const url = new URL(payload.data.checkoutUrl);
      if (
        url.origin !== "https://test.checkout.dodopayments.com" ||
        url.username ||
        url.password ||
        !url.pathname.startsWith("/session/")
      )
        throw new Error();
      window.location.assign(url.href);
      leaving = true;
    } catch {
      setMessage(
        "Couldn’t open test checkout. Check purchase history if you already submitted a payment.",
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
        disabled={!enabled || pending}
        aria-describedby={!enabled ? hint : undefined}
        onClick={checkout}
      >
        {pending ? "Opening checkout…" : label}
      </button>
      {!enabled && <p id={hint}>Checkout isn’t available for this pack.</p>}
      {message && <p role="alert">{message}</p>}
    </>
  );
}
