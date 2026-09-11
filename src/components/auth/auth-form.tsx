"use client";

import { AlertCircle, Eye, EyeOff, GraduationCap, Loader2, Lock, Mail, Store, User } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, signupAction, type AuthState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

/* ------------------------------ Google button ------------------------------- */

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4", className)} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96Z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  next,
  withRole = false,
}: {
  next?: string;
  withRole?: boolean;
}) {
  const [pending, setPending] = useState(false);

  const start = () => {
    if (pending) return;
    setPending(true);
    const params = new URLSearchParams();
    if (next) params.set("next", next);
    params.set(
      "from",
      window.location.pathname.startsWith("/signup") ? "signup" : "login",
    );
    if (withRole) {
      const checked = document.querySelector<HTMLInputElement>('input[name="role"]:checked');
      if (checked && (checked.value === "creator" || checked.value === "buyer")) {
        params.set("role", checked.value);
      }
    }
    const qs = params.toString();
    window.location.href = `/api/auth/google${qs ? `?${qs}` : ""}`;
  };

  return (
    <button
      type="button"
      onClick={start}
      disabled={pending}
      className="btn btn-outline btn-md w-full bg-white"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <GoogleMark />}
      {pending ? "Opening Google…" : "Continue with Google"}
    </button>
  );
}

/* --------------------------------- helpers ---------------------------------- */

const OAUTH_ERRORS: Record<string, string> = {
  "oauth-config":
    "Google sign-in isn't configured on this deployment yet. Use email and password for now.",
  state: "That sign-in attempt expired. Please try again.",
  email: "Google didn't share a verified email for that account. Try another Google account.",
  google: "Google sign-in didn't complete. Please try again.",
};

function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-rose/25 bg-rose-soft px-4 py-3 text-[13.5px] font-medium text-rose">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-line" />
      <span className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-mut">
        or with email
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function passwordAutoComplete(create: boolean) {
  return create ? "new-password" : "current-password";
}

function PasswordInput({ create = false }: { create?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor="password" className="label">
        {create ? "Create password" : "Password"}
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-mut" />
        <input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          required
          minLength={8}
          autoComplete={passwordAutoComplete(create)}
          placeholder="At least 8 characters"
          className="input pl-10 pr-11"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-mut transition-colors hover:text-ink"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- login form -------------------------------- */

export function LoginForm({
  next,
  error,
}: {
  next?: string;
  error?: string;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, {});

  return (
    <div className="space-y-5">
      <GoogleAuthButton next={next} />
      <Divider />

      <form action={action} className="space-y-5">
        <input type="hidden" name="next" value={next ?? ""} />
        <div>
          <label htmlFor="email" className="label">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-mut" />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="input pl-10"
            />
          </div>
        </div>
        <PasswordInput />
        <ErrorNote message={state.error ?? (error ? OAUTH_ERRORS[error] : undefined)} />
        <button type="submit" disabled={pending} className="btn btn-ink btn-md w-full">
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-center text-[13.5px] text-mut">
        New to Zybble?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="font-semibold text-grape-deep hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

/* -------------------------------- signup form -------------------------------- */

export function SignupForm({
  next,
  error,
}: {
  next?: string;
  error?: string;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signupAction, {});

  return (
    <div className="space-y-5">
      <GoogleAuthButton next={next} withRole />
      <Divider />

      <form action={action} className="space-y-5">
        <input type="hidden" name="next" value={next ?? ""} />

        <fieldset>
          <legend className="label">I want to…</legend>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <input
                type="radio"
                id="role-creator"
                name="role"
                value="creator"
                defaultChecked
                className="peer sr-only"
              />
              <label
                htmlFor="role-creator"
                className={cn(
                  "flex h-full cursor-pointer flex-col gap-1.5 rounded-2xl border border-line bg-white p-4 transition-all",
                  "peer-checked:border-grape peer-checked:bg-grape-soft peer-checked:ring-4 peer-checked:ring-grape/10",
                )}
              >
                <Store className="size-5 text-grape" />
                <span className="text-[14px] font-semibold">Sell courses</span>
                <span className="text-[12px] leading-snug text-mut">I teach and want my own link</span>
              </label>
            </div>
            <div>
              <input
                type="radio"
                id="role-buyer"
                name="role"
                value="buyer"
                className="peer sr-only"
              />
              <label
                htmlFor="role-buyer"
                className={cn(
                  "flex h-full cursor-pointer flex-col gap-1.5 rounded-2xl border border-line bg-white p-4 transition-all",
                  "peer-checked:border-grape peer-checked:bg-grape-soft peer-checked:ring-4 peer-checked:ring-grape/10",
                )}
              >
                <GraduationCap className="size-5 text-grape" />
                <span className="text-[14px] font-semibold">Learn</span>
                <span className="text-[12px] leading-snug text-mut">I have a course link from a creator</span>
              </label>
            </div>
          </div>
        </fieldset>

        <div>
          <label htmlFor="name" className="label">Full name</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-mut" />
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              autoComplete="name"
              placeholder="Maya Rao"
              className="input pl-10"
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-mut" />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="input pl-10"
            />
          </div>
        </div>
        <PasswordInput create />
        <ErrorNote message={state.error ?? (error ? OAUTH_ERRORS[error] : undefined)} />
        <button type="submit" disabled={pending} className="btn btn-accent btn-md w-full">
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Creating your account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-[13.5px] text-mut">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-semibold text-grape-deep hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
