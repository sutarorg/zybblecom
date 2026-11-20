"use client";
import { useCallback, useSyncExternalStore } from "react";
import { quoteState } from "@/services/workspace";
import type { CreditQuote } from "@/services/workspace-contracts";

const serverSnapshot = () => "unverified" as const;
export function useCreditQuote(quote: CreditQuote | null) {
  const expires = quote ? Date.parse(quote.expiresAt) : NaN;
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!Number.isFinite(expires)) return () => {};
      let timer: ReturnType<typeof setTimeout> | undefined;
      const watch = () => {
        clearTimeout(timer);
        const remaining = expires - Date.now();
        if (remaining > 0)
          timer = setTimeout(watch, Math.min(remaining, 2_147_000_000));
        notify();
      };
      watch();
      window.addEventListener("focus", watch);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("focus", watch);
      };
    },
    [expires],
  );
  return useSyncExternalStore(
    subscribe,
    () => quoteState(quote),
    serverSnapshot,
  );
}
