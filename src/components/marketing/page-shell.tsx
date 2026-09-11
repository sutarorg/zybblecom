import type { ReactNode } from "react";
import { MarketingNav } from "./nav";
import { MarketingFooter } from "./footer";
import { Reveal } from "./reveal";

export function MarketingSubPage({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <MarketingNav />
      <main className="pt-24 sm:pt-32">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div
            className="pointer-events-none absolute -top-16 left-1/2 h-72 w-[560px] -translate-x-1/2 rounded-full bg-grape/12 blur-[100px]"
            aria-hidden
          />
          <Reveal className="relative">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> {eyebrow}
            </span>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
              {title}
            </h1>
            {sub && (
              <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-mut">{sub}</p>
            )}
          </Reveal>
        </div>
        {children}
      </main>
      <MarketingFooter />
    </>
  );
}
