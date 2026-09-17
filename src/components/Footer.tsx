import Logo from "./Logo";

import { MLink } from "../seo/Seo";

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Lead finder", to: "/features/lead-finder" },
      { label: "Lead enrichment", to: "/features/lead-enrichment" },
      { label: "AI scoring", to: "/features/ai-lead-scoring" },
      { label: "AI email writer", to: "/features/ai-email-writer" },
      { label: "Sequences", to: "/features/email-sequences" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", to: "/blog" },
      { label: "Build a local lead list", to: "/blog/build-a-local-lead-list" },
      { label: "Deliverability checklist", to: "/blog/cold-email-deliverability-checklist" },
      { label: "How AI scoring works", to: "/blog/how-ai-lead-scoring-works" },
      { label: "Pricing", to: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/about#contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
      { label: "Security", to: "/privacy#security" },
      { label: "DPA", to: "/privacy#dpa" },
    ],
  },
];

export default function Footer() {
  return (
    <footer id="resources" className="relative z-10 scroll-mt-16">
      <div className="mx-auto max-w-[1120px] px-6 pb-10 pt-16 sm:pt-20">
        <div className="grid gap-12 md:grid-cols-[1.5fr_repeat(4,1fr)] md:gap-8">
          {/* Brand */}
          <div>
            <Logo />
            <p className="mt-5 max-w-[250px] text-[13px] leading-relaxed text-neutral-500">
              Find, understand and reach the businesses that need you — in one
              simple platform.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/60 px-3 py-1.5 text-[11.5px] font-medium text-neutral-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              System status monitored
            </p>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <MLink
                      to={l.to}
                      className="text-[13.5px] text-neutral-600 transition-colors hover:text-neutral-950"
                    >
                      {l.label}
                    </MLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-black/[0.06] pt-7">
          <p className="text-[12px] text-neutral-400">
            © 2026 Zybble, Inc. All rights reserved.
          </p>
          <a
            href="mailto:hello@zybble.com"
            className="text-[12px] text-neutral-400 transition-colors hover:text-neutral-900"
          >
            hello@zybble.com
          </a>
        </div>
      </div>
    </footer>
  );
}
