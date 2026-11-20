"use client";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck, X } from "lucide-react";
import type { AdminIntent, PreparedAction } from "@/services/admin/contracts";
import { command } from "@/services/admin/client";
import {
  canConfirm,
  errorCopy,
  validAmount,
  validReason,
} from "@/services/admin/service";
import { money, num } from "@/services/admin/format";
export type ActionTarget =
  | { kind: Exclude<AdminIntent["kind"], "update_settings">; id: string }
  | Extract<AdminIntent, { kind: "update_settings" }>;
export function ActionDialog({
  title,
  trigger,
  description,
  target,
  children,
}: {
  title: string;
  trigger?: string;
  description: string;
  target?: ActionTarget;
  children?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [prepared, setPrepared] = useState<{
    intent: AdminIntent;
    result: PreparedAction;
    requestKey: string;
  }>();
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !target || prepared) return;
    const f = new FormData(event.currentTarget);
    const reason = String(f.get("reason") ?? "").trim();
    const amount = Number(f.get("amount"));
    const note = String(f.get("note") ?? "").trim();
    if (!validReason(reason)) {
      setMessage("Enter a reason between 8 and 500 characters.");
      return;
    }
    let intent: AdminIntent;
    if (target.kind === "add_credits" || target.kind === "deduct_credits") {
      if (!validAmount(amount)) {
        setMessage("Enter a positive whole number of credits.");
        return;
      }
      intent = { kind: target.kind, id: target.id, amount };
    } else if (target.kind === "internal_note") {
      if (note.length < 1 || note.length > 1000) {
        setMessage("Enter a note of up to 1,000 characters.");
        return;
      }
      intent = { kind: target.kind, id: target.id, note };
    } else if (target.kind === "update_settings") intent = target;
    else intent = { kind: target.kind, id: target.id };
    setBusy(true);
    setMessage("");
    const result = await command("prepare", { intent, reason });
    setBusy(false);
    if (!result.ok) {
      setMessage(errorCopy[result.error]);
      return;
    }
    if (!canConfirm(intent, result.value)) {
      setMessage(
        "A complete, current server confirmation is required. No change was made.",
      );
      return;
    }
    setPrepared({
      intent,
      result: result.value,
      requestKey: crypto.randomUUID(),
    });
    requestAnimationFrame(() => confirmRef.current?.focus());
  }
  async function execute() {
    if (!prepared || busy) return;
    if (!canConfirm(prepared.intent, prepared.result)) {
      setMessage(
        uncertain
          ? "The confirmation expired before an outcome was verified. Refresh and check the audit log before retrying."
          : "The confirmation expired. Review the latest state before trying again.",
      );
      if (!uncertain) setPrepared(undefined);
      return;
    }
    setBusy(true);
    setMessage("");
    const r = await command("execute", {
      preparedId: prepared.result.id,
      requestKey: prepared.requestKey,
    });
    setBusy(false);
    if (!r.ok) {
      setUncertain(r.error === "network" || r.error === "unexpected");
      setMessage(
        r.error === "network" || r.error === "unexpected"
          ? "The result is unknown. Retry this confirmation to check the same request, or review the audit log before trying again."
          : errorCopy[r.error],
      );
      if (r.error === "conflict") setPrepared(undefined);
      return;
    }
    setUncertain(false);
    setPrepared(undefined);
    setNotice(
      r.value.status === "queued"
        ? `Operation queued. Audit reference: ${r.value.auditId}`
        : `Operation applied. Audit reference: ${r.value.auditId}`,
    );
    dialog.current?.close();
    router.refresh();
  }
  return (
    <div className="ad-action">
      <button
        type="button"
        className="ad-button"
        onClick={() => {
          if (!uncertain) {
            setPrepared(undefined);
            setMessage("");
            formRef.current?.reset();
          }
          dialog.current?.showModal();
        }}
      >
        {trigger ?? title}
      </button>
      {notice && <p role="status">{notice}</p>}
      <dialog
        ref={dialog}
        className="ad-confirm"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <div className="ad-dialog-inner">
          <div className="ad-dialog-top">
            <span className="ad-state-icon">
              {target ? (
                <ShieldCheck size={21} aria-hidden="true" />
              ) : (
                <LockKeyhole size={21} aria-hidden="true" />
              )}
            </span>
            <button
              type="button"
              aria-label="Close dialog"
              className="ad-icon"
              disabled={busy}
              onClick={() => dialog.current?.close()}
            >
              <X size={19} />
            </button>
          </div>
          <h2 id={titleId}>{title}</h2>
          <p id={descId}>{description}</p>
          {children}
          {target && (
            <form
              ref={formRef}
              className="ad-form"
              onSubmit={prepare}
              hidden={!!prepared}
            >
              {(target.kind === "add_credits" ||
                target.kind === "deduct_credits") && (
                <label>
                  Amount in credits
                  <input
                    type="number"
                    name="amount"
                    min="1"
                    step="1"
                    required
                    disabled={busy}
                  />
                </label>
              )}
              {target.kind === "internal_note" && (
                <label>
                  Internal note
                  <textarea
                    name="note"
                    rows={3}
                    maxLength={1000}
                    required
                    disabled={busy}
                  />
                </label>
              )}
              <label>
                Reason
                <textarea
                  name="reason"
                  rows={3}
                  minLength={8}
                  maxLength={500}
                  placeholder="Explain why this operation is necessary"
                  required
                  disabled={busy}
                />
              </label>
              <div className="ad-inline">
                <button
                  type="submit"
                  className="ad-button ad-primary"
                  disabled={busy}
                >
                  {busy ? "Checking eligibility…" : "Review change"}
                </button>
                <button
                  type="button"
                  className="ad-button"
                  disabled={busy}
                  onClick={() => dialog.current?.close()}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          {prepared && (
            <div className="ad-confirm-review">
              <strong>{prepared.result.targetLabel}</strong>
              <p>{prepared.result.summary}</p>
              {prepared.result.balance && (
                <p>
                  Previous: {num(prepared.result.balance.previous)} · Change:{" "}
                  {prepared.result.balance.delta > 0 ? "+" : ""}
                  {num(prepared.result.balance.delta)} · New:{" "}
                  {num(prepared.result.balance.next)} credits
                </p>
              )}
              {prepared.result.reprocessing && (
                <>
                  <p>
                    Credit consequences:{" "}
                    {prepared.result.reprocessing.creditImpact}
                  </p>
                  <p>
                    Estimated provider cost:{" "}
                    {money(prepared.result.reprocessing.providerCost)}
                  </p>
                </>
              )}
              <div className="ad-inline">
                <button
                  ref={confirmRef}
                  type="button"
                  className="ad-button ad-primary"
                  disabled={busy}
                  onClick={execute}
                >
                  {busy
                    ? "Submitting…"
                    : uncertain
                      ? "Check same request"
                      : "Confirm and submit"}
                </button>
                {!uncertain && (
                  <button
                    type="button"
                    className="ad-button"
                    disabled={busy}
                    onClick={() => setPrepared(undefined)}
                  >
                    Back to reason
                  </button>
                )}
              </div>
            </div>
          )}
          {!target && (
            <button
              type="button"
              className="ad-button ad-primary"
              onClick={() => dialog.current?.close()}
            >
              Close
            </button>
          )}
          {message && (
            <p className="ad-command-error" role="alert">
              {message}
            </p>
          )}
        </div>
      </dialog>
    </div>
  );
}
