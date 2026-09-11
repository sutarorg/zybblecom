import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/auth-form";
import { getCurrentUser, homeFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  const { next, error } = await searchParams;
  if (user) redirect(next?.startsWith("/") ? next : homeFor(user));

  return (
    <AuthShell
      title="Create your account."
      sub="Free to start. Publish your first course today — or learn from a creator you trust."
    >
      <SignupForm next={next} error={error} />
    </AuthShell>
  );
}
