"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CircleHelp,
  Clapperboard,
  Coins,
  FolderOpen,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Settings,
  UserRound,
  X,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Brand, Action } from "@/components/ui/primitives";
import { frontendServices } from "@/lib/services";
import { PendingButton } from "@/components/system/loading";
import { useWorkspaceRealtime } from "@/hooks/use-workspace-realtime";
import type { Profile, Balance } from "@/services/workspace-contracts";
import { type GenerationOptions } from "@/services/generation-schema";
import { creditsText } from "@/services/workspace-format";
import { workspaceMessage } from "@/services/workspace";

const primary = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/projects", label: "Projects", icon: FolderOpen },
  { path: "/clips", label: "My Clips", icon: Clapperboard },
  { path: "/credits", label: "Credits & Purchases", icon: Coins },
];
const secondary = [
  { path: "/settings", label: "Settings", icon: Settings },
  { path: "/support", label: "Help & Support", icon: CircleHelp },
];
const subpages: Record<string, string> = {
  new: "New project",
  history: "Credit history",
  profile: "Profile",
  preferences: "Preferences",
};
const DraftContext = createContext<{
  file: File | null;
  setFile: (file: File | null) => void;
  titleEdit: string | null;
  setTitle: (title: string | null) => void;
  options: GenerationOptions | null;
  setOptions: React.Dispatch<React.SetStateAction<GenerationOptions | null>>;
} | null>(null);
export function useLocalDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw Error("Workspace needs its local draft provider.");
  return ctx;
}

