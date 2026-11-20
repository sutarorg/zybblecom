import type {
  WorkspaceAdapter,
  WorkspaceError,
  CreditQuote,
} from "./workspace-contracts";
import { serviceMessage } from "@/lib/services/messages";

type Operation = Exclude<keyof WorkspaceAdapter, "subscribe">;
type Payload<K extends Operation> = Awaited<ReturnType<WorkspaceAdapter[K]>>;
export function createWorkspaceServices(
  adapter: Partial<WorkspaceAdapter> = {},
) {
  return {
    async run<K extends Operation>(
      operation: K,
      ...args: Parameters<WorkspaceAdapter[K]>
    ): Promise<Payload<K> | { ok: false; error: "unavailable" | "network" }> {
      const method = adapter[operation] as
        | ((...input: Parameters<WorkspaceAdapter[K]>) => Promise<Payload<K>>)
        | undefined;
      if (!method) return { ok: false, error: "unavailable" };
      try {
        return await method(...args);
      } catch {
        return { ok: false, error: "network" };
      }
    },
    subscribe: adapter.subscribe,
  };
}
/** Session 5 installs a server adapter scoped to verified cookies, and a separate same-origin client adapter. */
export const workspace = createWorkspaceServices();
export function workspaceMessage(error: WorkspaceError) {
  if (error === "unavailable")
    return "This workspace service isn’t connected yet. No changes were made.";
  if (error === "not_found")
    return "This item doesn’t exist or isn’t available to this account.";
  if (error === "insufficient_credits")
    return "Your available credits don’t cover this request. Review your balance before continuing.";
  if (error === "conflict")
    return "This changed while you were working. Refresh and try again.";
  if (error === "cancelled") return "The operation was cancelled.";
  return serviceMessage(error);
}
export function quoteState(quote: CreditQuote | null, now = Date.now()) {
  if (
    !quote ||
    !Number.isFinite(Date.parse(quote.expiresAt)) ||
    Date.parse(quote.expiresAt) <= now ||
    !Number.isFinite(quote.required) ||
    !Number.isFinite(quote.available) ||
    quote.required <= 0 ||
    quote.available < 0
  )
    return "unverified";
  return quote.available < quote.required ? "insufficient" : "ready";
}
