"use client";
import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { passwordPolicy } from "@/config/account";
import { validNewPassword } from "@/lib/services/validation";
import { PendingButton } from "@/components/system/loading";

const fields = [
  ["currentPassword", "Current password", "current-password", 1024],
  ["password", "New password", "new-password", passwordPolicy.max],
  [
    "confirmPassword",
    "Confirm new password",
    "new-password",
    passwordPolicy.max,
  ],
] as const;
export function ChangePassword({ email }: { email: string }) {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<{ error: boolean; text: string }>();
  return (
    <section className="ws-panel ws-form-panel">
      <h2>Change Password</h2>
      <form
        method="post"
        className="ws-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (running.current) return;
          const form = event.currentTarget;
          const fields = new FormData(form);
          const password = String(fields.get("password") ?? "");
          const confirmPassword = String(fields.get("confirmPassword") ?? "");
          const currentPassword = String(fields.get("currentPassword") ?? "");
          if (!validNewPassword(password) || password !== confirmPassword) {
            setNotice({
              error: true,
              text: !validNewPassword(password)
                ? "Use 8–16 characters."
                : "Your passwords don’t match.",
            });
            return;
          }
          running.current = true;
          setBusy(true);
          setNotice(undefined);
          try {
            const response = await fetch("/api/auth/change-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              cache: "no-store",
              body: JSON.stringify({
                currentPassword,
                password,
                confirmPassword,
              }),
            });
            const payload = await response.json();
            if (response.ok && payload.success === true) {
              form.reset();
              setShown({});
              setNotice({
                error: false,
                text: payload.data?.otherSessionsRevoked
                  ? "Password changed."
                  : "Password changed. Other sessions could not be signed out automatically.",
              });
            } else {
              const code = payload.error?.code;
              const text =
                code === "invalid_credentials"
                  ? "Check your current password and try again."
                  : code === "reauthentication_required"
                    ? "Sign in again or use the verified password reset flow."
                    : code === "validation"
                      ? "Use a different password that meets the length requirements."
                      : response.status === 429
                        ? "Too many attempts. Wait before trying again."
                        : response.status === 401
                          ? "Sign in again before trying to change your password."
                          : "Your password could not be changed. Please try again.";
              setNotice({ error: true, text });
            }
          } catch {
            setNotice({
              error: true,
              text: "We couldn’t confirm the password change. Sign in again before retrying.",
            });
          } finally {
            running.current = false;
            setBusy(false);
          }
        }}
      >
        <div className="ws-field">
          <label htmlFor="change-password-email">Verified sign-in email</label>
          <input
            id="change-password-email"
            autoComplete="username"
            value={email}
            readOnly
          />
        </div>
        {fields.map(([key, label, autoComplete, max]) => {
          const Icon = shown[key] ? EyeOff : Eye;
          const id = `change-password-${key}`;
          return (
            <div key={key} className="ws-field">
              <label htmlFor={id}>{label}</label>
              <div className="ws-password-input">
                <input
                  id={id}
                  name={key}
                  type={shown[key] ? "text" : "password"}
                  autoComplete={autoComplete}
                  maxLength={max}
                  required
                  disabled={busy}
                  spellCheck={false}
                  autoCapitalize="none"
                  aria-describedby={
                    key === "password" ? "change-password-hint" : undefined
                  }
                />
                <button
                  type="button"
                  className="ws-icon-button"
                  aria-controls={id}
                  aria-label={`${shown[key] ? "Hide" : "Show"} ${label.toLowerCase()}`}
                  onClick={() =>
                    setShown((previous) => ({
                      ...previous,
                      [key]: !previous[key],
                    }))
                  }
                >
                  <Icon size={18} aria-hidden="true" />
                </button>
              </div>
              {key === "password" && (
                <p id="change-password-hint">
                  Use {passwordPolicy.min}–{passwordPolicy.max} characters.
                </p>
              )}
            </div>
          );
        })}
        <PendingButton
          type="submit"
          pending={busy}
          pendingLabel="Changing password…"
        >
          Change Password
        </PendingButton>
        {notice && (
          <p role={notice.error ? "alert" : "status"}>{notice.text}</p>
        )}
      </form>
    </section>
  );
}
