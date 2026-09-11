"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

const FAQS = [
  {
    q: "Do I need my own website to use Zybble?",
    a: "No. Your course lives at your Zybble link — zybble.com/c/your-topic. That URL is the landing page, the enrollment page, and the classroom door. If you already have a website, just link out to it.",
  },
  {
    q: "Is Zybble a marketplace? Will buyers browse a catalog?",
    a: "Deliberately not. There is no public catalog and no competing courses next to yours. Buyers arrive only through the links you share — your audience stays your audience.",
  },
  {
    q: "What can my lessons include?",
    a: "Each lesson can be a video (YouTube, Vimeo, or a direct file), a downloadable PDF, or rich written content. You can attach resources — templates, worksheets, links — to any lesson, and mark any lesson as a free preview.",
  },
  {
    q: "Can I run discounts or launch offers?",
    a: "Yes. Create coupon codes per course — percentage or flat — with optional expiry dates and usage caps. Buyers apply them right on the course page.",
  },
  {
    q: "Can I offer a course for free?",
    a: "Absolutely. Set the price to zero and enrollment becomes instant — perfect for lead magnets, community cohorts, or a first taste of your teaching.",
  },
  {
    q: "How do students track their progress?",
    a: "Every student gets a personal library. Lessons are checked off as they're completed, progress bars update automatically, and returning students resume exactly where they left off.",
  },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <span className="eyebrow">
            <span className="eyebrow-dot" /> FAQ
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] sm:text-[40px]">
            Questions, answered straight.
          </h2>
        </Reveal>
        <div className="mt-10 divide-y divide-line rounded-3xl border border-line bg-white shadow-card">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={i * 40}>
                <div>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-7"
                  >
                    <span className="text-[15px] font-semibold tracking-tight">{item.q}</span>
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full border border-line text-mut transition-all duration-300",
                        isOpen && "rotate-180 border-grape bg-grape text-white",
                      )}
                    >
                      <ChevronDown className="size-4" />
                    </span>
                  </button>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-out",
                      isOpen ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-6 text-[14.5px] leading-relaxed text-mut sm:px-7">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
