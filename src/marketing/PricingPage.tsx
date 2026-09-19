import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import Reveal from "../components/Reveal";
import { cn } from "../utils/cn";
import { MLink, Seo, breadcrumbJsonLd } from "../seo/Seo";
import MarketingLayout, { CtaBlock, DataTable, PageHero } from "./Layout";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    tagline: "For testing Zybble on a real market.",
    monthlyLeads: 100,
    costPerLead: "$0.00",
    features: [
      "100 leads / month",
      "Lead Finder",
      "Leads Database",
      "Email Validation & Verification",
      "Lead Enrichment",
    ],
    featured: false,
  },
  {
    name: "Growth",
    price: "$49",
    tagline: "For founders and teams in growth mode.",
    monthlyLeads: 5000,
    costPerLead: "$0.0098",
    features: [
      "5,000 leads / month",
      "Lead Finder",
      "Leads Database",
      "Email Validation & Verification",
      "AI Research",
      "AI Lead Scoring",
      "AI Email Writer",
      "Email Sequences & Automation",
    ],
    featured: true,
  },
  {
    name: "Agency",
    price: "$129",
    tagline: "For agencies running many campaigns.",
    monthlyLeads: 20000,
    costPerLead: "$0.0065",
    features: [
      "20,000 leads / month",
      "Lead Finder",
      "Leads Database",
      "Email Validation & Verification",
      "AI Research",
      "AI Lead Scoring",
      "AI Email Writer",
      "Email Sequences & Automation",
    ],
    featured: false,
  },
];

const FAQ = [
  {
    q: "What exactly counts as a lead?",
    a: "One lead is one unique business added to your database. If the same company appears in a later search, deduplication means it never counts twice. Leads stay in your database forever — the monthly limit only governs how many new ones you add.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There are no contracts and no cancellation flows designed to slow you down. Cancelling keeps full access until the end of the current billing period, then your account moves to Free. Your leads, campaigns and settings are never deleted on downgrade.",
  },
  {
    q: "Are there surprise charges or overage fees?",
    a: "No. Zybble enforces limits server-side: when you reach your monthly lead quota, searches simply pause until you upgrade or the month rolls over. You will never be billed extra without explicitly upgrading.",
  },
  {
    q: "Do I need my own email account to send outreach?",
    a: "Yes — and that's deliberate. Zybble sends through your own SMTP connection (Gmail, Outlook or any provider) under your own domain and reputation, which is far better for deliverability than blasting through a shared sender pool. Credentials are AES-256-GCM encrypted and never visible to the browser after saving.",
  },
  {
    q: "How does Zybble compare to Apollo, Instantly or Smartlead?",
    a: "Those platforms are broad: CRM layers, dialers, marketplaces and enterprise administration. Zybble deliberately focuses on the find → understand → reach loop for local and SMB prospecting instead of adding a broad CRM layer. If you need an enterprise CRM, we are not it; if you need a focused prospecting workflow, that is what we built.",
  },
  {
    q: "Is the free plan really free?",
    a: "Completely. 100 leads per month, every month, with the lead finder, database, email validation and enrichment included — and no credit card required to start. It exists so you can run a real search against a real market before paying anything.",
  },
];

