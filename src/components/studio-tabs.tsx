"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/utils";

const TABS = [
  { href: "/creator", label: "Overview" },
  { href: "/creator/courses", label: "Courses" },
  { href: "/creator/transactions", label: "Sales" },
  { href: "/creator/payouts", label: "Payouts" },
  { href: "/creator/settings", label: "Bank" },
];

export function StudioTabs() {
  const pathname = usePathname();
  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1">
      {TABS.map((tab) => {
        const active =
          tab.href === "/creator" ? pathname === "/creator" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition",
              active ? "bg-ink text-paper" : "text-ink-soft hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
