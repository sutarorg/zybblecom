"use client";
import { useEffect, useState } from "react";
import { quoteState } from "@/services/workspace";
import type { CreditQuote } from "@/services/workspace-contracts";
export function useCreditQuote(quote: CreditQuote | null) {
  const [checkedAt, setCheckedAt] = useState<number>(0);
  useEffect(() => {
    if (!quote) return;
    const expiresAt = Date.parse(quote.expiresAt);
    if (!Number.isFinite(expiresAt)) return;
    const check = () => setCheckedAt(Date.now());
    const timer = setTimeout(
      check,
      Math.max(0, Math.min(expiresAt - Date.now() + 20, 2_147_000_000)),
    );
    window.addEventListener("focus", check);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", check);
    };
  }, [quote]);
  return quoteState(quote, checkedAt);
}
