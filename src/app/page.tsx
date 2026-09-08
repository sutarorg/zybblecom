import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Briefcase,
  ChevronDown,
  Code2,
  Copy,
  Heart,
  IndianRupee,
  Landmark,
  Link2,
  ListChecks,
  Lock,
  Megaphone,
  Palette,
  PlayCircle,
  Quote,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Video,
  Wallet,
  Zap,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { Badge, Card, buttonClasses } from "@/components/ui";
import { Calculator } from "@/components/landing/calculator";

const MARQUEE = [
  "Launch in minutes — no approvals",
  "One link sells everywhere",
  "Automatic bank payouts",
  "Razorpay secured checkout",
  "₹0 setup cost",
  "Students get instant lifetime access",
];

const CATEGORIES = [
  { icon: Palette, name: "Design", example: "Figma systems that scale", price: "₹1,499" },
  { icon: Code2, name: "Development", example: "Ship a SaaS in 30 days", price: "₹2,499" },
  { icon: Briefcase, name: "Business", example: "Freelance to founder", price: "₹999" },
  { icon: Megaphone, name: "Marketing", example: "The 10k followers sprint", price: "₹799" },
  { icon: BrainCircuit, name: "Data & AI", example: "Prompt engineering pro", price: "₹1,999" },
  { icon: Video, name: "Creator", example: "YouTube growth playbook", price: "₹1,299" },
  { icon: Heart, name: "Lifestyle", example: "Sourdough, start to crust", price: "₹499" },
  { icon: IndianRupee, name: "Finance", example: "Personal finance basics", price: "₹899" },
];

const FEATURES = [
  {
    icon: Link2,
    title: "A storefront in a single link",
    body: "Every course gets its own zybble.com/c/ page with your pricing, curriculum and bio baked in. Drop it in your bio, DMs, newsletter — anywhere your audience already is.",
    wide: true,
  },
  {
    icon: ListChecks,
    title: "Curriculum builder",
    body: "Structure lessons with rich written content, reorder with a tap, and publish whenever you're ready.",
  },
  {
    icon: ShieldCheck,
    title: "Razorpay checkout",
    body: "UPI, cards, netbanking and wallets — every payment is verified server-side before access unlocks.",
  },
  {
    icon: BookOpenCheck,
    title: "Student progress",
    body: "Learners track their lesson-by-lesson progress and can pick up exactly where they left off.",
  },
  {
    icon: BarChart3,
    title: "Live sales analytics",
    body: "See every order, buyer and balance update the moment it happens — no spreadsheets.",
  },
  {
    icon: Landmark,
    title: "Automatic payouts",
    body: "Add your bank account once. Earnings route to it on autopilot with a full record of every transfer.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "I shared my link on a Friday evening. By Monday I'd made more than my old monthly salary — and I hadn't written a single line of code.",
    name: "Priya Sharma",
    role: "UX mentor · 48k followers",
  },
  {
    quote:
      "The checkout is so smooth my students thought I built the whole thing myself. Buying takes them twenty seconds.",
    name: "Karan Desai",
    role: "Indie hacker & teacher",
  },
  {
    quote:
      "Payouts simply show up in my bank with a clean record for every transfer. I think about teaching, not invoices.",
    name: "Meera Iyer",
    role: "Personal finance coach",
  },
];

