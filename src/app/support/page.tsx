import { ArrowRight, ArrowUpRight, Bug, GraduationCap, Store, UserRound } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingSubPage } from "@/components/marketing/page-shell";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Get help with Zybble — account issues, creator questions, student help, and bug reports. Answers within a day.",
};

const TOPICS = [
  {
    icon: UserRound,
    title: "Account & sign-in",
    desc: "Can't get in, need to change your email, or want to update your profile.",
    email: "support@zybble.com",
    subject: "Account help",
  },
  {
    icon: Store,
    title: "I'm a creator",
    desc: "Builder questions, pricing your course, coupons, or understanding your analytics.",
    email: "support@zybble.com",
    subject: "Creator support",
  },
  {
    icon: GraduationCap,
    title: "I'm a student",
    desc: "Trouble accessing a course you bought, or a lesson that won't play. Include the course link.",
    email: "support@zybble.com",
    subject: "Student help",
  },
  {
    icon: Bug,
    title: "Report a problem",
    desc: "Bugs, broken pages, or content that shouldn't be on the platform.",
    email: "support@zybble.com",
    subject: "Bug report",
  },
];

const SELF_SERVE = [
  { href: "/guide", label: "Creator guide", desc: "Five steps from blank page to first student." },
  { href: "/faq", label: "FAQ", desc: "Formats, coupons, free courses, and progress tracking." },
  { href: "/status", label: "Status", desc: "Check whether the platform is having a moment." },
];

export default function SupportPage() {
  return (
    <MarketingSubPage
      eyebrow="Support"
      title="How can we help?"
      sub="Pick the closest match — your message lands directly with the team that can fix it."
    >
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-12 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {TOPICS.map((t, i) => (
            <Reveal key={t.title} delay={i * 70}>
              <a
                href={`mailto:${t.email}?subject=${encodeURIComponent(t.subject)}`}
                className="group flex h-full flex-col rounded-3xl border border-line bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-grape/40"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-grape-soft text-grape transition-colors duration-300 group-hover:bg-grape group-hover:text-white">
                    <t.icon className="size-5" />
                  </span>
                  <ArrowUpRight className="size-4 text-mut transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-grape" />
                </div>
                <h2 className="mt-4 text-[16px] font-semibold tracking-tight">{t.title}</h2>
                <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-mut">{t.desc}</p>
                <p className="mt-4 font-mono text-[12.5px] font-medium text-grape-deep">
                  {t.subject} → {t.email}
                </p>
              </a>
            </Reveal>
          ))}
        </div>

        <Reveal delay={140}>
          <h2 className="mt-12 text-[15px] font-semibold tracking-tight">Or help yourself first</h2>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {SELF_SERVE.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="group rounded-3xl border border-line bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-grape/40"
              >
                <p className="flex items-center justify-between text-[14.5px] font-semibold tracking-tight">
                  {s.label}
                  <ArrowRight className="size-4 text-mut transition-transform duration-300 group-hover:translate-x-1 group-hover:text-grape" />
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-mut">{s.desc}</p>
              </Link>
            ))}
          </div>
        </Reveal>

        <Reveal delay={180}>
          <p className="mt-10 text-center text-[12.5px] text-mut">
            Typical first reply: under 24 hours, every day of the week.
          </p>
        </Reveal>
      </div>
    </MarketingSubPage>
  );
}
