"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { cn, initials } from "@/lib/utils";
import { Logo } from "@/components/marketing/nav";

export type AppTab = { href: string; label: string; exact?: boolean };

export function AppShell({
  tabs,
  user,
  area,
  children,
}: {
  tabs: AppTab[];
  user: { name: string; email: string; role: string };
  area: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          <span className="hidden rounded-full border border-line bg-cream px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft sm:inline">
            {area}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-[13px] font-semibold leading-tight">{user.name}</span>
              <span className="block text-[11.5px] leading-tight text-mut">{user.email}</span>
            </span>
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#b7a4ff] to-[#6d4cff] text-[12px] font-bold text-white">
              {initials(user.name)}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Log out"
                title="Log out"
                className="btn btn-ghost btn-sm !px-2.5 text-mut hover:text-rose"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
        <nav className="border-t border-line/60" aria-label={`${area} navigation`}>
          <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6">
            {tabs.map((tab) => {
              const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                    active ? "bg-ink text-paper" : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
