import { creditPacks } from "@/config/credit-packs";
import { authSettings } from "@/lib/backend/supabase";
import Link from "next/link";
import { LogIn } from "lucide-react";
import {
  AccountFrame,
  AccountHeading,
} from "@/components/account/account-shell";
import { AuthForm } from "@/components/account/auth-form";
import { pageMetadata } from "@/lib/seo/metadata";
// Auth can be configured at runtime even when it was absent at build time.
export const dynamic = "force-dynamic";

export const metadata = pageMetadata(
  "/login",
  "Log in",
  "Sign in to your Zybble workspace.",
  { noindex: true },
);
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string | string[] }>;
}) {
  const { pack } = await searchParams;
  const checkoutPack = creditPacks.find((item) => item.id === pack)?.id;
  return (
    <AccountFrame>
      <AccountHeading
        icon={LogIn}
        label="YOUR WORKSPACE"
        title="Welcome back."
        description="Log in to pick up where you left off."
      />
      <AuthForm
        mode="login"
        checkoutPack={checkoutPack}
        connected={Boolean(authSettings())}
      />
      <p className="account-switch">
        New to Zybble? <Link href="/signup">Create an account</Link>
      </p>
    </AccountFrame>
  );
}
