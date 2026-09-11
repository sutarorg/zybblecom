import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, LogoMark } from "@/components/marketing/nav";

export function AuthShell({
  children,
  title,
  sub,
}: {
  children: ReactNode;
  title: string;
  sub: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr,1.05fr]">
      {/* Form panel — left on desktop, full-screen on mobile */}
      <div className="relative flex flex-col bg-paper px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:hidden">
            <Logo />
          </Link>
          <Link href="/" className="btn btn-ghost btn-sm ml-auto">
            <ArrowLeft className="size-4" /> Back to site
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">{title}</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-mut">{sub}</p>
          <div className="mt-8">{children}</div>
        </div>
        <p className="pb-2 text-center text-[12px] text-mut">
          © 2026 Zybble ·{" "}
          <Link href="/terms" className="underline hover:text-ink">Terms</Link> ·{" "}
          <Link href="/privacy" className="underline hover:text-ink">Privacy</Link>
        </p>
      </div>

      {/* Brand panel — right on desktop, hidden on mobile */}
      <div className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="grain pointer-events-none absolute inset-0 opacity-60" />
        <div
          className="pointer-events-none absolute -left-32 -top-32 size-[420px] rounded-full bg-grape/40 blur-[130px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-40 -right-24 size-[420px] rounded-full bg-[#c78bd4]/25 blur-[130px]"
          aria-hidden
        />
        <div className="relative">
          <Logo dark />
        </div>
        <div className="relative">
          <p className="font-display text-5xl italic leading-[1.15] tracking-tight text-paper">
            &ldquo;Every great course starts as
            <br />a single link.&rdquo;
          </p>
          <div className="mt-6 flex items-center gap-2.5">
            <LogoMark className="size-7" />
            <p className="font-mono text-[13px] text-paper/50">zybble.com/c/your-topic</p>
          </div>
        </div>
        <div className="relative flex items-center gap-3 text-[12.5px] text-paper/40">
          <span className="size-1.5 rounded-full bg-mint" />
          No catalogs. No marketplaces. Just your course.
        </div>
      </div>
    </div>
  );
}
