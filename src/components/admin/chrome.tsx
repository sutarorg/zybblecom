"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Coins,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  ReceiptText,
  RefreshCw,
  Settings,
  Shield,
  UserRound,
  Users,
  Webhook,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Bolt } from "@/components/ui/primitives";
import type {
  AdminError,
  AdminSession,
  Permission,
} from "@/services/admin/contracts";
import { command } from "@/services/admin/client";
import { errorCopy } from "@/services/admin/service";
const groups = [
  {
    label: "Overview",
    links: [["overview", "/admin", "Overview", LayoutDashboard]],
  },
  {
    label: "Customers",
    links: [
      ["users", "/admin/users", "Users", Users],
      ["projects", "/admin/projects", "Projects", FolderOpen],
    ],
  },
  {
    label: "Operations",
    links: [
      ["jobs", "/admin/jobs", "Processing Jobs", Activity],
      ["webhooks", "/admin/webhooks", "Webhooks", Webhook],
    ],
  },
  {
    label: "Finance",
    links: [
      ["payments", "/admin/payments", "Payments", ReceiptText],
      ["credits", "/admin/credits", "Credit Management", Coins],
    ],
  },
  {
    label: "System",
    links: [
      ["audit", "/admin/audit-logs", "Audit Logs", ListChecks],
      ["settings", "/admin/settings", "Settings", Settings],
    ],
  },
] as const;
export function AdminChrome({
  children,
  session,
  error,
}: {
  children: ReactNode;
  session?: AdminSession;
  error?: AdminError;
}) {
  const path = usePathname();
  const router = useRouter();
  const [refreshing, refresh] = useTransition();
  const drawer = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const role = session?.roleLabel ?? "Admin console";
  const allowed = (p: Permission) =>
    session ? session.permissions.includes(p) : error === "unavailable";
  const active = groups
    .flatMap((g) => [...g.links])
    .find(
      ([, url]) =>
        url === path || (url !== "/admin" && path.startsWith(url + "/")),
    );
  const nested = path.startsWith("/admin/users/")
    ? "User details"
    : path.startsWith("/admin/jobs/")
      ? "Job details"
      : null;
  useEffect(() => {
    drawer.current?.close();
  }, [path]);
  async function logout() {
    if (pending || !session) return;
    setPending(true);
    setMessage("");
    const r = await command("logout");
    setPending(false);
    if (r.ok) {
      window.location.replace("/login");
    } else setMessage(errorCopy[r.error]);
  }
  function brand() {
    return (
      <Link
        href="/admin"
        className="ad-brand"
        onClick={() => drawer.current?.close()}
        aria-label="Zybble admin overview"
      >
        <span>
          <Bolt />
        </span>
        <b>
          zybble<span>.</span>
        </b>
        <small>ADMIN</small>
      </Link>
    );
  }
  function navigation() {
    return (
      <nav className="ad-nav" aria-label="Administrative navigation">
        {groups.map((group) => {
          const links = group.links.filter(([permission]) =>
            allowed(permission),
          );
          return links.length ? (
            <div key={group.label}>
              <p>{group.label}</p>
              {links.map(([, url, title, Icon]) => (
                <Link
                  key={url}
                  href={url}
                  prefetch={false}
                  aria-current={active?.[1] === url ? "page" : undefined}
                  onClick={() => drawer.current?.close()}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{title}</span>
                  {active?.[1] === url && <i aria-hidden="true" />}
                </Link>
              ))}
            </div>
          ) : null;
        })}
      </nav>
    );
  }
  function footer() {
    return (
      <div className="ad-side-foot">
        <div className="ad-profile">
          <span>
            <UserRound size={17} aria-hidden="true" />
          </span>
          <div>
            <b>{session?.name ?? "Admin access"}</b>
            <small>{session ? role : "No verified session"}</small>
          </div>
          {session && (
            <button
              type="button"
              title="Log out"
              aria-label="Log out"
              className="ad-icon"
              disabled={pending}
              onClick={logout}
            >
              <LogOut size={17} />
            </button>
          )}
        </div>
        {session?.build && <small>Build {session.build}</small>}
        {message && <p role="alert">{message}</p>}
        {!session && (
          <Link
            href={error === "unavailable" ? "/dashboard" : "/login"}
            className="ad-return"
          >
            {error === "unavailable" ? "Creator workspace" : "Sign in"}
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="ad-shell">
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>
      <aside className="ad-sidebar">
        {brand()}
        {navigation()}
        {footer()}
      </aside>
      <dialog
        className="ad-drawer"
        ref={drawer}
        aria-label="Administrative navigation"
        onClick={(e) => {
          if (e.target === e.currentTarget) drawer.current?.close();
        }}
      >
        <div>
          <div className="ad-drawer-top">
            {brand()}
            <button
              type="button"
              className="ad-icon"
              aria-label="Close navigation"
              onClick={() => drawer.current?.close()}
            >
              <X size={21} />
            </button>
          </div>
          {navigation()}
          {footer()}
        </div>
      </dialog>
      <div className="ad-frame">
        <header className="ad-header">
          <button
            type="button"
            className="ad-icon ad-menu-toggle"
            aria-label="Open navigation"
            onClick={() => drawer.current?.showModal()}
          >
            <Menu size={21} />
          </button>
          <nav className="ad-breadcrumb" aria-label="Breadcrumb">
            <Link href="/admin">Admin</Link>
            <ChevronRight size={14} aria-hidden="true" />
            {nested && active ? (
              <>
                <Link href={active[1]}>{active[2]}</Link>
                <ChevronRight size={14} aria-hidden="true" />
              </>
            ) : null}
            <span aria-current="page">
              {nested ?? active?.[2] ?? "Console"}
            </span>
          </nav>
          <div className="ad-header-end">
            <button
              type="button"
              className="ad-icon ad-refresh"
              aria-label="Refresh this view"
              disabled={refreshing}
              onClick={() => refresh(() => router.refresh())}
              title="Refresh this view"
            >
              <RefreshCw size={17} aria-hidden="true" />
            </button>
            <span className="ad-environment">
              <Shield size={14} aria-hidden="true" />
              {session
                ? role
                : error === "unavailable"
                  ? "Frontend preview"
                  : "Restricted"}
            </span>
          </div>
        </header>
        <main className="ad-content" id="admin-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
