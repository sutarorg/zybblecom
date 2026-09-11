import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "./nav";

const COLUMNS: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/tour", label: "Product tour" },
      { href: "/#pages", label: "Course pages" },
      { href: "/signup", label: "Create a course" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/guide", label: "Creator guide" },
      { href: "/faq", label: "FAQ" },
      { href: "/support", label: "Support" },
      { href: "/status", label: "Status" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Create account" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden bg-ink text-paper">
      <div className="grain pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6 sm:pt-20">
        <Link
          href="/signup"
          className="group flex items-center justify-between gap-6 border-b border-white/10 pb-10"
        >
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-paper/40">
              Your audience is waiting
            </p>
            <p className="mt-2 font-display text-4xl italic tracking-tight text-paper sm:text-6xl">
              Start Selling
            </p>
          </div>
          <span className="grid size-14 shrink-0 place-items-center rounded-full border border-white/15 transition-all duration-300 group-hover:border-grape group-hover:bg-grape sm:size-20">
            <ArrowUpRight className="size-6 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:size-8" />
          </span>
        </Link>

        <div className="grid gap-10 border-b border-white/10 py-12 md:grid-cols-[1.4fr,repeat(4,1fr)]">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-paper/50">
              The direct course-selling platform for independent creators. One link, everywhere.
            </p>
            <p className="mt-4 font-mono text-[12px] text-paper/40">zybble.com/c/your-topic</p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/40">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a
                        href={l.href}
                        className="text-[13.5px] text-paper/65 transition-colors hover:text-paper"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-[13.5px] text-paper/65 transition-colors hover:text-paper"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-3 pt-8 text-[12.5px] text-paper/40 sm:flex-row sm:items-center">
          <p>© 2026 Zybble. All rights reserved.</p>
          <p>Made for people who have something to teach.</p>
        </div>
      </div>
    </footer>
  );
}