const FAQS = [
  {
    q: "How quickly can I start selling?",
    a: "Instantly. Create an account and you're a creator — there is no approval queue or waiting period. Most people publish their first course within the hour.",
  },
  {
    q: "Where do buyers find my course?",
    a: "Only where you share it. Zybble isn't a crowded marketplace — your unique course link is the entire store. Share it on Instagram, YouTube, X, WhatsApp, your newsletter, or anywhere else.",
  },
  {
    q: "How do students pay?",
    a: "Through a secure Razorpay checkout supporting UPI, credit and debit cards, netbanking and popular wallets. Payment status is verified cryptographically on our servers before access is granted.",
  },
  {
    q: "What do students get after paying?",
    a: "Instant, lifetime access to your lessons with personal progress tracking, on any device. Their receipt and order history live in their Zybble account.",
  },
  {
    q: "How do I receive my money?",
    a: "Add your bank account holder name, account number and IFSC once. Your earnings route to your bank automatically on a daily settlement schedule — every payout arrives with a transfer ID and a complete record.",
  },
  {
    q: "Can I update my course after publishing?",
    a: "Anytime. Edit lessons, change pricing, or unpublish in one tap — existing students keep their access to every update you make.",
  },
  {
    q: "Does it cost anything to start?",
    a: "No. Creating your account, building courses and sharing your links is completely free.",
  },
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
                Automatic bank payouts · on autopilot
              </div>
              <h1 className="anim-fade-up delay-1 mt-5 font-display text-[2.75rem] font-bold leading-[0.98] tracking-tight sm:text-6xl md:text-7xl">
                Sell what you know.
                <br />
                Get{" "}
                <span className="relative inline-block text-brand">
                  paid
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
                </span>{" "}
                for it.
              </h1>
              <p className="anim-fade-up delay-2 mt-6 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
                Zybble turns your expertise into a course with a single shareable
                link. No approvals, no storefront code — publish, share, and money
                lands in your bank automatically.
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

            {/* Hero visual — floating link card + payout chip */}
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
                    +₹1,499 <span className="text-xs font-medium text-ink-soft">via UPI</span>
                  </p>
                </div>

                <div className="absolute -bottom-8 -left-2 -rotate-2 rounded-2xl border border-ink bg-ink px-4 py-3 text-paper shadow-xl sm:-left-8">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-full bg-lime text-ink anim-pulse-ring">
                      <Wallet className="size-4" />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-paper/60">
                        Payout · settled
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
                <span key={i} className="flex shrink-0 items-center gap-2 text-sm font-semibold">
                  <Sparkles className="size-3.5 text-lime" /> {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- HOW IT WORKS */}
        <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="reveal-view mb-10 max-w-lg">
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
                icon: Banknote,
                step: "03",
                title: "Get paid automatically",
                body: "Sales land in your Zybble balance the moment payment clears, and your earnings route straight to your bank on autopilot.",
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

        {/* ----------------------------------------------------------- CATEGORIES */}
        <section id="categories" className="border-y border-line bg-cream/70 py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="reveal-view mb-10 max-w-lg">
              <Badge tone="brand">What will you teach?</Badge>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
                Sell whatever you&apos;re great at
              </h2>
              <p className="mt-3 text-ink-soft">
                From design systems to sourdough — if someone wants to learn it,
                you can sell it here.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {CATEGORIES.map((c, i) => (
                <div
                  key={c.name}
                  className={`group rounded-3xl border border-line bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card)] reveal-view`}
                  style={{ animationDelay: `${(i % 4) * 70}ms` }}
                >
                  <span className="grid size-10 place-items-center rounded-2xl bg-cream text-ink transition-colors group-hover:bg-brand group-hover:text-white">
                    <c.icon className="size-5" />
                  </span>
                  <p className="mt-4 font-display text-base font-bold">{c.name}</p>
                  <p className="mt-1 text-[13px] leading-snug text-ink-soft">{c.example}</p>
                  <span className="mt-3 inline-block rounded-full bg-lime/70 px-2 py-0.5 text-[11px] font-bold text-ink">
                    {c.price} avg
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- FEATURES BENTO */}
        <section id="why-zybble" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="reveal-view mb-10 max-w-xl">
            <Badge tone="brand">Why Zybble</Badge>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
              Everything you need. Nothing you don&apos;t.
            </h2>
            <p className="mt-3 text-ink-soft">
              One tool replaces your storefront, checkout, course player, student
              tracker and accountant.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Card
                key={f.title}
                className={`reveal-view p-6 transition-transform duration-300 hover:-translate-y-1 ${f.wide ? "md:col-span-2" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-brand/10 text-brand">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.body}</p>
                {f.wide && (
                  <div className="mt-5 flex items-center gap-2 rounded-2xl border border-dashed border-ink/20 bg-cream/70 px-4 py-3">
                    <span className="truncate font-mono text-sm font-medium text-ink">
                      zybble.com/c/<span className="text-brand">your-course</span>
                    </span>
                    <Copy className="ml-auto size-4 shrink-0 text-ink-soft" />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* --------------------------------------------------------- CALCULATOR */}
        <section className="border-y border-line bg-cream/70 py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="reveal-view mb-10 max-w-lg">
              <Badge tone="brand">Earnings calculator</Badge>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
                What&apos;s your knowledge worth?
              </h2>
              <p className="mt-3 text-ink-soft">
                Drag the sliders and watch the numbers move.
              </p>
            </div>
            <Calculator />
          </div>
        </section>

        {/* ------------------------------------------------------------- PAYOUTS */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="reveal-view">
              <Badge tone="brand">Payouts</Badge>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
                Your money,
                <br />
                on autopilot.
              </h2>
              <p className="mt-4 text-ink-soft">
                Focus on teaching. Zybble&apos;s settlement engine moves your
                earnings from sales to your bank account automatically — with a
                paper trail for every rupee.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  { icon: Zap, text: "Payouts run automatically on a daily schedule — no withdrawal requests, no chasing" },
                  { icon: Banknote, text: "Add your account holder name, account number and IFSC exactly once" },
                  { icon: ListChecks, text: "Every transfer lists its transfer ID, amount and status for your records" },
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
            <Card className="reveal-view overflow-hidden">
              <div className="border-b border-line bg-ink px-5 py-3.5 text-paper">
                <p className="font-display text-sm font-bold">Latest payout run</p>
                <p className="text-xs text-paper/60">Completed automatically · nothing to request</p>
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
                        <p className="font-mono text-xs text-ink-soft">{p.id}</p>
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
                Runs again automatically tomorrow
              </div>
            </Card>
          </div>
        </section>

        {/* --------------------------------------------------------- TESTIMONIALS */}
        <section className="border-y border-line bg-ink py-16 text-paper md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="reveal-view mb-10 max-w-lg">
              <Badge className="bg-white/10 text-lime">Creator stories</Badge>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
                People like you, already earning
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <figure
                  key={t.name}
                  className={`flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur transition-colors hover:bg-white/[0.09] anim-fade-up delay-${i + 1}`}
                >
                  <div>
                    <Quote className="size-6 text-lime" />
                    <div className="mt-4 flex gap-1">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} className="size-3.5 fill-lime text-lime" />
                      ))}
                    </div>
                    <blockquote className="mt-4 text-[15px] leading-relaxed text-paper/85">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                  </div>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-white/10 pt-4">
                    <span className="grid size-10 place-items-center rounded-full bg-lime font-display text-sm font-bold text-ink">
                      {t.name[0]}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{t.name}</p>
                      <p className="text-xs text-paper/60">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------------- FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
          <div className="reveal-view mb-10 text-center">
            <Badge tone="brand">FAQ</Badge>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
              Questions, answered
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-line bg-white px-5 transition-shadow open:shadow-[var(--shadow-card)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-[15px] font-bold sm:text-base">{f.q}</span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cream transition-transform duration-300 group-open:rotate-180">
                    <ChevronDown className="size-4" />
                  </span>
                </summary>
                <p className="pb-5 pr-10 text-sm leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------- CTA */}
        <section id="start" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
          <div className="relative overflow-hidden rounded-[32px] bg-ink p-8 text-paper shadow-[var(--shadow-card)] sm:p-14">
            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand/50 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-lime/25 blur-3xl" />
            <div className="relative mx-auto max-w-2xl text-center">
              <Badge className="bg-white/10 text-lime">Free to start</Badge>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">
                Your first sale could be tonight.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-paper/70">
                Create a course, grab your link, and put it in front of the
                audience you already have. No credit card. No approvals.
              </p>
              <Link href="/auth?mode=signup" className={buttonClasses("lime", "lg") + " mt-8"}>
                Create your first course <ArrowUpRight className="size-4" />
              </Link>
              <p className="mt-5 text-xs font-medium text-paper/50">
                Join creators teaching design, code, business, finance and more
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
