import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-form";
import { getCurrentUser, homeFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  const { next, error } = await searchParams;
  if (user) redirect(next?.startsWith("/") ? next : homeFor(user));

  return (
    <AuthShell
      title="Welcome back."
      sub="Log in to manage your courses, track your students, or pick up where you left off."
    >
      <LoginForm next={next} error={error} />
    </AuthShell>
  );
}
