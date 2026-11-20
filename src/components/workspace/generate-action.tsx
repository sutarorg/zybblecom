"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreditQuote } from "@/hooks/use-credit-quote";
import { Action } from "@/components/ui/primitives";
import { PendingButton } from "@/components/system/loading";
import {
  quoteContext,
  quoteState,
  workspace,
  workspaceMessage,
} from "@/services/workspace";
import type { CreditQuote } from "@/services/workspace-contracts";
import type { GenerationParams } from "@/services/generation-schema";
export function GenerateAction({
  projectId,
  settings,
  retryJobId,
}: {
  projectId: string;
  settings: GenerationParams;
  retryJobId: string;
}) {
  const [savedQuote, setQuote] = useState<{
    value: CreditQuote;
    context: string;
  } | null>(null);
  const context = quoteContext(projectId, settings);
  const quote =
    context && savedQuote?.context === `${context}:${retryJobId}`
      ? savedQuote.value
      : null;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [accepted, setAccepted] = useState(false);
  const key = useRef<{ quote: string; key: string }>(null);
  const router = useRouter();
  async function check() {
    if (pending || accepted || !context) return;
    setPending(true);
    setMessage("");
    const result = await workspace.run("quoteGeneration", {
      projectId,
      settings,
      retryJobId,
    });
    setPending(false);
    if (result.ok)
      setQuote({ value: result.value, context: `${context}:${retryJobId}` });
    else {
      setQuote(null);
      setMessage(workspaceMessage(result.error));
    }
  }
  async function start() {
    if (pending || accepted || !quote || quoteState(quote) !== "ready") {
      setMessage("Check for a current quote before retrying.");
      return;
    }
    setPending(true);
    setMessage("");
    if (key.current?.quote !== quote.id)
      key.current = { quote: quote.id, key: crypto.randomUUID() };
    const result = await workspace.run("startGeneration", {
      projectId,
      settings,
      retryJobId,
      quoteId: quote.id,
      requestKey: key.current.key,
    });
    setPending(false);
    if (result.ok) {
      setAccepted(true);
      setMessage("Retry accepted. Refreshing verified project status…");
      router.refresh();
    } else {
      if (result.error !== "network") setQuote(null);
      setMessage(workspaceMessage(result.error));
    }
  }
  const state = useCreditQuote(quote);
  return (
    <div className="ws-retry">
      <PendingButton
        type="button"
        pending={pending}
        disabled={accepted}
        className="button-secondary"
        onClick={check}
      >
        {quote ? "Refresh retry quote" : "Check retry cost"}
      </PendingButton>
      {quote && (
        <>
          <p>
            Required: {quote.required} credits · Available: {quote.available}{" "}
            credits
          </p>
          {state === "insufficient" ? (
            <Action href="/credits#credit-packs">Buy Credits</Action>
          ) : state === "ready" ? (
            <PendingButton
              type="button"
              pending={pending}
              disabled={accepted}
              onClick={start}
            >
              Retry generation
            </PendingButton>
          ) : (
            <p>Check for a current quote.</p>
          )}
        </>
      )}
      {message && <p role={accepted ? "status" : "alert"}>{message}</p>}
    </div>
  );
}
