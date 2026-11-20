import { authSettings } from "@/lib/backend/supabase";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import {
  AccountFrame,
  AccountHeading,
} from "@/components/account/account-shell";
import { AuthForm } from "@/components/account/auth-form";
import { pageMetadata } from "@/lib/seo/metadata";
// Auth can be configured at runtime even when it was absent at build time.
export const dynamic = "force-dynamic";

export const metadata = pageMetadata(
  "/forgot-password",
  "Recover your password",
  "Request a password reset link for your Zybble account.",
  { noindex: true },
);
export default function Forgot() {
  return (
    <AccountFrame>
      <AccountHeading
        icon={KeyRound}
        label="ACCOUNT RECOVERY"
        title="Forgot your password?"
        description="Enter the email address you used for Zybble. If it matches an account, we can send a reset link once account services are available."
      />
      <AuthForm mode="forgot" connected={Boolean(authSettings())} />
      <p className="account-switch">
        <Link href="/login">Back to log in</Link>
      </p>
    </AccountFrame>
  );
}