export default function PricingPage() {
  return (
    <MarketingLayout path="/pricing">
      <Seo
        title="Pricing — Zybble | AI lead generation from $0"
        description="Zybble pricing: Free with 100 leads/month, Growth at $49/month for 5,000 leads with AI research, scoring and email automation, Agency at $129/month for 20,000 leads. No contracts, cancel anytime."
        path="/pricing"
        jsonld={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Pricing", path: "/pricing" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />

      <PageHero
        kicker="Pricing"
        center
        title={<>Simple pricing.<br />Generous free plan.</>}
        lede="Pay for leads, not seats, add-ons or hidden credits. Start free with 100 leads a month, upgrade when your pipeline outgrows it."
      />

      {/* Plan cards */}
      <div className="mx-auto grid max-w-5xl gap-4 px-6 md:grid-cols-3">
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
                <span className="text-[13px] font-medium text-neutral-400">/month</span>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-neutral-500">{p.tagline}</p>
              <ul className="mt-6 space-y-2.5 border-t border-black/[0.05] pt-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-neutral-600">
                    <Check
                      className={cn("mt-0.5 h-4 w-4 shrink-0", p.featured ? "text-neutral-950" : "text-neutral-400")}
                      strokeWidth={2.5}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-7">
                <a
                  href="#/signup"
                  className={cn(
                    "inline-flex h-10 w-full items-center justify-center rounded-xl px-4 text-[13.5px] font-medium transition-all duration-300",
                    p.featured
                      ? "bg-neutral-950 text-white shadow-[0_1px_2px_rgba(20,18,15,0.25)] hover:-translate-y-0.5 hover:bg-neutral-800"
                      : "border border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50"
                  )}
                >
                  {p.name === "Free" ? "Start for free" : `Start with ${p.name}`}
                </a>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Cost per lead math */}
      <section className="mx-auto max-w-3xl px-6 pb-4 pt-16">
        <h2 className="font-display text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-[-0.02em] text-neutral-950">
          What a lead actually costs
        </h2>
        <p className="mt-4 text-[15.5px] leading-[1.75] text-neutral-600">
          Every Zybble plan includes the same data quality — the difference is
          volume and AI. Here's the honest math per unique, deduplicated lead:
        </p>
        <div className="mt-6">
          <DataTable
            head={["Plan", "Price", "Leads / month", "Cost per lead"]}
            rows={PLANS.map((p) => [
              <>
                {p.name}
                {p.featured && <Sparkles className="ml-1.5 inline h-3.5 w-3.5 text-indigo-500" />}
              </>,
              `${p.price}/mo`,
              p.monthlyLeads.toLocaleString(),
              <span className="font-semibold text-neutral-900">{p.costPerLead}</span>,
            ])}
          />
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed text-neutral-400">
          At under a penny per researched, enriched lead, even one recovered
          customer pays for years of the Growth plan.
        </p>
      </section>

      {/* Focus statement */}
      <section className="mx-auto max-w-3xl px-6 pb-6 pt-8">
        <h2 className="font-display text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-[-0.02em] text-neutral-950">
          Focused by design, not by discount
        </h2>
        <div className="mt-4 space-y-4 text-[15.5px] leading-[1.75] text-neutral-600">
          <p>
            Zybble is intentionally not an all-in-one sales suite. There's no
            CRM to administer, no dialer to configure, no seat-based pricing to
            negotiate. You get the six steps that actually produce replies:
            find the businesses, enrich them, understand them, prioritize them,
            write to them, and follow up automatically.
          </p>
          <p>
            That focus is what keeps Zybble fast to learn, fast to run, and
            priced per outcome instead of per seat.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 pb-4 pt-8">
        <h2 className="font-display text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-[-0.02em] text-neutral-950">
          Pricing questions, answered
        </h2>
        <div className="mt-6 divide-y divide-black/[0.06] border-y border-black/[0.06]">
          {FAQ.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      <p className="mx-auto max-w-3xl px-6 pt-8 text-[13px] text-neutral-400">
        Looking for the product behind these plans? Explore the{" "}
        <MLink to="/features" className="font-medium text-neutral-700 underline underline-offset-4">
          Zybble features
        </MLink>{" "}
        or read how our customers work in the{" "}
        <MLink to="/blog" className="font-medium text-neutral-700 underline underline-offset-4">
          guides
        </MLink>
        .
      </p>

      <CtaBlock
        title="Start free. Upgrade when it works."
        sub="100 free leads every month — no credit card required."
      />
    </MarketingLayout>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-1 py-5 text-left"
      >
        <span className="text-[15px] font-semibold text-neutral-900">{q}</span>
        <span
          className={cn(
            "grid h-6 w-6 shrink-0 place-items-center rounded-full border border-neutral-300 text-[14px] text-neutral-500 transition-transform duration-300",
            open && "rotate-45 border-neutral-950 text-neutral-950"
          )}
        >
          +
        </span>
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <p className="px-1 pb-6 pr-10 text-[14.5px] leading-[1.75] text-neutral-600">{a}</p>
        </div>
      </div>
    </div>
  );
}
