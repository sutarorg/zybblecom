import type { Metadata } from "next";
import { MarketingSubPage } from "@/components/marketing/page-shell";
import { StatusChecker } from "@/components/marketing/status-checker";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Status",
  description: "Live operational status of the Zybble platform, checked in real time.",
};

export default function StatusPage() {
  return (
    <MarketingSubPage
      eyebrow="Status"
      title="Is Zybble up right now?"
      sub="This page probes the live platform from your browser — no cached status, no PR gloss."
    >
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
        <Reveal>
          <StatusChecker />
        </Reveal>
        <Reveal delay={100}>
          <div className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-card sm:p-7">
            <h2 className="text-[15px] font-semibold tracking-tight">Incident history</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-mut">
              No incidents have been reported in the last 90 days. If you're experiencing a problem
              that this page doesn't show, tell us at{" "}
              <a href="mailto:support@zybble.com" className="font-medium text-ink underline">
                support@zybble.com
              </a>{" "}
              and include the time and your course link.
            </p>
          </div>
        </Reveal>
      </div>
    </MarketingSubPage>
  );
}
