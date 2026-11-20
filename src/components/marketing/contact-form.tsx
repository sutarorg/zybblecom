"use client";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowRight, Check, CircleAlert } from "lucide-react";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

type Result = "idle" | "sending" | "sent" | "error";
export function ContactForm({ connected }: { connected: boolean }) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const [result, setResult] = useState<Result>("idle");
  const busy = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const announce = (next: Result) => {
    setResult(next);
    requestAnimationFrame(() => resultRef.current?.focus());
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    if (!connected) {
      announce("error");
      return;
    }
    busy.current = true;
    setResult("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const result = await response.json();
      if (
        !response.ok ||
        result.success !== true ||
        result.data?.accepted !== true
      )
        throw new Error("Submission failed");
      form.reset();
      announce("sent");
    } catch {
      announce("error");
    } finally {
      busy.current = false;
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
      <h2>Send a message</h2>
      <p id="contact-instructions">
        {connected
          ? "All fields are required. Please don’t include passwords or payment details."
          : "Message delivery isn’t available right now. Nothing will be sent or saved."}
      </p>
      <div hidden>
        <label htmlFor="contact-website">Leave this blank</label>
        <input
          id="contact-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
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
        {result === "sending" ? "Sending…" : "Submit Message"}
        <ArrowRight size={17} aria-hidden="true" />
      </button>
      <noscript>
        <p>Enable JavaScript to send a message.</p>
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
        {result === "sent" && (
          <>
            <Check size={18} aria-hidden="true" />
            Your message has been sent successfully. Thank you for contacting
            Zybble.
          </>
        )}
        {result === "error" && (
          <>
            <CircleAlert size={18} aria-hidden="true" />
            Your message could not be sent. Please try again.
          </>
        )}
      </div>
    </form>
  );
}
