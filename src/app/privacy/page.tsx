import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/marketing/nav";

export const metadata: Metadata = { title: "Privacy policy" };

const SECTIONS = [
  {
    title: "1. What we collect",
    body: "Account details (name, email, and — only when you use email sign-up — your password, stored solely as a salted hash). If you sign in with Google, we receive your name, email address, and a confirmation that Google owns that email; we never see your Google password. We also store the content you create, purchase and enrollment records, and basic usage signals needed to operate analytics for creators.",
  },
  {
    title: "2. How we use it",
    body: "We use your information to run the platform: authenticating you, delivering courses to enrolled students, showing creators their sales and progress analytics, and keeping the service secure. We do not sell personal data.",
  },
  {
    title: "3. Cookies",
    body: "Zybble uses a single essential, http-only session cookie to keep you signed in. We do not use third-party advertising trackers.",
  },
  {
    title: "4. Sharing",
    body: "When a student enrolls in a course, the creator can see the student's name and enrollment details for that course. Platform operators can view sales records to operate creator balances and support.",
  },
  {
    title: "5. Retention & deletion",
    body: "You may delete your account at any time, which removes your personal information. Aggregated, de-identified records (for example, historical sales totals) may be retained where required for legitimate accounting purposes.",
  },
  {
    title: "6. Security",
    body: "Passwords are salted and hashed, sessions are signed, and access to production data is restricted to essential operations. No method of transmission is 100% secure, but we design for defense in depth.",
  },
  {
    title: "7. Contact",
    body: "For privacy questions or requests, email privacy@zybble.com and we'll respond promptly.",
  },
];

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Privacy policy</h1>
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
          Questions about privacy? Contact{" "}
          <a href="mailto:privacy@zybble.com" className="font-medium text-ink underline">
            privacy@zybble.com
          </a>
          .
        </p>
      </main>
    </div>
  );
}
