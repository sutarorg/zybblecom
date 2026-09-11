"use client";

import { Check, Loader2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSettlementAction, markSettlementPaidAction } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";

export function CreatePayoutButton({ creatorId }: { creatorId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (state === "pending") return;
    setState("pending");
    setError(null);
    const result = await createSettlementAction(creatorId);
    if (result.ok) {
      setState("done");
      router.refresh();
      setTimeout(() => setState("idle"), 2500);
    } else {
      setError(result.error);
      setState("idle");
    }
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={state !== "idle"}
        className={cn("btn btn-sm", state === "done" ? "bg-mint text-white" : "btn-ink")}
      >
        {state === "pending" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : state === "done" ? (
          <Check className="size-3.5" />
        ) : (
          <Wallet className="size-3.5" />
        )}
        {state === "done" ? "Created" : "Create payout"}
      </button>
      {error && <span className="max-w-[200px] text-right text-[11.5px] font-medium text-rose">{error}</span>}
    </span>
  );
}

export function MarkPaidButton({ settlementId }: { settlementId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (state === "pending") return;
    setState("pending");
    setError(null);
    const result = await markSettlementPaidAction(settlementId);
    if (result.ok) {
      setState("done");
      router.refresh();
    } else {
      setError(result.error);
      setState("idle");
    }
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={state !== "idle"}
        className={cn("btn btn-outline btn-sm", state === "done" && "border-mint/40 bg-mint-soft text-mint")}
      >
        {state === "pending" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Check className="size-3.5" />
        )}
        {state === "done" ? "Paid" : "Mark as paid"}
      </button>
      {error && <span className="max-w-[200px] text-right text-[11.5px] font-medium text-rose">{error}</span>}
    </span>
  );
}
