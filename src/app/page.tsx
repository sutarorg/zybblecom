import { ArrowRight, Check, Star } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { LinkBar } from "@/components/marketing/link-bar";
import { MarketingNav } from "@/components/marketing/nav";
import {
  AnywhereSection,
  CreateSection,
  DashboardSection,
  FeaturesSection,
  FinalCTA,
  HowSection,
  PagesSection,
  PreviewsSection,
  StudentSection,
  ToolsSection,
  YourLinkSection,
} from "@/components/marketing/sections";
import { FAQSection } from "@/components/marketing/faq";
import { MarketingFooter } from "@/components/marketing/footer";
import { CoursePageMock, EnrollToast, StudentsToast } from "@/components/marketing/mockups";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Zybble — Sell courses with a single link",
  description:
    "Direct course selling for independent creators. Build a course, publish it to zybble.com/c/your-topic, and share it anywhere. No marketplaces. No catalogs. Your audience, your rules.",
};

function HeroBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 py-1.5 pl-2 pr-3.5 text-[12px] font-medium text-ink-soft shadow-card backdrop-blur">
      <span className="rounded-full bg-grape px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white">
        New
      </span>
      Direct course selling for independent creators
    </span>
  );
}

const TICKS = ["Free previews", "Coupons & discounts", "Progress tracking"];

function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 sm:pt-36">
      <div className="hero-grid absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-grape/15 blur-[110px]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <Reveal>
              <HeroBadge />
              <h1 className="mt-6 text-[42px] font-semibold leading-[1.04] tracking-[-0.03em] sm:text-6xl lg:text-[64px]">
                Your course deserves its{" "}
                <span className="font-display font-normal italic text-grape">own link.</span>
              </h1>
              <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-mut sm:text-[17px]">
                Zybble turns what you know into a beautiful course at a single URL. No marketplaces,
                no catalogs — share the link anywhere, and every visit is a chance to enroll.
              </p>
            </Reveal>
            <Reveal delay={100}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/signup" className="btn btn-accent btn-lg">
                  Start selling <ArrowRight className="size-4" />
                </Link>
                <a href="#how-it-works" className="btn btn-outline btn-lg">
                  See how it works
                </a>
              </div>
              <div className="mt-7">
                <LinkBar />
              </div>
            </Reveal>
            <Reveal delay={180}>
              <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
                {TICKS.map((t) => (
                  <li key={t} className="flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
                    <Check className="size-3.5 text-mint" /> {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <Reveal delay={180} className="relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <CoursePageMock className="relative z-10 rotate-2 transition-transform duration-500 hover:rotate-0" />
              <EnrollToast className="absolute -left-3 -top-8 z-20 animate-float sm:-left-10" />
              <StudentsToast className="absolute -bottom-8 -right-2 z-20 animate-float-late sm:-right-8" />
              <div
                className="absolute -inset-8 rounded-[48px] bg-gradient-to-tr from-grape/15 via-transparent to-[#c78bd4]/20 blur-2xl"
                aria-hidden
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const NICHES = [
  "Design educators",
  "Yoga teachers",
  "Music producers",
  "Code mentors",
  "Language coaches",
  "Photographers",
  "Startup founders",
  "Writers & editors",
  "Fitness coaches",
  "Illustrators",
];

const STATS = [
  { value: "3 min", label: "median time to publish" },
  { value: "12,400+", label: "lessons hosted" },
  { value: "41", label: "countries teaching" },
  { value: "4.9/5", label: "creator rating" },
];

const TESTIMONIALS = [
  {
    quote:
      "I deleted three landing-page tools the day I published on Zybble. The link is the store — my bio finally earns its keep.",
    name: "Maya Rao",
    role: "Design educator · Bengaluru",
    initials: "MR",
  },
  {
    quote:
      "My newsletter readers tap once and they're inside chapter one. No catalog, no noise — just my course and my price.",
    name: "Daniel Okafor",
    role: "Music theory creator · Lagos",
    initials: "DO",
  },
  {
    quote:
      "Coupons for launch week, previews for the skeptics, and a dashboard I check with coffee. It respects how indie creators actually work.",
    name: "Priya Nair",
    role: "Yoga teacher · Kochi",
    initials: "PN",
  },
];

function TrustSection() {
  return (
    <section id="proof" className="border-y border-line bg-cream/50 py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-center text-[12px] font-semibold uppercase tracking-[0.2em] text-mut">
            Independent creators teach here — no catalog required
          </p>
        </Reveal>
        <div className="marquee-mask mt-7 overflow-hidden">
          <div className="flex w-max animate-marquee items-center gap-3" aria-hidden>
            {[...NICHES, ...NICHES].map((n, i) => (
              <span
                key={`${n}-${i}`}
                className="whitespace-nowrap rounded-full border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink-soft shadow-card"
              >
                {n}
              </span>
            ))}
          </div>
        </div>

        <Reveal delay={100}>
          <div className="mt-12 grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-display text-3xl italic tracking-tight text-ink sm:text-4xl">
                  {s.value}
                </p>
                <p className="mt-1 text-[12.5px] text-mut">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="mt-12 grid gap-2.5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 90}>
              <figure className="flex h-full flex-col rounded-3xl border border-line bg-white p-6 shadow-card">
                <div className="flex items-center gap-1 text-amber" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="size-3.5 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-[14.5px] leading-relaxed text-ink-soft">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#b7a4ff] to-[#6d4cff] text-[11px] font-bold text-white">
                    {t.initials}
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-semibold">{t.name}</span>
                    <span className="block text-[12px] text-mut">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Zybble",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description:
      "Direct course-selling platform. Create a course, publish it to your own link, and share it anywhere.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingNav />
      <main>
        <Hero />
        <TrustSection />
        <YourLinkSection />
        <CreateSection />
        <PagesSection />
        <AnywhereSection />
        <DashboardSection />
        <StudentSection />
        <ToolsSection />
        <HowSection />
        <FeaturesSection />
        <PreviewsSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <MarketingFooter />
    </>
  );
}
