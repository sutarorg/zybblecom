"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { runSettlementNow } from "@/lib/actions/admin";
import type { SettlementSummary } from "@/lib/settlement";
import { Button, Spinner } from "@/components/ui";
import { formatINR } from "@/lib/money";

export function RunSettleButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<SettlementSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        variant="ink"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            try {
              const res = await runSettlementNow();
              setResult(res.summary ?? null);
            } catch {
              setError("Settlement run failed — check server logs.");
            }
          })
        }
      >
        {pending ? <Spinner /> : <Play className="size-3.5" />}
        {pending ? "Running…" : "Run settlement now"}
      </Button>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      {result && !pending && (
        <p className="mt-2 max-w-xs rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          Done — {result.processed} paid out ({formatINR(result.totalPaise)}), {result.failed}{" "}
          failed, {result.skipped} skipped.
        </p>
      )}
    </div>
  );
}
