"use client";

import { useActionState, useState } from "react";
import { login, signup, type AuthState } from "@/lib/actions/auth";
import { Button, Spinner, inputClasses, labelClasses } from "@/components/ui";
import { cx } from "@/lib/utils";

const GOOGLE_ERRORS: Record<string, string> = {
  google_not_configured:
    "Google sign-in isn't configured on this deployment yet — add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the environment (see README).",
  google_denied: "Google sign-in was cancelled.",
  google_state: "Your sign-in session expired — please try again.",
  google_token: "Couldn't complete Google sign-in — please try again.",
  google_verify: "We couldn't verify your Google account — please try again.",
};

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  );
}

export function AuthForm({
  initialMode,
  next,
  error: queryError,
}: {
  initialMode: "login" | "signup";
  next: string | null;
  error?: string | null;
}) {
  const [mode, setMode] = useState(initialMode);
  const action = mode === "signup" ? signup : login;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null);
  const shownError = state?.error ?? (queryError ? GOOGLE_ERRORS[queryError] ?? queryError : null);

  return (
    <div>
      <a
        href={`/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`}
        className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-line bg-white text-sm font-semibold text-ink transition hover:border-ink/35 hover:bg-cream/60 active:scale-[0.98]"
      >
        <GoogleGlyph />
        Continue with Google
      </a>

      <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-ink-soft/70">
        <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
      </div>

      <div className="mb-5 grid grid-cols-2 rounded-full bg-cream p-1 text-sm font-semibold">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cx(
              "h-9 rounded-full transition",
              mode === m ? "bg-white shadow-sm" : "text-ink-soft hover:text-ink",
            )}
          >
            {m === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        {mode === "signup" && (
          <div>
            <label className={labelClasses} htmlFor="name">Full name</label>
            <input id="name" name="name" autoComplete="name" required className={inputClasses} placeholder="Asha Kumar" />
          </div>
        )}
        <div>
          <label className={labelClasses} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className={inputClasses} placeholder="you@example.com" />
        </div>
        <div>
          <label className={labelClasses} htmlFor="password">
            Password {mode === "signup" && <span className="font-normal">(min 8 characters)</span>}
          </label>
          <input id="password" name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required className={inputClasses} placeholder="••••••••" />
        </div>

        {shownError && (
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
            {shownError}
          </p>
        )}

        <Button variant="brand" size="lg" type="submit" disabled={pending} className="w-full">
          {pending ? <Spinner /> : mode === "signup" ? "Create account — start selling" : "Log in"}
        </Button>
      </form>
    </div>
  );
}
