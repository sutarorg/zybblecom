import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

const TABS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/settlements", label: "Settlements" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(["admin"]);
  return (
    <AppShell area="Platform admin" user={user} tabs={TABS}>
      {children}
    </AppShell>
  );
}
