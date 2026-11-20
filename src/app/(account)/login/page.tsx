import { authSettings } from "@/lib/backend/supabase";
import Link from "next/link";
import { LogIn } from "lucide-react";
import {
  AccountFrame,
  AccountHeading,
} from "@/components/account/account-shell";
import { AuthForm } from "@/components/account/auth-form";
import { pageMetadata } from "@/lib/seo/metadata";
export const metadata = pageMetadata(
  "/login",
  "Log in",
  "Sign in to your Zybble workspace.",
  { noindex: true },
);
export default function Login() {
  return (
    <AccountFrame>
      <AccountHeading
        icon={LogIn}
        label="YOUR WORKSPACE"
        title="Welcome back."
        description="Log in to pick up where you left off."
      />
      <AuthForm mode="login" connected={Boolean(authSettings())} />
      <p className="account-switch">
        New to Zybble? <Link href="/signup">Create an account</Link>
      </p>
    </AccountFrame>
  );
}
