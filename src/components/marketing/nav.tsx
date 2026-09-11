"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#your-link", label: "Your link" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#preview", label: "Preview" },
  { href: "/#faq", label: "FAQ" },
];

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-[10px] shadow-card",
        className,
      )}
      style={{
        background: "linear-gradient(135deg,#8f6bff 0%,#6d4cff 55%,#4b2fd9 100%)",
      }}
    >
      <svg viewBox="0 0 24 24" className="size-[62%]" fill="none" role="img">
        <circle cx="12" cy="7" r="2.1" fill="#fff" opacity="0.7" />
        <ellipse cx="12" cy="12.4" rx="4.4" ry="2.5" fill="#fff" opacity="0.85" />
        <ellipse cx="12" cy="17.4" rx="6.4" ry="3" fill="#fff" />
      </svg>
    </span>
  );
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Zybble home">
      <LogoMark />
      <span className={cn("text-[17px] font-semibold tracking-tight", dark && "text-paper")}>
        zybble
      </span>
    </Link>
  );
}

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled || open
          ? "border-b border-line bg-paper/85 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="link-underline text-[13.5px] font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className="btn btn-ghost btn-sm">
            Log in
          </Link>
          <Link href="/signup" className="btn btn-ink btn-sm">
            Start selling <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-line bg-paper px-4 pb-6 pt-2 md:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {LINKS.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "py-3.5 text-[15.5px] font-medium text-ink transition-colors",
                  i !== 0 && "border-t border-line/70",
                )}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/signup" className="btn btn-ink btn-md w-full" onClick={() => setOpen(false)}>
              Start selling <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className="btn btn-outline btn-md w-full" onClick={() => setOpen(false)}>
              Log in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
