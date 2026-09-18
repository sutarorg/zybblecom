import { AnimatePresence, motion } from "framer-motion";
import {
  CreditCard,
  Gauge,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import Logo from "../../components/Logo";
import { logout } from "../lib/auth";
import { useDb } from "../lib/db";
import { syncFromServer, tickJobs } from "../lib/remote";
import { getPlan, getSubscription, getUsage } from "../lib/plans";
import type { Profile } from "../lib/types";
import { db } from "../lib/db";
import { cn } from "../../utils/cn";
import { Toaster } from "./kit";

const NAV = [
  { label: "Dashboard", href: "#/app/dashboard", icon: LayoutDashboard, match: "/app/dashboard" },
  { label: "Find Leads", href: "#/app/find", icon: Search, match: "/app/find" },
  { label: "Leads", href: "#/app/leads", icon: Gauge, match: "/app/leads" },
  { label: "Campaigns", href: "#/app/campaigns", icon: Mail, match: "/app/campaigns" },
  { label: "Billing", href: "#/app/billing", icon: CreditCard, match: "/app/billing" },
  { label: "Settings", href: "#/app/settings", icon: Settings, match: "/app/settings" },
];

export default function Shell({
  userId,
  route,
  title,
  actions,
  children,
}: {
  userId: string;
  route: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [mobileNav, setMobileNav] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  useDb(["usage", "subscriptions", "profiles"]);

  const profile = db.byId<Profile>("profiles", userId);
  const plan = getPlan(userId);
  const sub = getSubscription(userId);
  const usage = getUsage(userId);

  // Keep the local cache in sync with Supabase, and nudge background
  // processing while the app is open so queued work starts immediately
  // instead of waiting for the next scheduled run. The server no-ops
  // when this account has nothing pending.
  useEffect(() => {
    void syncFromServer(true);
    const sync = setInterval(() => void syncFromServer(), 6000);
    void tickJobs();
    const tick = setInterval(() => void tickJobs(), 10_000);
    return () => {
      clearInterval(sync);
      clearInterval(tick);
    };
  }, [userId]);

  useEffect(() => {
    setMobileNav(false);
    setUserMenu(false);
  }, [route]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo href="#/" aria-label="Back to zybble.com" />
      </div>

      <nav className="mt-2 flex-1 space-y-0.5 px-3">
        {NAV.map((n) => {
          const active = route.startsWith(n.match);
          return (
            <a
              key={n.label}
              href={n.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-neutral-950/[0.04] text-neutral-950"
                  : "text-neutral-500 hover:bg-neutral-100/70 hover:text-neutral-900"
              )}
            >
              <n.icon className={cn("h-4 w-4", active ? "text-neutral-950" : "text-neutral-400")} />
              {n.label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neutral-950" />}
            </a>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        <div className="rounded-xl border border-black/[0.05] bg-neutral-50/70 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
              {plan.name} plan
            </span>
            {plan.id === "free" && (
              <a href="#/app/billing" className="text-[11px] font-semibold text-neutral-950 hover:underline underline-offset-4">
                Upgrade
              </a>
            )}
          </div>
          {sub.status === "canceled" && (
            <p className="mt-1 text-[10.5px] font-medium text-amber-600">
              Cancels {sub.current_period_end?.slice(0, 10)}
            </p>
          )}
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-neutral-200/70">
            <div
              className="h-full rounded-full bg-neutral-900 transition-all duration-700"
              style={{ width: `${Math.min(100, (usage.leads_used / plan.leadsPerMonth) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10.5px] text-neutral-400">
            {usage.leads_used.toLocaleString()} of {plan.leadsPerMonth.toLocaleString()} leads used
          </p>
        </div>

        <div className="relative mt-2">
          <button
            onClick={() => setUserMenu((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-neutral-100/70"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-950 text-[11px] font-semibold text-white">
              {(profile?.name ?? "Z")
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold text-neutral-900">
                {profile?.name ?? "Account"}
              </span>
              <span className="block truncate text-[11px] text-neutral-400">{profile?.email}</span>
            </span>
          </button>
          <AnimatePresence>
            {userMenu && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="absolute bottom-12 left-0 right-0 rounded-xl border border-black/[0.07] bg-white p-1.5 shadow-[0_20px_44px_-16px_rgba(20,18,15,0.3)]"
              >
                <a
                  href="#/app/settings"
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  <Settings className="h-3.5 w-3.5 text-neutral-400" />
                  Settings
                </a>
                <button
                  onClick={() => {
                    logout();
                    window.location.hash = "#/login";
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] border-r border-black/[0.06] bg-white/80 backdrop-blur-sm lg:block">
        {sidebar}
      </aside>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileNav && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-neutral-950/20 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileNav(false)}
          >
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="h-full w-[272px] border-r border-black/[0.06] bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              {sidebar}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-black/[0.05] bg-white/85 px-4 backdrop-blur-md sm:px-7">
          <button
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
            className="grid h-9 w-9 place-items-center rounded-xl border border-black/[0.06] text-neutral-600 lg:hidden"
          >
            {mobileNav ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <h1 className="font-display text-[17px] font-semibold tracking-[-0.01em] text-neutral-950">
            {title}
          </h1>
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>
        <main className="px-4 py-6 sm:px-7 sm:py-8">{children}</main>
      </div>

      <Toaster />
    </div>
  );
}
