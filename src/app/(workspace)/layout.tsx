import "@/styles/workspace.css";
import { redirect } from "next/navigation";
import { accountServer } from "@/lib/services/account-server";
import { authSettings } from "@/lib/backend/supabase";
import { connection } from "next/server";
import { WorkspaceShell } from "@/components/workspace/shell";
import { getBalance, getProfile } from "@/services/workspace-server";
import type { Metadata } from "next";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  if (authSettings()) {
    const session = await accountServer.getSession();
    if (!session.ok)
      redirect(
        session.error === "verification_required"
          ? "/verify-email"
          : session.error === "unavailable"
            ? "/maintenance"
            : "/unauthorized",
      );
    if (!session.value) redirect("/login");
    if (!session.value.onboardingComplete) redirect("/onboarding");
  }
  const [profile, balance] = await Promise.all([getProfile(), getBalance()]);
  return (
    <WorkspaceShell
      profile={profile.ok ? profile.value : null}
      balance={balance.ok ? balance.value : null}
    >
      {children}
    </WorkspaceShell>
  );
}
