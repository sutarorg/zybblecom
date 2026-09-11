import { ArrowUpRight, Handshake, Mail, Megaphone, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { MarketingSubPage } from "@/components/marketing/page-shell";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach the Zybble team — general enquiries, support, partnerships, and press.",
};

const CHANNELS = [
  {
    icon: Mail,
    title: "General",
    email: "hello@zybble.com",
    desc: "Questions about Zybble, your account, or anything that doesn't fit elsewhere.",
    subject: "Hello Zybble",
  },
  {
    icon: ShieldAlert,
    title: "Support",
    email: "support@zybble.com",
    desc: "Something broken, a student stuck, or a course misbehaving. Include your course link.",
    subject: "Support request",
  },
  {
    icon: Handshake,
    title: "Partnerships",
    email: "partners@zybble.com",
    desc: "Communities, newsletters, and tools that want to build alongside Zybble.",
    subject: "Partnership enquiry",
  },
  {
    icon: Megaphone,
    title: "Press",
    email: "press@zybble.com",
    desc: "Media requests, interviews, and creator-economy commentary.",
    subject: "Press enquiry",
  },
];

export default function ContactPage() {
  return (
    <MarketingSubPage
      eyebrow="Contact"
      title="Talk to a human."
      sub="Every inbox is read by the people building Zybble. No ticket queues, no bots pretending."
    >
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-12 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {CHANNELS.map((c, i) => (
            <Reveal key={c.title} delay={i * 70}>
              <a
                href={`mailto:${c.email}?subject=${encodeURIComponent(c.subject)}`}
                className="group flex h-full flex-col rounded-3xl border border-line bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-grape/40"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-grape-soft text-grape transition-colors duration-300 group-hover:bg-grape group-hover:text-white">
                    <c.icon className="size-5" />
                  </span>
                  <ArrowUpRight className="size-4 text-mut transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-grape" />
                </div>
                <h2 className="mt-4 text-[16px] font-semibold tracking-tight">{c.title}</h2>
                <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-mut">{c.desc}</p>
                <p className="mt-4 font-mono text-[13px] font-medium text-grape-deep">{c.email}</p>
              </a>
            </Reveal>
          ))}
        </div>

        <Reveal delay={140}>
          <div className="mt-10 rounded-3xl border border-line bg-white p-6 text-center shadow-card sm:p-8">
            <p className="text-[15px] font-semibold tracking-tight">What to expect</p>
            <p className="mx-auto mt-2 max-w-lg text-[13.5px] leading-relaxed text-mut">
              We reply within one business day, usually much faster. When you write, include the
              email on your account and any relevant course link — it skips a whole round-trip.
            </p>
          </div>
        </Reveal>
      </div>
    </MarketingSubPage>
  );
}
