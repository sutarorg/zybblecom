import { authSettings } from "@/lib/backend/supabase";
import Link from "next/link";
import { UserRoundPlus } from "lucide-react";
import {
  AccountFrame,
  AccountHeading,
} from "@/components/account/account-shell";
import { AuthForm } from "@/components/account/auth-form";
import { pageMetadata } from "@/lib/seo/metadata";
// Auth can be configured at runtime even when it was absent at build time.
export const dynamic = "force-dynamic";

export const metadata = pageMetadata(
  "/signup",
  "Create an account",
  "Create an account for the Zybble workspace.",
  { noindex: true },
);
export default function Signup() {
  return (
    <AccountFrame>
      <AccountHeading
        icon={UserRoundPlus}
        label="GET STARTED"
        title="Create your account."
        description="Set up your workspace for turning long videos into short clips."
      />
      <AuthForm mode="signup" connected={Boolean(authSettings())} />
      <p className="account-switch">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </AccountFrame>
  );
}
