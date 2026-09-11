import { ArrowRight, LifeBuoy } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingSubPage } from "@/components/marketing/page-shell";
import { FAQSection } from "@/components/marketing/faq";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about selling courses with a single link — content formats, coupons, free courses, progress tracking, and how Zybble differs from a marketplace.",
};

export default function FAQPage() {
  return (
    <MarketingSubPage
      eyebrow="FAQ"
      title="Questions, answered straight."
      sub="Everything creators and students usually ask before their first course goes live."
    >
      <div className="-mt-10">
        <FAQSection />
      </div>
      <div className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <Reveal>
          <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-line bg-white p-6 text-center shadow-card sm:flex-row sm:p-7 sm:text-left">
            <div className="flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-grape-soft text-grape">
                <LifeBuoy className="size-5" />
              </span>
              <div>
                <p className="text-[16px] font-semibold tracking-tight">Still stuck?</p>
                <p className="mt-0.5 text-[13.5px] text-mut">
                  We answer every message personally — usually within a day.
                </p>
              </div>
            </div>
            <Link href="/support" className="btn btn-ink btn-md shrink-0">
              Contact support <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </MarketingSubPage>
  );
}
