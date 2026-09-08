"use client";

import { useActionState, useState } from "react";
import { login, signup, type AuthState } from "@/lib/actions/auth";
import { Button, Spinner, inputClasses, labelClasses } from "@/components/ui";
import { cx } from "@/lib/utils";

export function AuthForm({
  initialMode,
  next,
}: {
  initialMode: "login" | "signup";
  next: string | null;
}) {
  const [mode, setMode] = useState(initialMode);
  const action = mode === "signup" ? signup : login;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null);

  return (
    <div>
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

        {state?.error && (
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
            {state.error}
          </p>
        )}

        <Button variant="brand" size="lg" type="submit" disabled={pending} className="w-full">
          {pending ? <Spinner /> : mode === "signup" ? "Create account — start selling" : "Log in"}
        </Button>
      </form>
    </div>
  );
}
