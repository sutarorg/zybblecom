import { connection } from "next/server";
import { KeyRound, Link2Off } from "lucide-react";
import {
  AccountFrame,
  AccountHeading,
} from "@/components/account/account-shell";
import { AuthForm } from "@/components/account/auth-form";
import { Action } from "@/components/ui/primitives";
import { frontendServices } from "@/lib/services";
import { serviceMessage } from "@/lib/services/messages";
import { pageMetadata } from "@/lib/seo/metadata";
export const metadata = pageMetadata(
  "/reset-password",
  "Reset your password",
  "Set a new password after your recovery link is verified.",
  { noindex: true },
);
export default async function ResetPassword() {
  await connection();
  const recovery = await frontendServices.getRecoveryState();
  if (recovery.ok && recovery.value.active)
    return (
      <AccountFrame>
        <AccountHeading
          icon={KeyRound}
          label="ACCOUNT RECOVERY"
          title="Choose a new password."
          description="Choose a password that you haven’t used anywhere else."
        />
        <AuthForm mode="reset" connected />
      </AccountFrame>
    );
  const unavailable = !recovery.ok && recovery.error === "unavailable";
  const badLink =
    !recovery.ok &&
    [
      "invalid_link",
      "expired_link",
      "expired_session",
      "unauthorized",
    ].includes(recovery.error);
  return (
    <AccountFrame>
      <AccountHeading
        icon={Link2Off}
        label="ACCOUNT RECOVERY"
        title={
          unavailable
            ? "A verified link is required."
            : badLink
              ? "This reset link can’t be used."
              : "We couldn’t check your link."
        }
        description={
          unavailable
            ? "Password recovery isn’t connected yet. When it’s available, open the link from your reset email to set a new password."
            : !recovery.ok
              ? serviceMessage(recovery.error)
              : "Open a fresh recovery link to continue."
        }
      />
      <div className="actions account-result-actions">
        <Action href="/forgot-password">Request a reset link</Action>
        <Action href="/login" variant="text" arrow={false}>
          Back to log in
        </Action>
      </div>
    </AccountFrame>
  );
}
