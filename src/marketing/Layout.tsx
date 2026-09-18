import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { LogoMark } from "../components/Logo";
import Footer from "../components/Footer";
import { cn } from "../utils/cn";
import { MLink } from "../seo/Seo";

const NAV_LINKS = [
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "Blog", to: "/blog" },
  { label: "About", to: "/about" },
];

/** Shared marketing-page frame — same visual system as the landing page. */
export default function MarketingLayout({
  path,
  children,
}: {
  path: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col gap-3 p-3 sm:gap-5 sm:p-5">
      {/* Header */}
      <header className="relative z-40 mx-auto mt-1 w-full max-w-[1120px] px-1 sm:mt-2 sm:px-2">
        <nav
          aria-label="Marketing"
          className="relative flex h-[54px] items-center justify-between gap-4 rounded-2xl border border-black/[0.06] bg-white/90 pl-4 pr-2 shadow-[0_1px_2px_rgba(20,18,15,0.04),0_12px_32px_-16px_rgba(20,18,15,0.14)] backdrop-blur-md"
        >
          <MLink to="/" aria-label="Zybble home" className="group inline-flex items-center gap-2.5">
            <LogoMark className="h-[26px] w-[26px] transition-transform duration-500 group-hover:rotate-[8deg]" />
            <span className="font-display text-[17px] font-semibold tracking-[-0.02em] text-neutral-950">
              Zybble
            </span>
          </MLink>

          <div className="hidden items-center gap-0.5 md:flex">
            {NAV_LINKS.map((l) => (
              <MLink
                key={l.to}
                to={l.to}
                className={cn(
                  "rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors duration-200",
                  path === l.to || path.startsWith(l.to + "/")
                    ? "bg-neutral-100/80 text-neutral-950"
                    : "text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-950"
                )}
              >
                {l.label}
              </MLink>
            ))}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              href="#/login"
              className="hidden rounded-lg px-3 py-2 text-[13.5px] font-medium text-neutral-600 transition-colors hover:text-neutral-950 sm:block"
            >
              Log in
            </a>
            <a
              href="#/signup"
              className="group inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-neutral-950 px-3.5 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(20,18,15,0.25)] transition-all duration-300 hover:bg-neutral-800"
            >
              Start for free
              <ArrowRight className="hidden h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 sm:block" />
            </a>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="grid h-9 w-9 place-items-center rounded-[10px] border border-black/[0.06] text-neutral-700 transition-colors hover:bg-neutral-50 md:hidden"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.99 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-x-0 top-[62px] rounded-2xl border border-black/[0.06] bg-white p-2 shadow-[0_24px_48px_-16px_rgba(20,18,15,0.2)] md:hidden"
              >
                {NAV_LINKS.map((l) => (
                  <MLink
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-xl px-3.5 py-3 text-[14px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
                  >
                    {l.label}
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-300" />
                  </MLink>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </header>

      {/* Page */}
      <main id="main-content" className="flex-1">{children}</main>

      <Footer />
    </div>
  );
}

/** Shared section primitives for marketing pages. */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
      <span className="h-px w-8 bg-neutral-300" />
      {children}
    </p>
  );
}

export function PageHero({
  kicker,
  title,
  lede,
  center,
}: {
  kicker: string;
  title: ReactNode;
  lede: string;
  center?: boolean;
}) {
  return (
    <div className={cn("px-6 pb-12 pt-16 sm:pt-24", center && "text-center")}>
      <div className={cn("mx-auto max-w-3xl", center && "flex flex-col items-center")}>
        <div className={cn(center && "justify-center")}>{center ? <CenterKicker>{kicker}</CenterKicker> : <Kicker>{kicker}</Kicker>}</div>
        <h1 className="mt-6 font-display text-[clamp(2.2rem,4.6vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-950">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-neutral-500 sm:text-lg">
          {lede}
        </p>
      </div>
    </div>
  );
}

function CenterKicker({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
      <span className="h-px w-8 bg-neutral-300" />
      {children}
      <span className="h-px w-8 bg-neutral-300" />
    </p>
  );
}

export function ProseSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-10">
      <h2 className="font-display text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-[-0.02em] text-neutral-950">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[15.5px] leading-[1.75] text-neutral-600">
        {children}
      </div>
    </section>
  );
}

export function CtaBlock({
  title = "Find your next customers with Zybble.",
  sub = "Free plan included. No credit card required.",
}: {
  title?: string;
  sub?: string;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-20 pt-6">
      <div className="rounded-[24px] border border-black/[0.06] bg-neutral-950 px-6 py-12 text-center sm:px-10">
        <h2 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-[-0.02em] text-white">
          {title}
        </h2>
        <p className="mt-3 text-[15px] text-neutral-400">{sub}</p>
        <a
          href="#/signup"
          className="group mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-neutral-950 transition-all duration-300 hover:-translate-y-0.5"
        >
          Start for free
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </a>
      </div>
    </section>
  );
}
