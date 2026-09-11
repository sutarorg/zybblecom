import { Check, TicketPercent, BarChart3, Link2, Layers, Rocket } from "lucide-react";
import type { Metadata } from "next";
import { MarketingSubPage } from "@/components/marketing/page-shell";
import { FinalCTA } from "@/components/marketing/sections";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Creator guide",
  description:
    "From blank page to your first enrolled student — the complete Zybble creator guide in five steps.",
};

const STEPS: {
  n: string;
  icon: typeof Layers;
  title: string;
  body: string;
  tips: string[];
}[] = [
  {
    n: "01",
    icon: Rocket,
    title: "Create your account and first course",
    body: "Sign up as a creator and hit New course. Zybble starts you with a clean draft — title it something a buyer would actually search for, then open the builder.",
    tips: [
      "Write the title like a promise: 'The Indie Design System', not 'My design course'.",
      "Your dashboard is home base — return to it any time from your profile menu.",
    ],
  },
  {
    n: "02",
    icon: Layers,
    title: "Build the curriculum, chapter by chapter",
    body: "Chapters are the acts of your course; lessons are the scenes. Add video, PDF, or written lessons in any order, attach downloadable resources, and reorder everything with a tap.",
    tips: [
      "Aim for 5–9 lessons per chapter — long chapters exhaust students.",
      "Mark your strongest lesson as a free preview: it's your best salesperson.",
      "Attach the files students always ask you for — templates, slides, checklists.",
    ],
  },
  {
    n: "03",
    icon: Link2,
    title: "Set a price and choose your link",
    body: "Price in rupees — or set it to zero for a free course and instant enrollment. Pick a slug that's short, memorable, and easy to say out loud: zybble.com/c/your-topic.",
    tips: [
      "Paid courses start at ₹49; free courses are perfect lead magnets.",
      "Say the link out loud. If it's easy to repeat on a podcast, it's a good link.",
      "You can rename the slug later from the builder — the course moves with it.",
    ],
  },
  {
    n: "04",
    icon: Rocket,
    title: "Publish and share everywhere",
    body: "One tap publishes your page. Now distribute the link where your audience already lives: bio, pinned post, newsletter, YouTube description, community welcome message.",
    tips: [
      "Copy the link from the builder's Copy link button — no typos.",
      "Pair every launch post with a reason to click now: a coupon or a cohort date.",
      "Ask your first ten students for a testimonial you can quote.",
    ],
  },
  {
    n: "05",
    icon: BarChart3,
    title: "Read the numbers, iterate, repeat",
    body: "Your dashboard shows the last thirty days of revenue, every order, and course-level performance. Use coupons for launches, watch completion, and improve the lessons where students stall.",
    tips: [
      "Create a launch coupon with an expiry to create honest urgency.",
      "Low completion on one lesson? Shorten it or split it in two.",
      "Check orders after every share — you'll learn which channels actually convert.",
    ],
  },
];

export default function GuidePage() {
  return (
    <MarketingSubPage
      eyebrow="Creator guide"
      title="From blank page to first student, in five steps."
      sub="The exact path every successful Zybble creator takes — with the small decisions that make it work."
    >
      <div className="mx-auto max-w-3xl px-4 pb-6 pt-12 sm:px-6">
        <div className="space-y-10">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 60}>
              <article className="relative">
                {i < STEPS.length - 1 && (
                  <span
                    className="absolute left-[27px] top-16 bottom-[-40px] w-px bg-gradient-to-b from-line to-transparent"
                    aria-hidden
                  />
                )}
                <div className="flex items-start gap-5">
                  <span className="relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl border border-line bg-white font-display text-lg italic text-grape shadow-card">
                    {step.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[21px] font-semibold tracking-[-0.01em]">{step.title}</h2>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{step.body}</p>
                    <ul className="mt-4 space-y-2.5">
                      {step.tips.map((tip) => (
                        <li key={tip} className="flex items-start gap-2.5 text-[13.5px] text-ink-soft">
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-mint-soft text-mint">
                            <Check className="size-3" />
                          </span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <div className="mt-14 rounded-3xl border border-grape/25 bg-grape-soft p-6 text-center sm:p-8">
            <TicketPercent className="mx-auto size-6 text-grape" />
            <p className="mt-3 font-display text-2xl italic tracking-tight text-ink">
              The best time to publish was yesterday.
            </p>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] text-mut">
              Your first course can be an evening of work. The second one takes half as long.
            </p>
          </div>
        </Reveal>
      </div>
      <FinalCTA />
    </MarketingSubPage>
  );
}
