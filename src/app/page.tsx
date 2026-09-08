import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Clock3,
  IndianRupee,
  Link2,
  Lock,
  Percent,
  PlayCircle,
  Share2,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { Badge, Card, buttonClasses } from "@/components/ui";
import { Calculator } from "@/components/landing/calculator";

const MARQUEE = [
  "No approvals — start selling instantly",
  "One link sells everywhere",
  "You keep 90% of every sale",
  "Settled to your bank daily at 4:00 PM",
  "Secured by Razorpay",
  "₹0 setup cost",
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="overflow-x-clip">
        {/* ---------------------------------------------------------------- HERO */}
        <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 md:pb-24 md:pt-20">
          <div className="grid items-center gap-12 md:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="anim-fade-up inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-sm">
                <span className="size-1.5 rounded-full bg-mint" />
                Daily settlements · every day at 4:00 PM
              </div>
              <h1 className="anim-fade-up delay-1 mt-5 font-display text-[2.75rem] font-bold leading-[0.98] tracking-tight sm:text-6xl md:text-7xl">
                Sell what you know.
                <br />
                Keep{" "}
                <span className="relative inline-block text-brand">
                  90%
                  <svg
                    viewBox="0 0 120 14"
                    className="absolute -bottom-1 left-0 w-full text-lime"
                    fill="none"
                  >
                    <path
                      d="M3 10.5C30 3.5 70 3 117 8.5"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                .
              </h1>
              <p className="anim-fade-up delay-2 mt-6 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
                Zybble turns your expertise into a course with a single shareable
                link. No approvals, no storefront code — publish, share, and get
                paid straight to your bank.
              </p>
              <div className="anim-fade-up delay-3 mt-8 flex flex-wrap items-center gap-3">
                <Link href="/auth?mode=signup" className={buttonClasses("brand", "lg")}>
                  Start selling — it&apos;s free <ArrowRight className="size-4" />
                </Link>
                <Link href="#how-it-works" className={buttonClasses("outline", "lg")}>
                  <PlayCircle className="size-4" /> How it works
                </Link>
              </div>
              <div className="anim-fade-up delay-4 mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium text-ink-soft">
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="size-4 text-brand" /> No approval wait
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="size-4 text-brand" /> Razorpay secured
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Banknote className="size-4 text-brand" /> Direct bank payout
                </span>
              </div>
            </div>

            {/* Hero visual — floating link card + settlement chip */}
            <div className="anim-fade-up delay-2 relative mx-auto w-full max-w-sm md:max-w-none">
              <div className="anim-float-slow relative">
                <Card className="overflow-hidden rounded-[28px]">
                  <div className="h-36 bg-[linear-gradient(135deg,#1b1145,#5b3df5_55%,#9d7bff)] p-5">
                    <div className="flex h-full flex-col justify-between">
                      <Badge tone="ink" className="w-fit bg-white/15 text-white">
                        Design
                      </Badge>
                      <p className="font-display text-xl font-bold leading-tight text-white">
                        The Creator&apos;s Design System Playbook
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-xs font-medium text-ink-soft">
                      <Link2 className="size-3.5 text-brand" />
                      zybble.com/c/design-system-playbook
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-display text-2xl font-bold">₹1,499</p>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                          12 lessons · lifetime access
                        </p>
                      </div>
                      <span className={buttonClasses("ink", "sm")}>
                        Buy now
                      </span>
                    </div>
                  </div>
                </Card>

                <div className="absolute -right-3 -top-6 rotate-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[var(--shadow-card)] sm:-right-8">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                    Sale · just now
                  </p>
                  <p className="font-display text-lg font-bold text-emerald-600">
                    +₹1,349.10 <span className="text-xs text-ink-soft">yours</span>
                  </p>
                </div>

                <div className="absolute -bottom-8 -left-2 -rotate-2 rounded-2xl border border-line bg-ink px-4 py-3 text-paper shadow-xl sm:-left-8">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-full bg-lime text-ink anim-pulse-ring">
                      <Wallet className="size-4" />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-paper/60">
                        Settlement · 4:00 PM
                      </p>
                      <p className="font-display text-sm font-bold">
                        ₹42,310 sent to bank ••4821
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ MARQUEE */}
        <section className="border-y border-line bg-ink py-3.5 text-paper">
          <div className="flex overflow-hidden">
            <div className="anim-marquee flex shrink-0 items-center gap-8 pr-8">
              {[...MARQUEE, ...MARQUEE].map((item, i) => (
                <span
                  key={i}
                  className="flex shrink-0 items-center gap-2 text-sm font-semibold"
                >
                  <Sparkles className="size-3.5 text-lime" /> {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- HOW IT WORKS */}
        <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="mb-10 max-w-lg">
            <Badge tone="brand">How it works</Badge>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
              Idea to income in three steps
            </h2>
            <p className="mt-3 text-ink-soft">
              There is no marketplace to fight and no gatekeeper to wait on. Your
              link <em>is</em> the store.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Zap,
                step: "01",
                title: "Create in minutes",
                body: "Sign up and you're instantly a creator — no approval queue. Add your title, lessons, price and hit publish.",
              },
              {
                icon: Share2,
                step: "02",
                title: "Share one link",
                body: "Every course gets a unique zybble.com/c/ link. Drop it in your bio, DMs, or newsletter — buyers check out in seconds with Razorpay.",
              },
              {
                icon: IndianRupee,
                step: "03",
                title: "Get paid at 4 PM",
                body: "90% of every sale lands in your balance instantly and settles to your bank account in the daily 4:00 PM payout run.",
              },
            ].map((s, i) => (
              <Card
                key={s.step}
                className={`group relative overflow-hidden p-6 transition-transform duration-300 hover:-translate-y-1 anim-fade-up delay-${i + 1}`}
              >
                <span className="absolute -right-2 -top-4 font-display text-7xl font-bold text-cream transition-colors group-hover:text-lime">
                  {s.step}
                </span>
                <span className="relative grid size-11 place-items-center rounded-2xl bg-ink text-lime">
                  <s.icon className="size-5" />
                </span>
                <h3 className="relative mt-5 font-display text-xl font-bold">{s.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* --------------------------------------------------------- CALCULATOR */}
        <section className="border-y border-line bg-cream/70 py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-10 max-w-lg">
              <Badge tone="brand">Earnings calculator</Badge>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
                See exactly what you keep
              </h2>
              <p className="mt-3 text-ink-soft">
                Flat 10% platform fee. No hidden cuts, ever. Drag the sliders.
              </p>
            </div>
            <Calculator />
          </div>
        </section>

        {/* --------------------------------------------------------- SETTLEMENTS */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <Badge tone="brand">Payouts</Badge>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
                Sold this morning.
                <br />
                In your bank by evening.
              </h2>
              <p className="mt-4 text-ink-soft">
                Every day at <strong className="text-ink">4:00 PM sharp</strong>,
                Zybble&apos;s settlement engine collects your cleared earnings and
                transfers them to your bank via Razorpay. Full audit trail on
                every rupee.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  { icon: Clock3, text: "One scheduled run daily at 4:00 PM — no manual withdrawal requests" },
                  { icon: Banknote, text: "Add your account holder name, account number and IFSC once" },
                  { icon: Percent, text: "Every payout lists each sale, the 10% fee, and your 90%" },
                ].map((li) => (
                  <li key={li.text} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                      <li.icon className="size-3.5" />
                    </span>
                    <span className="text-ink-soft">{li.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Card className="overflow-hidden">
              <div className="border-b border-line bg-ink px-5 py-3.5 text-paper">
                <p className="font-display text-sm font-bold">Today&apos;s settlement run</p>
                <p className="text-xs text-paper/60">Started 4:00:00 PM · completed in 8s</p>
              </div>
              <div className="divide-y divide-line">
                {[
                  { name: "You", id: "pout_Qz8x…421", amount: "₹42,310", status: "Processed" },
                  { name: "Asha K.", id: "pout_Qz8x…419", amount: "₹12,884", status: "Processed" },
                  { name: "Rohit V.", id: "pout_Qz8x…417", amount: "₹7,192", status: "Processed" },
                ].map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-full bg-cream font-display text-xs font-bold">
                        {p.name[0]}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{p.name}</p>
                        <p className="text-xs text-ink-soft">{p.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-sm font-bold">{p.amount}</p>
                      <Badge tone="green">{p.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-cream/70 px-5 py-3 text-center text-xs font-medium text-ink-soft">
                Next run tomorrow at 4:00 PM IST
              </div>
            </Card>
          </div>
        </section>

        {/* ------------------------------------------------------------- PRICING */}
        <section id="pricing" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
          <Card className="relative overflow-hidden bg-ink p-8 text-paper sm:p-12">
            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-lime/20 blur-3xl" />
            <div className="relative grid gap-10 md:grid-cols-[1.2fr_0.8fr]">
              <div>
                <Badge className="bg-white/10 text-lime">Simple fees</Badge>
                <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">
                  10% when you earn.
                  <br />
                  Nothing when you don&apos;t.
                </h2>
                <p className="mt-4 max-w-md text-paper/70">
                  No subscriptions, no listing fees, no monthly minimums. Zybble
                  only makes money on successful sales — payment processing and
                  instant settlements included.
                </p>
                <Link href="/auth?mode=signup" className={buttonClasses("lime", "lg") + " mt-8"}>
                  Create your first course <ArrowUpRight className="size-4" />
                </Link>
              </div>
              <div className="space-y-3 self-center">
                {[
                  ["Course price", "₹1,499.00"],
                  ["Zybble fee (10%)", "−₹149.90"],
                  ["You keep (90%)", "₹1,349.10"],
                ].map(([k, v], i) => (
                  <div
                    key={k}
                    className={`flex items-center justify-between rounded-2xl px-5 py-4 ${
                      i === 2 ? "bg-lime font-bold text-ink" : "bg-white/8 text-paper/80"
                    }`}
                  >
                    <span className="text-sm">{k}</span>
                    <span className="font-display text-lg">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>
      </main>
      <Footer />
    </>
  );
}
