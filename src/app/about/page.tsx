import { Compass, Gem, Users } from "lucide-react";
import type { Metadata } from "next";
import { MarketingSubPage } from "@/components/marketing/page-shell";
import { FinalCTA } from "@/components/marketing/sections";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "About",
  description:
    "Zybble exists for one reason: the best teachers on the internet shouldn't need a storefront, a funnel, or a marketplace to get paid for what they know.",
};

const PRINCIPLES = [
  {
    icon: Users,
    title: "Direct by default",
    body: "No catalogs, no competing courses beside yours, no algorithm deciding your reach. Your link brings your audience — and they stay yours.",
  },
  {
    icon: Gem,
    title: "Craft over clutter",
    body: "We'd rather ship ten features that feel effortless than fifty that need a manual. Every screen is designed to be understood in one glance.",
  },
  {
    icon: Compass,
    title: "Teachers set the terms",
    body: "Your price, your discounts, your previews, your link — changeable any day, effective immediately. A platform should take orders from you, not the other way around.",
  },
];

export default function AboutPage() {
  return (
    <MarketingSubPage
      eyebrow="About Zybble"
      title="Courses belong to the people who make them."
      sub="Zybble is built by a small, independent team for people who have something real to teach."
    >
      <div className="mx-auto max-w-3xl px-4 pb-6 pt-12 sm:px-6">
        <Reveal>
          <div className="space-y-5 text-[15.5px] leading-[1.85] text-ink-soft">
            <p>
              Somewhere along the way, selling a course online became a project in itself: pick a
              storefront, build a funnel, fight a marketplace algorithm, maybe learn a page builder.
              The actual teaching — the thing only you can do — became the last item on the list.
            </p>
            <p>
              Zybble removes the middle entirely. You build a course once, and it lives at a single
              link that works everywhere your audience already is. That link is the sales page, the
              enrollment flow, and the classroom door. There's nothing to integrate because there's
              nothing between you and your student.
            </p>
            <p>
              We think the next generation of great educators won't come out of institutions —
              they'll be practitioners who share what they know directly. Zybble is the
              infrastructure for that future: quiet, fast, and out of your way.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-2.5 sm:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 80}>
              <div className="h-full rounded-3xl border border-line bg-white p-6 shadow-card">
                <span className="grid size-11 place-items-center rounded-2xl bg-grape-soft text-grape">
                  <p.icon className="size-5" />
                </span>
                <h2 className="mt-4 text-[15.5px] font-semibold tracking-tight">{p.title}</h2>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-mut">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <figure className="mt-12 rounded-[32px] bg-ink px-6 py-10 text-center sm:px-10 sm:py-14">
            <blockquote className="mx-auto max-w-xl font-display text-2xl italic leading-snug text-paper sm:text-3xl">
              &ldquo;Give a teacher a link, and they can build a school.&rdquo;
            </blockquote>
            <figcaption className="mt-4 text-[12.5px] text-paper/50">
              — the note Zybble was founded on
            </figcaption>
          </figure>
        </Reveal>
      </div>
      <FinalCTA />
    </MarketingSubPage>
  );
}
