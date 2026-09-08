import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { AuthForm } from "@/components/auth-form";
import { Card, Badge } from "@/components/ui";

export const metadata = { title: "Log in or sign up" };

async function AuthedRedirect() {
  const user = await getSessionUser();
  if (user) redirect("/");
  return null;
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string }>;
}) {
  const { mode, next } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center px-4 py-10">
      <Suspense>
        <AuthedRedirect />
      </Suspense>
      <Logo href="/" className="mb-8" />
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {mode === "signup"
            ? "You're a creator the moment you sign up. No approvals, ever."
            : "Log in to your studio, courses and payouts."}
        </p>
        <div className="mt-6">
          <AuthForm initialMode={mode === "signup" ? "signup" : "login"} next={next ?? null} />
        </div>
      </Card>

      <Card className="mt-4 w-full max-w-md space-y-2 bg-cream/70 p-5 text-[13px] shadow-none">
        <Badge tone="brand">Demo access</Badge>
        <div className="grid gap-1 font-medium text-ink-soft">
          <p>
            Admin — <span className="font-semibold text-ink">admin@zybble.com</span> · admin12345
          </p>
          <p>
            Creator — <span className="font-semibold text-ink">creator@zybble.com</span> · creator12345
          </p>
          <p>
            Buyer — <span className="font-semibold text-ink">buyer@zybble.com</span> · buyer12345
          </p>
        </div>
      </Card>
    </main>
  );
}
