import { connection } from "next/server";
import Link from "next/link";
import { MailCheck, MailOpen } from "lucide-react";
import {
  AccountFrame,
  AccountHeading,
} from "@/components/account/account-shell";
import { AuthForm } from "@/components/account/auth-form";
import { Action } from "@/components/ui/primitives";
import { frontendServices } from "@/lib/services";
import { pageMetadata } from "@/lib/seo/metadata";
export const metadata = pageMetadata(
  "/verify-email",
  "Verify your email",
  "Find or request your Zybble verification link.",
  { noindex: true },
);
export default async function VerifyEmail() {
  await connection();
  const state = await frontendServices.getEmailVerification();
  if (state.ok && state.value.verified)
    return (
      <AccountFrame>
        <AccountHeading
          icon={MailCheck}
          label="EMAIL VERIFICATION"
          title="Email verified."
          description="Your verified email is ready to use with Zybble."
        />
        <div className="account-result-actions">
          <Action href="/login">Continue to log in</Action>
        </div>
      </AccountFrame>
    );
  const expired = !state.ok && state.error === "expired_link";
  return (
    <AccountFrame>
      <AccountHeading
        icon={MailOpen}
        label="EMAIL VERIFICATION"
        title={expired ? "Your link has expired." : "Verify your email."}
        description={
          expired
            ? "Request a new link and use the most recent email."
            : "Open the verification link from Zybble. If you don’t see it, check your spam folder or request another link."
        }
      />
      <AuthForm mode="verify" connected={state.ok || expired} />
      <p className="account-switch">
        Need a different address? <Link href="/signup">Go back to sign up</Link>
      </p>
    </AccountFrame>
  );
}
