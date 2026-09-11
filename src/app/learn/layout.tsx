import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

const TABS = [{ href: "/learn", label: "My library", exact: true }];

export default async function LearnLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell area="My learning" user={user} tabs={TABS}>
      {children}
    </AppShell>
  );
}
