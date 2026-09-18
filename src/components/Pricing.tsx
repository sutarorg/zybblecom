import { Check } from "lucide-react";
import { cn } from "../utils/cn";
import Reveal from "./Reveal";

type Plan = {
  name: string;
  price: string;
  blurb: string;
  features: string[];
  cta: string;
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    blurb: "For testing Zybble on a real market.",
    features: [
      "100 leads / month",
      "Lead finder with filters",
      "AI research previews",
      "Email verification",
      "1 connected sender",
    ],
    cta: "Start for free",
  },
  {
    name: "Growth",
    price: "$49",
    blurb: "For founders and teams in growth mode.",
    features: [
      "5,000 leads / month",
      "AI scoring & enrichment",
      "AI email writer",
      "Automated follow-up sequences",
      "3 connected senders",
      "Priority email support",
    ],
    cta: "Start with Growth",
    featured: true,
  },
  {
    name: "Agency",
    price: "$129",
    blurb: "For agencies running many campaigns.",
    features: [
      "20,000 leads / month",
      "Everything in Growth",
      "Client workspaces",
      "5 team seats included",
      "Shared lead pools & exports",
      "Dedicated success manager",
    ],
    cta: "Scale with Zybble",
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-16">
      <div className="border-t border-black/[0.05] bg-neutral-50/50">
        <div className="mx-auto max-w-[1180px] px-6 py-24 sm:px-10 md:py-32">
          <div className="mx-auto max-w-xl text-center">
            <Reveal>
              <p className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                <span className="h-px w-8 bg-neutral-300" />
                Pricing
                <span className="h-px w-8 bg-neutral-300" />
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-6 font-display text-[clamp(2rem,3.8vw,3.25rem)] font-semibold leading-[1.03] tracking-[-0.032em] text-neutral-950">
                Start free. Grow when you're ready.
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-5 text-[16px] leading-relaxed text-neutral-500">
                Every plan includes verified emails and AI research. No
                contracts — cancel anytime.
              </p>
            </Reveal>
          </div>

          <div className="mx-auto mt-14 grid max-w-[1060px] gap-4 md:grid-cols-3 md:gap-5">
            {PLANS.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.08} className="h-full">
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-[22px] border bg-white p-7 transition-shadow duration-500",
                    p.featured
                      ? "border-neutral-950 shadow-[0_2px_4px_rgba(20,18,15,0.06),0_28px_56px_-24px_rgba(20,18,15,0.3)]"
                      : "border-black/[0.07] shadow-sm hover:shadow-[0_20px_44px_-20px_rgba(20,18,15,0.18)]"
                  )}
                >
                  {p.featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-neutral-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                      Most popular
                    </span>
                  )}

                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    {p.name}
                  </p>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="font-display text-[42px] font-semibold leading-none tracking-[-0.03em] text-neutral-950">
                      {p.price}
                    </span>
                    <span className="text-[13px] font-medium text-neutral-400">
                      /month
                    </span>
                  </div>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-neutral-500">
                    {p.blurb}
                  </p>

                  <ul className="mt-7 space-y-2.5 border-t border-black/[0.05] pt-6">
                    {p.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2.5 text-[13.5px] text-neutral-600"
                      >
                        <Check
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            p.featured ? "text-neutral-950" : "text-neutral-400"
                          )}
                          strokeWidth={2.5}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-8">
                    <a
                      href="#/signup"
                      className={cn(
                        "inline-flex h-10 w-full items-center justify-center rounded-xl px-4 text-[13.5px] font-medium transition-all duration-300",
                        p.featured
                          ? "bg-neutral-950 text-white shadow-[0_1px_2px_rgba(20,18,15,0.25),0_12px_28px_-10px_rgba(20,18,15,0.35)] hover:-translate-y-0.5 hover:bg-neutral-800"
                          : "border border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50"
                      )}
                    >
                      {p.cta}
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <p className="mt-10 text-center text-[12px] text-neutral-400">
              Prices in USD, billed monthly. Upgrade or cancel from your account.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
