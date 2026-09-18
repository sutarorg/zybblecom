import { ArrowRight, Check } from "lucide-react";
import type { ReactNode } from "react";
import Reveal from "../Reveal";
import {
  MockFinder,
  MockResearch,
  MockScore,
  MockSequence,
  MockWriter,
} from "./mocks";

type Section = {
  id?: string;
  n: string;
  tag: string;
  title: string;
  copy: string;
  bullets: string[];
  cta: string;
  mock: ReactNode;
  ambient: string;
};

const SECTIONS: Section[] = [
  {
    id: "features",
    n: "01",
    tag: "Find",
    title: "Find leads without the endless searching.",
    copy: "Describe your market in plain language. Zybble searches public business listings and returns clean, deduplicated leads with the context you need to decide who to contact.",
    bullets: [
      "Search by industry, location and size",
      "Verified emails and company data included",
      "Export, or send straight to outreach",
    ],
    cta: "Try the lead finder",
    mock: <MockFinder />,
    ambient:
      "bg-[radial-gradient(70%_70%_at_65%_45%,rgba(56,189,248,0.10),transparent_70%)]",
  },
  {
    n: "02",
    tag: "Prioritize",
    title: "Know which leads are actually worth your time.",
    copy: "Every lead is scored from 0–100 against your ideal customer profile. Fit, reputation and growth signals — distilled into one number you can trust.",
    bullets: [
      "Transparent score breakdowns",
      "Fit measured against your real ICP",
      "Focus your effort on the strongest fit signals",
    ],
    cta: "See AI scoring",
    mock: <MockScore />,
    ambient:
      "bg-[radial-gradient(70%_70%_at_35%_45%,rgba(99,102,241,0.09),transparent_70%)]",
  },
  {
    n: "03",
    tag: "Understand",
    title: "Understand every prospect before you reach out.",
    copy: "Zybble reads each business's website, reviews and footprint, then hands you a brief: what they do, what they care about, and a potential angle to review.",
    bullets: [
      "Company briefs from public signals",
      "Signals from reviews and the web",
      "A clear outreach angle to review",
    ],
    cta: "Explore AI research",
    mock: <MockResearch />,
    ambient:
      "bg-[radial-gradient(70%_70%_at_65%_45%,rgba(245,158,11,0.08),transparent_70%)]",
  },
  {
    n: "04",
    tag: "Write",
    title: "Write outreach that sounds like you.",
    copy: "Not templates — real personalization. Zybble drafts concise, human emails grounded in its research, in the tone you choose.",
    bullets: [
      "Personalized from real research",
      "Your tone, fully controlled",
      "Subject lines that get opened",
    ],
    cta: "Meet the AI writer",
    mock: <MockWriter />,
    ambient:
      "bg-[radial-gradient(70%_70%_at_35%_45%,rgba(139,92,246,0.08),transparent_70%)]",
  },
  {
    n: "05",
    tag: "Reach",
    title: "Follow up without following up manually.",
    copy: "Give each follow-up a clear job. Set a simple cadence once — Zybble sends, waits and follows up until you get an answer.",
    bullets: [
      "Simple day-based cadences",
      "Stops automatically on reply",
      "Every touch personalized",
    ],
    cta: "Build a sequence",
    mock: <MockSequence />,
    ambient:
      "bg-[radial-gradient(70%_70%_at_65%_45%,rgba(16,185,129,0.08),transparent_70%)]",
  },
];

function SectionBlock({ s, i }: { s: Section; i: number }) {
  const reversed = i % 2 === 1;

  return (
    <article
      id={s.id}
      className="grid scroll-mt-24 items-center gap-12 border-t border-black/[0.05] py-16 first:border-t-0 md:py-24 lg:grid-cols-2 lg:gap-20"
    >
      {/* Copy */}
      <div className={reversed ? "lg:order-2" : ""}>
        <Reveal>
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
            {s.n}
            <span className="h-px w-8 bg-neutral-300" />
            {s.tag}
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h3 className="mt-6 max-w-md font-display text-[clamp(1.8rem,3.3vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.028em] text-neutral-950">
            {s.title}
          </h3>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-neutral-500">
            {s.copy}
          </p>
        </Reveal>
        <Reveal delay={0.22}>
          <ul className="mt-6 space-y-2.5">
            {s.bullets.map((b) => (
              <li
                key={b}
                className="flex items-center gap-2.5 text-[13.5px] font-medium text-neutral-600"
              >
                <Check className="h-4 w-4 text-emerald-500" strokeWidth={2.5} />
                {b}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.28}>
          <a
            href="#pricing"
            className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-neutral-950"
          >
            {s.cta}
            <span className="grid h-6 w-6 place-items-center rounded-full border border-neutral-300 transition-all duration-300 group-hover:border-neutral-950 group-hover:bg-neutral-950 group-hover:text-white">
              <ArrowRight className="h-3 w-3" />
            </span>
          </a>
        </Reveal>
      </div>

      {/* Visual */}
      <Reveal delay={0.15} className={reversed ? "lg:order-1" : ""}>
        <div className="group relative">
          <div
            aria-hidden
            className={`absolute -inset-6 rounded-full blur-2xl sm:-inset-10 ${s.ambient}`}
          />
          <div
            aria-hidden
            className="absolute -right-8 -top-8 hidden h-36 w-36 rounded-full border border-black/[0.05] sm:block"
          />
          <div
            aria-hidden
            className="absolute -bottom-10 -left-10 hidden h-44 w-44 rounded-full border border-black/[0.04] sm:block"
          />
          <div className="relative transition-transform duration-500 ease-out group-hover:-translate-y-1.5">
            {s.mock}
          </div>
        </div>
      </Reveal>
    </article>
  );
}

export default function Showcase() {
  return (
    <section id="solutions" className="scroll-mt-16">
      <div className="mx-auto max-w-[1180px] px-6 pb-8 sm:px-10">
        {SECTIONS.map((s, i) => (
          <SectionBlock key={s.tag} s={s} i={i} />
        ))}
      </div>
    </section>
  );
}
