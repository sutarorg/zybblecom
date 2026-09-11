import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

const TABS = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/courses", label: "Courses" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/earnings", label: "Earnings" },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(["creator"]);
  return (
    <AppShell area="Creator studio" user={user} tabs={TABS}>
      {children}
    </AppShell>
  );
}
