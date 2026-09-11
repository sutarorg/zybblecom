import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/marketing/nav";

export const metadata: Metadata = { title: "Terms of service" };

const SECTIONS = [
  {
    title: "1. The service",
    body: "Zybble provides tools for creators to build, publish, and sell access to online courses through unique links, and for students to purchase and consume that content. By creating an account you agree to these terms.",
  },
  {
    title: "2. Your account",
    body: "You are responsible for the activity on your account and for keeping your credentials confidential. You must provide accurate registration information and be at least 18 years old, or the age of majority in your jurisdiction.",
  },
  {
    title: "3. Creator content",
    body: "Creators retain ownership of their content and grant Zybble a license to host and deliver it to enrolled students. Creators are responsible for the legality of their content, for honoring the promises made on their course pages, and for having the rights to any media they upload or link.",
  },
  {
    title: "4. Purchases",
    body: "When a student purchases a course, they receive a non-transferable license to access that course for personal use. Creators set their own prices and may change them at any time; changes do not affect completed purchases.",
  },
  {
    title: "5. Acceptable use",
    body: "You may not use Zybble to distribute unlawful, infringing, misleading, or harmful content; to scrape or reverse engineer the platform; or to interfere with other users. We may suspend accounts that violate these rules.",
  },
  {
    title: "6. Availability & liability",
    body: "We work hard to keep Zybble fast and available, but the service is provided as-is without warranties of any kind. To the maximum extent permitted by law, Zybble is not liable for indirect or consequential damages arising from use of the service.",
  },
  {
    title: "7. Changes",
    body: "We may update these terms from time to time. Continued use of Zybble after changes take effect constitutes acceptance of the revised terms.",
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link href="/" className="btn btn-ghost btn-sm">
            <ArrowLeft className="size-4" /> Home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Terms of service</h1>
        <p className="mt-3 text-[14px] text-mut">Last updated: January 2026</p>
        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-[17px] font-semibold">{s.title}</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{s.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-12 border-t border-line pt-6 text-[13px] text-mut">
          Questions about these terms? Contact us at{" "}
          <a href="mailto:legal@zybble.com" className="font-medium text-ink underline">
            legal@zybble.com
          </a>
          .
        </p>
      </main>
    </div>
  );
}
