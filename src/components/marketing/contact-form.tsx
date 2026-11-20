"use client";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowRight, Check, CircleAlert } from "lucide-react";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

type Result = "idle" | "reviewed" | "sending" | "sent" | "error";
export function ContactForm({ endpoint }: { endpoint?: string }) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const [result, setResult] = useState<Result>("idle");
  const resultRef = useRef<HTMLDivElement>(null);
  const announce = (next: Result) => {
    setResult(next);
    requestAnimationFrame(() => resultRef.current?.focus());
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    if (!endpoint) {
      announce("reviewed");
      return;
    }
    setResult("sending");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!response.ok) throw new Error("Submission failed");
      form.reset();
      announce("sent");
    } catch {
      announce("error");
    }
  }
  return (
    <form
      className="card contact-form"
      method="post"
      onSubmit={submit}
      onInput={() => {
        if (result !== "idle" && result !== "sending") setResult("idle");
      }}
    >
      <h2>{endpoint ? "Send a message" : "Prepare a message"}</h2>
      <p id="contact-instructions">
        {endpoint
          ? "All fields are required. Please don’t include passwords or payment details."
          : "Message delivery isn’t available yet. You can check your draft here; nothing is sent or saved."}
      </p>
      <div className="form-fields">
        <label htmlFor="contact-name">
          Name <span>(required)</span>
        </label>
        <input
          id="contact-name"
          name="name"
          autoComplete="name"
          maxLength={100}
          required
          pattern=".*\S.*"
        />
        <label htmlFor="contact-email">
          Email <span>(required)</span>
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
        />
        <label htmlFor="contact-topic">
          Topic <span>(required)</span>
        </label>
        <select id="contact-topic" name="topic" required defaultValue="">
          <option value="" disabled>
            Choose a topic
          </option>
          <option>Product question</option>
          <option>Credits and pricing</option>
          <option>Something else</option>
        </select>
        <label htmlFor="contact-message">
          Message <span>(required)</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          minLength={10}
          maxLength={2000}
          required
          aria-describedby="contact-length"
          onInput={(event) => {
            const field = event.currentTarget;
            field.setCustomValidity(
              field.value && field.value.trim().length < 10
                ? "Enter at least 10 characters, not counting spaces at the beginning or end."
                : "",
            );
          }}
        />
        <small id="contact-length">
          10–2,000 characters. Don’t include private account or payment
          information.
        </small>
      </div>
      <button
        className="button button-primary"
        disabled={!ready || result === "sending"}
        type="submit"
        aria-describedby="contact-instructions"
      >
        {result === "sending"
          ? "Sending…"
          : endpoint
            ? "Send message"
            : "Check my draft"}
        <ArrowRight size={17} aria-hidden="true" />
      </button>
      <noscript>
        <p>Enable JavaScript to check this form.</p>
      </noscript>
      <div
        ref={resultRef}
        tabIndex={-1}
        role="status"
        className={
          result === "idle" || result === "sending"
            ? ""
            : `notice ${result === "error" ? "notice-error" : ""}`
        }
      >
        {result === "reviewed" && (
          <>
            <Check size={18} aria-hidden="true" />
            Your draft passed validation. No message was sent.
          </>
        )}
        {result === "sent" && (
          <>
            <Check size={18} aria-hidden="true" />
            Your message was sent.
          </>
        )}
        {result === "error" && (
          <>
            <CircleAlert size={18} aria-hidden="true" />
            Your message wasn’t sent. Your draft is still here; please try
            again.
          </>
        )}
      </div>
    </form>
  );
}
