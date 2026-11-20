"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  Info,
  MailCheck,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type FormEvent,
} from "react";
import { passwordPolicy } from "@/config/account";
import { accountDestination, frontendServices } from "@/lib/services";
import type { ServiceError, ServiceResult } from "@/lib/services/contracts";
import { serviceMessage } from "@/lib/services/messages";
import {
  fieldsByMode,
  readField,
  validateAuth,
  validNewPassword,
  type AuthField,
  type AuthMode,
  type FieldErrors,
} from "@/lib/services/validation";
import { PendingButton } from "@/components/system/loading";
import { Action } from "@/components/ui/primitives";

const subscribe = () => () => {};
const client = () => true;
const server = () => false;
const labels: Record<AuthMode, [string, string]> = {
  login: ["Log in", "Signing in…"],
  signup: ["Create account", "Creating account…"],
  forgot: ["Send reset link", "Requesting link…"],
  reset: ["Reset password", "Updating password…"],
  verify: ["Resend verification", "Requesting link…"],
};
const fieldLabels: Record<AuthField, string> = {
  fullName: "Full name",
  email: "Email address",
  password: "Password",
  confirmPassword: "Confirm password",
  terms: "Terms acknowledgement",
};

export function AuthForm({
  mode,
  connected = false,
  checkoutPack,
}: {
  mode: AuthMode;
  connected?: boolean;
  checkoutPack?: string;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, client, server);
  const [transitioning, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<ServiceError>();
  const [completed, setCompleted] = useState(false);
  const [passwordReady, setPasswordReady] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [wait, setWait] = useState(0);
  const id = useId();
  const dirty = useRef(new Set<AuthField>());
  const feedback = useRef<HTMLDivElement>(null);
  const pending = busy || transitioning;
  const newPassword = mode === "signup" || mode === "reset";
  useEffect(() => {
    if (!deadline) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setWait(remaining);
      if (!remaining) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);
  const cooldown = (seconds?: number) => {
    if (!seconds || !Number.isFinite(seconds)) return;
    const duration = Math.min(Math.ceil(seconds), 3600);
    if (duration <= 0) return;
    setWait(duration);
    setDeadline(Date.now() + duration * 1000);
  };
  const updateVisibleErrors = (
    form: HTMLFormElement,
    field: AuthField,
    force: boolean,
  ) => {
    if (force) dirty.current.add(field);
    if (!dirty.current.has(field) && !dirty.current.has("confirmPassword"))
      return;
    const next = validateAuth(mode, new FormData(form));
    setErrors((prev) => ({
      ...prev,
      ...(dirty.current.has(field) ? { [field]: next[field] } : {}),
      ...(field === "password" && dirty.current.has("confirmPassword")
        ? { confirmPassword: next.confirmPassword }
        : {}),
    }));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running.current || pending || wait || !hydrated) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const issues = validateAuth(mode, data);
    setErrors(issues);
    setNotice(undefined);
    const first = fieldsByMode[mode].find((field) => issues[field]);
    if (first) {
      fieldsByMode[mode].forEach((field) => dirty.current.add(field));
      requestAnimationFrame(() =>
        document.getElementById(`${id}-${first}`)?.focus(),
      );
      return;
    }
    if (!connected) {
      setNotice("unavailable");
      return;
    }
    running.current = true;
    setBusy(true);
    const email = () => readField(data, "email");
    const password = () => readField(data, "password");
    let navigating = false;
    try {
      let result: ServiceResult<unknown>;
      switch (mode) {
        case "login": {
          const login = await frontendServices.login({
            email: email(),
            password: password(),
          });
          if (login.ok) {
            form.reset();
            navigating = true;
            startTransition(() =>
              router.replace(
                checkoutPack
                  ? login.value.onboardingComplete
                    ? `/credits?pack=${checkoutPack}#credit-packs`
                    : `/onboarding?pack=${checkoutPack}`
                  : accountDestination(login.value.onboardingComplete),
              ),
            );
          }
          result = login;
          break;
        }
        case "signup":
          result = await frontendServices.signup({
            email: email(),
            password: password(),
            fullName: readField(data, "fullName"),
            termsAccepted: true,
          });
          break;
        case "forgot":
          result = await frontendServices.requestPasswordRecovery({
            email: email(),
          });
          break;
        case "reset":
          result = await frontendServices.resetPassword({
            password: password(),
          });
          break;
        case "verify": {
          const sent = await frontendServices.resendVerification({
            email: email(),
          });
          if (sent.ok) cooldown(sent.value.retryAfterSeconds);
          result = sent;
          break;
        }
      }
      if (!result.ok) {
        setNotice(result.error);
        cooldown(result.retryAfterSeconds);
      } else if (!navigating) {
        if (mode !== "verify") form.reset();
        setPasswordReady(false);
        setCompleted(true);
        requestAnimationFrame(() => feedback.current?.focus());
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  if (completed && mode !== "verify")
    return (
      <div
        ref={feedback}
        tabIndex={-1}
        className="account-confirm"
        role="status"
      >
        <MailCheck size={25} aria-hidden="true" />
        <h2>{mode === "reset" ? "Password updated" : "Check your email"}</h2>
        <p>
          {mode === "forgot"
            ? "If an account exists for that address, you’ll receive a reset link. Check your inbox and spam folder."
            : mode === "reset"
              ? "Sign in again using your new password."
              : "If verification is needed, check your inbox for a link to continue."}
        </p>
        <Action
          href={mode === "signup" ? "/verify-email" : "/login"}
          variant="secondary"
        >
          {mode === "signup" ? "Verification help" : "Back to log in"}
        </Action>
      </div>
    );

  return (
    <form
      method="post"
      noValidate
      onSubmit={submit}
      className="account-form"
      aria-busy={pending}
    >
      {!connected && (
        <p className="account-preview">
          <Info size={17} aria-hidden="true" /> Account services aren’t
          connected yet. Form details won’t be sent.
        </p>
      )}
      {notice && (
        <div className="notice notice-error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <p>
            {serviceMessage(notice)}{" "}
            {notice === "verification_required" && (
              <Link href="/verify-email">Get verification help</Link>
            )}
          </p>
        </div>
      )}
      {completed && mode === "verify" && (
        <div className="notice" role="status">
          If verification is needed, check your inbox for a new link.
        </div>
      )}
      <fieldset disabled={!hydrated || pending} className="account-fields">
        <legend className="sr-only">{labels[mode][0]} details</legend>
        {fieldsByMode[mode].map((field) => {
          const fieldId = `${id}-${field}`;
          const error = errors[field];
          const change = (form: HTMLFormElement | null) => {
            if (form) updateVisibleErrors(form, field, false);
            setNotice(undefined);
            if (mode === "verify") setCompleted(false);
          };
          const blur = (form: HTMLFormElement | null) => {
            if (form) updateVisibleErrors(form, field, true);
          };
          const helpId =
            field === "password" && newPassword ? `${fieldId}-hint` : undefined;
          const descriptions =
            [helpId, error ? `${fieldId}-error` : undefined]
              .filter(Boolean)
              .join(" ") || undefined;
          return (
            <div className="account-field" key={field}>
              {field === "terms" ? (
                <label className="account-check">
                  <input
                    id={fieldId}
                    name={field}
                    type="checkbox"
                    required
                    aria-invalid={!!error}
                    aria-describedby={descriptions}
                    onChange={(e) => change(e.currentTarget.form)}
                    onBlur={(e) => blur(e.currentTarget.form)}
                  />{" "}
                  <span>
                    I acknowledge the Terms and have read the Privacy notice
                    linked below.
                  </span>
                </label>
              ) : (
                <>
                  <div className="account-label-row">
                    <label htmlFor={fieldId}>
                      {field === "password" && mode === "reset"
                        ? "New password"
                        : fieldLabels[field]}
                    </label>
                    {field === "password" && mode === "login" && (
                      <Link href="/forgot-password">Forgot password?</Link>
                    )}
                  </div>
                  {field === "password" || field === "confirmPassword" ? (
                    <PasswordInput
                      id={fieldId}
                      field={field}
                      autoComplete={
                        newPassword ? "new-password" : "current-password"
                      }
                      error={!!error}
                      descriptions={descriptions}
                      onChange={(input) => {
                        if (field === "password" && newPassword)
                          setPasswordReady(validNewPassword(input.value));
                        change(input.form);
                      }}
                      onBlur={blur}
                    />
                  ) : (
                    <input
                      id={fieldId}
                      name={field}
                      type={field === "email" ? "email" : "text"}
                      autoComplete={
                        field === "email"
                          ? mode === "login"
                            ? "username"
                            : "email"
                          : "name"
                      }
                      maxLength={field === "email" ? 254 : 100}
                      required
                      autoCapitalize={field === "email" ? "none" : "words"}
                      spellCheck={false}
                      placeholder={
                        field === "email" ? "you@example.com" : "Your name"
                      }
                      aria-invalid={!!error}
                      aria-describedby={descriptions}
                      onChange={(e) => change(e.currentTarget.form)}
                      onBlur={(e) => blur(e.currentTarget.form)}
                    />
                  )}
                </>
              )}
              {helpId && (
                <p
                  id={helpId}
                  className={`account-hint ${passwordReady ? "hint-met" : ""}`}
                >
                  {passwordReady
                    ? "Length requirement met. Avoid reused passwords."
                    : `Use ${passwordPolicy.min}–${passwordPolicy.max} characters.`}
                </p>
              )}
              {error && (
                <p id={`${fieldId}-error`} className="account-field-error">
                  <CircleAlert size={14} aria-hidden="true" />
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </fieldset>
      <PendingButton
        type="submit"
        pending={pending}
        pendingLabel={labels[mode][1]}
        disabled={!hydrated || wait > 0}
      >
        {wait > 0 ? `Try again in ${wait}s` : labels[mode][0]}
        <ArrowRight size={17} aria-hidden="true" />
      </PendingButton>
      <noscript>
        <p>Enable JavaScript to use this form.</p>
      </noscript>
    </form>
  );
}

function PasswordInput({
  id,
  field,
  autoComplete,
  error,
  descriptions,
  onChange,
  onBlur,
}: {
  id: string;
  field: string;
  autoComplete: string;
  error: boolean;
  descriptions?: string;
  onChange: (input: HTMLInputElement) => void;
  onBlur: (form: HTMLFormElement | null) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="account-password">
      <input
        id={id}
        name={field}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required
        maxLength={
          autoComplete === "current-password" ? 1024 : passwordPolicy.max
        }
        autoCapitalize="none"
        spellCheck={false}
        placeholder={
          field === "confirmPassword"
            ? "Repeat your password"
            : "Enter your password"
        }
        aria-invalid={error}
        aria-describedby={descriptions}
        onChange={(e) => onChange(e.currentTarget)}
        onBlur={(e) => onBlur(e.currentTarget.form)}
      />
      <button
        type="button"
        className="account-eye"
        aria-label={
          visible
            ? field === "confirmPassword"
              ? "Hide confirmation password"
              : "Hide password"
            : field === "confirmPassword"
              ? "Show confirmation password"
              : "Show password"
        }
        aria-controls={id}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? (
          <EyeOff size={19} aria-hidden="true" />
        ) : (
          <Eye size={19} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
