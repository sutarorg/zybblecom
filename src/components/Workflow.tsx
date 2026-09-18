import { ArrowRight, Database, FileSearch, Gauge, PenLine, Search, Send } from "lucide-react";
import type { ReactNode } from "react";
import Reveal from "./Reveal";

type Step = {
  n: string;
  title: string;
  desc: string;
  icon: ReactNode;
};

const STEPS: Step[] = [
  {
    n: "01",
    title: "Find",
    desc: "Discover businesses that match your exact target market — by industry, location, size and more.",
    icon: <Search className="h-[15px] w-[15px]" />,
  },
  {
    n: "02",
    title: "Enrich",
    desc: "Turn raw listings into complete, outreach-ready leads with verified emails and useful company data.",
    icon: <Database className="h-[15px] w-[15px]" />,
  },
  {
    n: "03",
    title: "Understand",
    desc: "Let AI research every business — what they do, how they present themselves, and where they're winning.",
    icon: <FileSearch className="h-[15px] w-[15px]" />,
  },
  {
    n: "04",
    title: "Prioritize",
    desc: "AI scoring ranks every lead by fit, so you can review the strongest opportunities first.",
    icon: <Gauge className="h-[15px] w-[15px]" />,
  },
  {
    n: "05",
    title: "Write",
    desc: "Generate personal, on-point outreach in your voice — grounded in real research, not templates.",
    icon: <PenLine className="h-[15px] w-[15px]" />,
  },
  {
    n: "06",
    title: "Reach",
    desc: "Launch automated follow-ups that keep the conversation moving until you get a reply.",
    icon: <Send className="h-[15px] w-[15px]" />,
  },
];

export default function Workflow() {
  return (
    <section id="product" className="scroll-mt-16">
      <div className="mx-auto grid max-w-[1180px] gap-14 px-6 py-24 sm:px-10 md:py-36 lg:grid-cols-[1fr_1.35fr] lg:gap-24">
        {/* Left — sticky editorial header */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Reveal>
            <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
              <span className="h-px w-8 bg-neutral-300" />
              The Zybble workflow
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-6 max-w-md font-display text-[clamp(2rem,3.8vw,3.25rem)] font-semibold leading-[1.03] tracking-[-0.032em] text-neutral-950">
              Everything you need to turn prospects into customers.
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-neutral-500">
              Six connected steps in one simple platform — from first search
              to a thoughtful outreach workflow, without stitching five tools together.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <a
              href="#solutions"
              className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-neutral-950"
            >
              See it in action
              <span className="grid h-6 w-6 place-items-center rounded-full border border-neutral-300 transition-all duration-300 group-hover:border-neutral-950 group-hover:bg-neutral-950 group-hover:text-white">
                <ArrowRight className="h-3 w-3" />
              </span>
            </a>
          </Reveal>
        </div>

        {/* Right — editorial step list */}
        <ol className="border-t border-black/[0.06]">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.06}>
              <li className="group flex items-start gap-6 border-b border-black/[0.06] py-7 md:gap-10 md:py-8">
                <span className="w-8 shrink-0 pt-1 font-display text-[13px] font-semibold tracking-[0.1em] text-neutral-300 transition-colors duration-300 group-hover:text-indigo-500">
                  {s.n}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[20px] font-semibold tracking-[-0.015em] text-neutral-950 transition-transform duration-300 group-hover:translate-x-1 md:text-[21px]">
                    {s.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-[14.5px] leading-relaxed text-neutral-500">
                    {s.desc}
                  </p>
                </div>
                <span className="ml-auto mt-0.5 hidden h-9 w-9 shrink-0 place-items-center rounded-full border border-black/[0.07] text-neutral-400 transition-all duration-300 group-hover:border-neutral-400 group-hover:text-neutral-900 md:grid">
                  {s.icon}
                </span>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
