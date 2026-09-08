import Link from "next/link";
import {
  BookOpen,
  Compass,
  Home,
  LayoutDashboard,
  LogOut,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui";
import { initials } from "@/lib/utils";

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            <Link href="/#how-it-works" className={buttonClasses("ghost", "sm")}>
              How it works
            </Link>
            <Link href="/#why-zybble" className={buttonClasses("ghost", "sm")}>
              Why Zybble
            </Link>
            <Link href="/#faq" className={buttonClasses("ghost", "sm")}>
              FAQ
            </Link>
            {user && (
              <>
                <Link href="/creator" className={buttonClasses("ghost", "sm")}>
                  <LayoutDashboard className="size-4" /> Studio
                </Link>
                <Link href="/my-courses" className={buttonClasses("ghost", "sm")}>
                  <BookOpen className="size-4" /> My courses
                </Link>
                {user.isAdmin && (
                  <Link href="/admin" className={buttonClasses("ghost", "sm")}>
                    <ShieldCheck className="size-4" /> Admin
                  </Link>
                )}
              </>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href="/creator/courses/new"
                  className={buttonClasses("brand", "sm") + " hidden sm:inline-flex"}
                >
                  <Plus className="size-4" /> New course
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    title="Log out"
                    className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-sm font-semibold transition hover:border-ink/30"
                  >
                    <span className="grid size-7 place-items-center rounded-full bg-ink font-display text-[11px] font-bold text-paper">
                      {initials(user.name)}
                    </span>
                    <span className="hidden max-w-28 truncate sm:block">{user.name.split(" ")[0]}</span>
                    <LogOut className="size-3.5 text-ink-soft" />
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/auth" className={buttonClasses("ghost", "sm")}>
                  Log in
                </Link>
                <Link href="/auth?mode=signup" className={buttonClasses("ink", "sm")}>
                  Start selling
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation for signed-in users */}
      {user && (
        <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-line bg-white/90 p-1.5 shadow-[0_16px_40px_-16px_rgba(18,16,20,0.4)] backdrop-blur-xl md:hidden">
          {[
            { href: "/", label: "Home", icon: Home },
            { href: "/creator", label: "Studio", icon: Compass },
            { href: "/my-courses", label: "Learning", icon: BookOpen },
            { href: user.isAdmin ? "/admin" : "/creator/settings", label: user.isAdmin ? "Admin" : "Payouts", icon: user.isAdmin ? ShieldCheck : LayoutDashboard },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold text-ink-soft transition hover:bg-cream hover:text-ink"
            >
              <item.icon className="size-4.5" />
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
