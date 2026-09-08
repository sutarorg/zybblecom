import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { AdminTabs } from "@/components/admin-tabs";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              Zybble admin
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Platform control center
            </h1>
          </div>
          <AdminTabs />
        </div>
        {children}
      </div>
    </>
  );
}
