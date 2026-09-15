import { Eye, Mail, ShieldCheck, Sparkles, Users } from "lucide-react";
import { MLink, Seo, breadcrumbJsonLd } from "../seo/Seo";
import MarketingLayout, { CtaBlock, Kicker, PageHero, ProseSection } from "./Layout";

const PRINCIPLES = [
  {
    icon: Eye,
    title: "Public data only, always",
    body: "Zybble collects publicly listed business information — listings, websites, business-published emails. Never personal profiles, never scraped social data, never sensitive personal information.",
  },
  {
    icon: Sparkles,
    title: "AI that shows its work",
    body: "Every score carries written reasons. Every research brief derives from real record fields. Every email draft is grounded in data you can inspect. We never let the model invent customers, technologies or facts.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance as architecture",
    body: "One-click unsubscribe honors every send, suppression is permanent and account-wide, bounces classify and block automatically. Good deliverability and good law point the same direction; we build both.",
  },
  {
    icon: Users,
    title: "Focused on the loop that pays",
    body: "Find, understand, reach. No CRM sprawl, no dialers, no enterprise administration. Simplicity is a feature we defend on purpose.",
  },
];

export default function AboutPage() {
  return (
    <MarketingLayout path="/about">
      <Seo
        title="About Zybble — AI lead generation, simplified"
        description="Zybble helps agencies, founders and sales teams find, understand and reach their next customers. Learn about our principles, our data practices and how to contact us."
        path="/about"
        jsonld={[
          breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "About", path: "/about" }]),
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "About Zybble",
            description:
              "About Zybble, Inc. — the team and principles behind the AI-powered lead generation and outreach platform.",
            url: "https://zybble.com/about",
            isPartOf: { "@id": "https://zybble.com/#website" },
          },
        ]}
      />

      <PageHero
        kicker="About Zybble"
        title={<>Prospecting shouldn't feel like<br />operating a spreadsheet farm.</>}
        lede="Zybble is an AI-powered lead generation and outreach platform built by people who kept losing hours to tools that were powerful in demos and exhausting in practice."
      />

      <ProseSection title="What Zybble is">
        <p>
          Zybble turns one continuous motion — find the businesses, understand
          them, reach them — into a single, simple workflow. You describe your
          market in plain language. Zybble searches public listings, enriches
          each business with the data that decides fit, finds the email the
          business itself published, and then helps you score, write and
          follow up automatically.
        </p>
        <p>
          It's used by agencies prospecting on behalf of clients, founders
          doing their own sales, and small sales teams who need pipeline more
          than they need another platform to administer.
        </p>
      </ProseSection>

      <section className="mx-auto max-w-4xl px-6 pb-12">
        <Kicker>What we believe</Kicker>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div
              key={p.title}
              className="rounded-[20px] border border-black/[0.06] bg-white p-6 shadow-sm"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-600">
                <p.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-neutral-950">{p.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-500">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <ProseSection title="How our data actually works">
        <p>
          Transparency about data provenance is an E-E-A-T principle we hold
          ourselves to, not just a compliance footnote. Every lead in Zybble
          traces to a public listing and, where present, the business's own
          public website. Every email stores the exact page URL where it was
          found. Every enrichment is dated. When our AI writes about a
          business, it reads from those same verified fields — and nothing
          else.
        </p>
        <p>
          We think proving where information came from will matter more every
          year, not less. Products that can't show provenance for their data
          will increasingly be asked to.
        </p>
      </ProseSection>

      <ProseSection title="Who it's for">
        <p>
          <strong className="font-semibold text-neutral-900">Agencies</strong>{" "}
          running lead generation for clients across verticals — multi-market
          searches, client-scale quotas, exports and sequences.{" "}
          <strong className="font-semibold text-neutral-900">Founders</strong>{" "}
          doing founder-led sales who need an hour a day, not a new job.{" "}
          <strong className="font-semibold text-neutral-900">Sales teams</strong>{" "}
          at SMB-focused companies who want pipeline without CRM tax. If your
          customers are local and B2B businesses, Zybble was designed for your
          exact Monday morning.
        </p>
      </ProseSection>

      <section id="contact" className="mx-auto max-w-3xl scroll-mt-24 px-6 pb-8">
        <Kicker>Contact</Kicker>
        <div className="mt-5 rounded-[20px] border border-black/[0.06] bg-white p-6 sm:flex sm:items-center sm:gap-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-950 text-white">
            <Mail className="h-5 w-5" />
          </span>
          <div className="mt-4 sm:mt-0">
            <h3 className="text-[15px] font-semibold text-neutral-950">Talk to a human</h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-neutral-500">
              Product questions, security reviews, press, partnerships — we read
              everything.
            </p>
            <a
              href="mailto:hello@zybble.com"
              className="mt-2 inline-block text-[14px] font-semibold text-neutral-950 underline underline-offset-4"
            >
              hello@zybble.com
            </a>
          </div>
        </div>
        <p className="mt-4 text-[12.5px] text-neutral-400">
          Zybble, Inc. · Remote-first team · For legal details see{" "}
          <MLink to="/privacy" className="font-medium text-neutral-600 underline underline-offset-4">
            Privacy
          </MLink>{" "}
          and{" "}
          <MLink to="/terms" className="font-medium text-neutral-600 underline underline-offset-4">
            Terms
          </MLink>
          .
        </p>
      </section>

      <CtaBlock
        title="See what we built for your Monday morning."
        sub="100 free leads every month — no credit card required."
      />
    </MarketingLayout>
  );
}
