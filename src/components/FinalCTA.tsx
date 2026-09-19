import { ArrowRight, CheckCircle2, Gauge, Sparkles } from "lucide-react";
import Reveal from "./Reveal";

const TRUST = ["100 free leads every month", "No credit card required", "Cancel anytime"];

export default function FinalCTA() {
  return (
    <section id="get-started" className="relative isolate overflow-hidden">
      {/* Backdrop: soft AI glow + concentric rings. Scales with the viewport,
          so it never widens the page on small screens. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[min(110vw,520px)] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,0.07),transparent_70%)]"
      />
      <svg
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[min(110vw,560px)] w-[min(150vw,960px)] -translate-x-1/2 [mask-image:radial-gradient(closest-side,black_35%,transparent_100%)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {[26, 34, 42].map((r, i) => (
          <ellipse
            key={r}
            cx="50"
            cy="50"
            rx={r + i * 6}
            ry={r * 0.62}
            fill="none"
            stroke="#14120f"
            strokeOpacity={0.06}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Echoes of the hero — floating signal chips (desktop only). */}
      <div aria-hidden className="absolute left-[6%] top-[24%] hidden lg:block">
        <div
          className="motion-float flex items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-3 py-2 shadow-[0_14px_32px_-16px_rgba(20,18,15,0.22)]"
          style={{ animation: "float-y 8s ease-in-out infinite" }}
        >
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
            <Gauge className="h-3 w-3" />
          </span>
          <span className="text-[11.5px] font-medium text-neutral-700">AI fit score</span>
        </div>
      </div>
      <div aria-hidden className="absolute right-[6%] top-[30%] hidden lg:block">
        <div
          className="motion-float flex items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-3 py-2 shadow-[0_14px_32px_-16px_rgba(20,18,15,0.22)]"
          style={{ animation: "float-y 9s ease-in-out infinite", animationDelay: "1.4s" }}
        >
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-violet-50 text-violet-600">
            <Sparkles className="h-3 w-3" />
          </span>
          <span className="text-[11.5px] font-medium text-neutral-700">New leads found</span>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-2xl px-5 pb-24 pt-20 text-center sm:px-6 sm:pb-32 sm:pt-28">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            Get started today
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <h2 className="mt-5 text-balance font-display text-[clamp(2rem,8vw,4.25rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-950 sm:mt-6 sm:leading-[1.0]">
            Your next customer is out there.
          </h2>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-neutral-500 sm:mt-6 sm:text-lg">
            Run your first search, keep the leads worth chasing and reach them from the same place.
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-9 sm:flex-row sm:items-center">
            <a
              href="#/signup"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-6 text-sm font-medium text-white shadow-[0_1px_2px_rgba(20,18,15,0.25),0_16px_36px_-12px_rgba(20,18,15,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Start for free
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
            <a
              href="#product"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-black/[0.08] bg-white px-6 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-300 hover:text-neutral-950"
            >
              See how it works
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <ul className="mx-auto mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-medium text-neutral-400">
            {TRUST.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
