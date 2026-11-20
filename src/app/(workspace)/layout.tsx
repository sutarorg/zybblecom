import "@/styles/workspace.css";
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
  // Session 5: verify the session before any private read. In this phase neither adapter returns data.
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
