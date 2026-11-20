"use client";
import { useState } from "react";
import { PendingButton } from "@/components/system/loading";
import { workspace, workspaceMessage } from "@/services/workspace";
export function SupportForm({ connected }: { connected: boolean }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", error: false });
  return (
    <form
      className="ws-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!connected || busy) return;
        const form = e.currentTarget;
        const fields = new FormData(form);
        const subject = String(fields.get("subject") ?? "").trim();
        const message = String(fields.get("message") ?? "").trim();
        if (!subject || message.length < 10) {
          setStatus({
            text: "Enter a subject and a message of at least 10 characters.",
            error: true,
          });
          return;
        }
        setBusy(true);
        const result = await workspace.run("sendSupport", { subject, message });
        setBusy(false);
        if (result.ok) form.reset();
        setStatus(
          result.ok
            ? { text: "Support request received.", error: false }
            : { text: workspaceMessage(result.error), error: true },
        );
      }}
    >
      <div className="ws-field">
        <label htmlFor="support-subject">Subject</label>
        <input
          id="support-subject"
          name={connected ? "subject" : undefined}
          required
          maxLength={100}
          placeholder="What do you need help with?"
        />
      </div>
      <div className="ws-field">
        <label htmlFor="support-message">Message</label>
        <textarea
          id="support-message"
          name={connected ? "message" : undefined}
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder="Describe what happened and what you expected."
          aria-describedby="support-note"
        />
      </div>
      <p id="support-note">
        {connected
          ? "Don’t include passwords or payment card details."
          : "This form can’t send messages yet. Anything you enter stays on this page."}
      </p>
      <PendingButton
        type="submit"
        pending={busy}
        disabled={!connected}
        aria-describedby="support-note"
      >
        Send request
      </PendingButton>
      {status.text && (
        <p role={status.error ? "alert" : "status"}>{status.text}</p>
      )}
    </form>
  );
}