export function WorkspaceShell({
  children,
  profile,
  balance,
}: {
  children: ReactNode;
  profile: Profile | null;
  balance: Balance | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  const [compact, setCompact] = useState(false);
  const [draft, setFile] = useState<File | null>(null);
  const [titleEdit, setTitle] = useState<string | null>(null);
  const [options, setOptions] = useState<GenerationOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const parts = pathname.split("/").filter(Boolean);
  const top = [...primary, ...secondary].find(
    (item) => item.path === `/${parts[0]}`,
  );
  const nested =
    parts.length > 1
      ? parts.length > 2
        ? "Clip editor"
        : (subpages[parts[1]] ?? "Project details")
      : null;
  const label = top?.label ?? "Workspace";
  useWorkspaceRealtime(
    !!profile,
    parts[0] === "projects" && parts[1] !== "new" ? parts[1] : undefined,
  );
  useEffect(() => {
    dialog.current?.close();
    if (menu.current) menu.current.open = false;
  }, [pathname]);
  async function logout() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const result = await frontendServices.logout();
    setBusy(false);
    if (result.ok) {
      setFile(null);
      setTitle(null);
      setOptions(null);
      router.replace("/login");
      router.refresh();
    } else setError(workspaceMessage(result.error));
  }
  function links(items: typeof primary) {
    return items.map(({ path, label, icon: Icon }) => {
      const active = pathname === path || pathname.startsWith(`${path}/`);
      return (
        <Link
          href={path}
          key={path}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          title={label}
          onClick={() => dialog.current?.close()}
        >
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      );
    });
  }
  function navigation() {
    return (
      <nav aria-label="Creator workspace" className="ws-navigation">
        <div>
          <p>WORKSPACE</p>
          {links(primary)}
        </div>
        <div>
          <p>MANAGE</p>
          {links(secondary)}
        </div>
      </nav>
    );
  }
  function sidebarBottom() {
    return (
      <div className="ws-sidebar-bottom">
        <div className="ws-sidebar-credit">
          <Coins size={17} aria-hidden="true" />
          <div>
            <small>Available credits</small>
            <strong>
              {balance ? creditsText(balance.available) : "Not connected"}
            </strong>
          </div>
        </div>
        <Action href="/credits#credit-packs" variant="secondary" arrow={false}>
          Buy Credits
        </Action>
        <div className="ws-sidebar-user">
          <span className="ws-avatar">
            <UserRound size={17} aria-hidden="true" />
          </span>
          <div>
            <b>{profile?.name || "Creator workspace"}</b>
            <small>{profile ? "Account" : "Preview mode"}</small>
          </div>
          {profile ? (
            <button
              type="button"
              title="Log out"
              aria-label="Log out"
              disabled={busy}
              onClick={logout}
            >
              <LogOut size={17} />
            </button>
          ) : (
            <Link href="/login" title="Log in" aria-label="Log in">
              <LogIn size={17} aria-hidden="true" />
            </Link>
          )}
        </div>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  }
  return (
    <DraftContext.Provider
      value={{ file: draft, setFile, titleEdit, setTitle, options, setOptions }}
    >
      <div className={`ws-shell ${compact ? "ws-collapsed" : ""}`}>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <aside className="ws-sidebar">
          <div className="ws-brand">
            <Brand />
            <button
              type="button"
              title={compact ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
              className="ws-icon-button ws-collapse"
              onClick={() => setCompact(!compact)}
            >
              <ChevronsLeft size={17} aria-hidden="true" />
            </button>
          </div>
          {navigation()}
          {sidebarBottom()}
        </aside>
        <dialog
          ref={dialog}
          className="ws-drawer"
          aria-label="Workspace navigation"
          onClick={(event) => {
            if (event.target === event.currentTarget) dialog.current?.close();
          }}
        >
          <div className="ws-drawer-inner">
            <div className="ws-brand">
              <Brand />
              <button
                type="button"
                className="ws-icon-button"
                aria-label="Close navigation"
                onClick={() => dialog.current?.close()}
              >
                <X size={21} aria-hidden="true" />
              </button>
            </div>
            {navigation()}
            {sidebarBottom()}
          </div>
        </dialog>
        <div className="ws-main">
          <header className="ws-header">
            <div className="ws-header-inner">
              <button
                type="button"
                className="ws-icon-button ws-menu-toggle"
                aria-label="Open navigation"
                onClick={() => dialog.current?.showModal()}
              >
                <Menu size={22} aria-hidden="true" />
              </button>
              <nav className="ws-crumbs" aria-label="Breadcrumb">
                {nested ? (
                  <>
                    <Link href={top?.path ?? "/dashboard"}>{label}</Link>
                    <ChevronRight size={14} aria-hidden="true" />
                    <span aria-current="page">{nested}</span>
                  </>
                ) : (
                  <span aria-current="page">{label}</span>
                )}
              </nav>
              <Link
                className="ws-header-credits"
                href="/credits"
                aria-label={
                  balance
                    ? `${creditsText(balance.available)} available credits`
                    : "Credits, balance not connected"
                }
              >
                <Coins size={16} aria-hidden="true" />
                <span>
                  {balance
                    ? `${creditsText(balance.available)} credits`
                    : "Credits"}
                </span>
              </Link>
              <Link
                href="/projects/new"
                className="ws-icon-button ws-header-create"
                aria-label="Create project"
              >
                <Plus size={20} aria-hidden="true" />
              </Link>
              <details
                ref={menu}
                className="ws-account"
                onKeyDown={(event) => {
                  if (event.key === "Escape" && menu.current?.open) {
                    menu.current.open = false;
                    menu.current.querySelector("summary")?.focus();
                  }
                }}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget))
                    event.currentTarget.open = false;
                }}
              >
                <summary aria-label="Account menu">
                  <span className="ws-avatar">
                    {profile?.avatarUrl ? (
                      <Avatar src={profile.avatarUrl} />
                    ) : (
                      <UserRound size={17} aria-hidden="true" />
                    )}
                  </span>
                  <ChevronDown size={13} aria-hidden="true" />
                </summary>
                <div className="ws-account-pop">
                  <strong>{profile?.name || "Workspace preview"}</strong>
                  <Link href="/settings/profile">Profile</Link>
                  <Link href="/settings/preferences">Preferences</Link>
                  {profile ? (
                    <PendingButton
                      type="button"
                      pending={busy}
                      onClick={logout}
                    >
                      Log out
                    </PendingButton>
                  ) : (
                    <Link href="/login">Log in</Link>
                  )}
                  {error && <p role="alert">{error}</p>}
                </div>
              </details>
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="ws-content">
            {children}
          </main>
        </div>
      </div>
    </DraftContext.Provider>
  );
}
function Avatar({ src }: { src: string }) {
  // Private, expiring assets are served directly, not through the public image optimizer.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" referrerPolicy="no-referrer" width="34" height="34" />
  );
}
