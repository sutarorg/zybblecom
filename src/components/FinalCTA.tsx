import { ArrowRight, Gauge, Sparkles } from "lucide-react";
import Reveal from "./Reveal";

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle abstract backdrop — thin rings + soft AI glow */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(99,102,241,0.05),transparent_70%)]"
      />
      <svg
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[560px] w-[960px] -translate-x-1/2 -translate-y-1/2 [mask-image:radial-gradient(closest-side,black_40%,transparent_100%)]"
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

      {/* Echoes of the hero — floating signal chips */}
      <div
        aria-hidden
        className="absolute left-[8%] top-[26%] hidden lg:block"
      >
        <div
          className="motion-float flex items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-3 py-2 shadow-[0_14px_32px_-16px_rgba(20,18,15,0.22)]"
          style={{ animation: "float-y 8s ease-in-out infinite" }}
        >
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
            <Gauge className="h-3 w-3" />
          </span>
          <span className="text-[11.5px] font-medium text-neutral-700">
            AI Score 94
          </span>
        </div>
      </div>
      <div
        aria-hidden
        className="absolute bottom-[22%] right-[7%] hidden lg:block"
      >
        <div
          className="motion-float flex items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-3 py-2 shadow-[0_14px_32px_-16px_rgba(20,18,15,0.22)]"
          style={{ animation: "float-y 9s ease-in-out infinite", animationDelay: "1.4s" }}
        >
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-violet-50 text-violet-600">
            <Sparkles className="h-3 w-3" />
          </span>
          <span className="text-[11.5px] font-medium text-neutral-700">
            142 new leads found
          </span>
        </div>
      </div>

      <div className="relative mx-auto max-w-2xl px-6 py-28 text-center sm:py-40">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            Get started today
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-6 font-display text-[clamp(2.4rem,5.6vw,4.25rem)] font-semibold leading-[1.0] tracking-[-0.04em] text-neutral-950">
            Your next customer
            <br />
            is out there.
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-6 text-lg leading-relaxed text-neutral-500">
            Find them with Zybble.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <a
            href="#/signup"
            className="group mt-9 inline-flex h-12 items-center gap-2 rounded-xl bg-neutral-950 px-6 text-sm font-medium text-white shadow-[0_1px_2px_rgba(20,18,15,0.25),0_16px_36px_-12px_rgba(20,18,15,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-800"
          >
            Start for free
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </a>
        </Reveal>
        <Reveal delay={0.3}>
          <p className="mt-5 text-[12px] font-medium text-neutral-400">
            Free plan included · Set up in minutes
          </p>
        </Reveal>
      </div>
    </section>
  );
}
