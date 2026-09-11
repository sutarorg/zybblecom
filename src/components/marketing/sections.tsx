import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  Download,
  Globe,
  Layers,
  Link2,
  Paperclip,
  PlayCircle,
  Sparkles,
  TicketPercent,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LinkBar } from "./link-bar";
import {
  BarsChart,
  BuilderMock,
  CoursePageMock,
  DashboardMock,
  PhonePlayerMock,
} from "./mockups";
import { Reveal } from "./reveal";

function Shell({
  id,
  eyebrow,
  title,
  sub,
  children,
  className,
  dark = false,
}: {
  id?: string;
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <section id={id} className={cn("py-20 sm:py-28", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <span className="eyebrow">
            <span className="eyebrow-dot" /> {eyebrow}
          </span>
          <h2
            className={cn(
              "mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.02em] sm:text-[40px] sm:leading-[1.08]",
              dark && "text-paper",
            )}
          >
            {title}
          </h2>
          {sub && (
            <p className={cn("mt-4 max-w-xl text-[15.5px] leading-relaxed", dark ? "text-paper/60" : "text-mut")}>
              {sub}
            </p>
          )}
        </Reveal>
        {children}
      </div>
    </section>
  );
}

function Tick({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[14.5px] text-ink-soft">
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-mint-soft text-mint">
        <Check className="size-3" />
      </span>
      <span>{children}</span>
    </li>
  );
}

/* ------------------------------ your course, your link ------------------------------ */

export function YourLinkSection() {
  return (
    <Shell
      id="your-link"
      eyebrow="One destination"
      title={
        <>
          Your Course.{" "}
          <span className="font-display font-normal italic text-grape">Your Link.</span>
        </>
      }
      sub="No storefronts to configure. No catalogs to get lost in. Every course you publish gets a single, memorable URL — that's your sales page, your checkout, and your classroom door, all at once."
    >
      <Reveal delay={120}>
        <div className="relative mt-10 overflow-hidden rounded-[36px] border border-line bg-gradient-to-br from-[#191631] via-[#202255] to-[#6d4cff] p-8 text-center sm:p-14">
          <div className="pointer-events-none absolute inset-0 grain opacity-40" />
          <p className="mx-auto max-w-md font-display text-2xl italic text-white/90 sm:text-3xl">
            &ldquo;It&rsquo;s the entire store —
            <br />
            one link, everywhere.&rdquo;
          </p>
          <div className="mt-7 flex justify-center">
            <LinkBar className="shadow-pop" />
          </div>
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: Link2, t: "Memorable by default", d: "zybble.com/c/your-topic — a URL people actually remember and repeat." },
              { icon: Globe, t: "Share-ready everywhere", d: "Bios, posts, newsletters, DMs — if you can paste text, you can sell." },
              { icon: Users, t: "Your audience, your rules", d: "Buyers come straight from you. No competing courses sit beside yours." },
            ].map((f) => (
              <div
                key={f.t}
                className="rounded-3xl border border-white/12 bg-white/6 p-5 text-left backdrop-blur-sm"
              >
                <f.icon className="size-4 text-[#b7a4ff]" />
                <p className="mt-3 text-[13.5px] font-semibold text-white">{f.t}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/55">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </Shell>
  );
}

/* --------------------------------- create course --------------------------------- */

export function CreateSection() {
  return (
    <Shell
      id="create"
      eyebrow="Build in minutes"
      title="Create your course, chapter by chapter."
      sub="A focused builder that stays out of your way. Structure the journey, drop in your content, and watch the page take shape as you go."
      className="bg-cream/50"
    >
      <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <ul className="space-y-4">
            <Tick>
              <span><strong className="font-semibold text-ink">Chapters and lessons</strong> that map the way you actually teach.</span>
            </Tick>
            <Tick>
              <span><strong className="font-semibold text-ink">Video, PDF, or written lessons</strong> — mix formats per lesson.</span>
            </Tick>
            <Tick>
              <span><strong className="font-semibold text-ink">Downloadable resources</strong> attached to any lesson: templates, files, links.</span>
            </Tick>
            <Tick>
              <span><strong className="font-semibold text-ink">Free previews</strong> on any lesson, so buyers can taste before they buy.</span>
            </Tick>
          </ul>
          <div className="mt-8">
            <Link href="/signup" className="btn btn-ink btn-md">
              Start building <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
        <Reveal delay={140}>
          <BuilderMock className="mx-auto max-w-md rotate-1 transition-transform duration-500 hover:rotate-0" />
        </Reveal>
      </div>
    </Shell>
  );
}

/* -------------------------------- beautiful pages -------------------------------- */

export function PagesSection() {
  return (
    <Shell
      id="pages"
      eyebrow="Sales pages that convert"
      title="Beautiful course pages. Written once, designed forever."
      sub="The moment you publish, Zybble composes a page that looks like a studio built it — cover, curriculum, pricing and previews, tuned for phones first."
    >
      <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
        <Reveal delay={140} className="order-2 lg:order-1">
          <CoursePageMock className="mx-auto max-w-md -rotate-1 transition-transform duration-500 hover:rotate-0" />
        </Reveal>
        <Reveal className="order-1 lg:order-2">
          <ul className="space-y-4">
            <Tick>
              <span><strong className="font-semibold text-ink">Curriculum on display</strong> — chapters, durations and previews laid out clean.</span>
            </Tick>
            <Tick>
              <span><strong className="font-semibold text-ink">Your price, your link</strong> — set ₹ pricing or make it free; change it anytime.</span>
            </Tick>
            <Tick>
              <span><strong className="font-semibold text-ink">Coupons built in</strong> — drop a code field right on the page.</span>
            </Tick>
            <Tick>
              <span><strong className="font-semibold text-ink">Mobile-first</strong> — where your audience actually clicks.</span>
            </Tick>
          </ul>
        </Reveal>
      </div>
    </Shell>
  );
}

/* -------------------------------- sell from anywhere ------------------------------- */

const CHANNELS = [
  { mark: "X", label: "Posts & threads" },
  { mark: "IG", label: "Link in bio" },
  { mark: "YT", label: "Video descriptions" },
  { mark: "in", label: "LinkedIn articles" },
  { mark: "@", label: "Newsletters" },
  { mark: "WA", label: "Communities" },
];

export function AnywhereSection() {
  return (
    <Shell
      id="anywhere"
      eyebrow="Distribution"
      title="Sell from anywhere."
      sub="Your audience already lives somewhere. Your course link goes there too — no integrations to wire, no shops to sync."
      className="bg-cream/50"
    >
      <Reveal delay={100}>
        <div className="mt-10 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {CHANNELS.map((c) => (
            <div
              key={c.label}
              className="group flex items-center gap-4 rounded-3xl border border-line bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-grape/40"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cream font-mono text-[13px] font-bold text-ink transition-colors group-hover:bg-grape group-hover:text-white">
                {c.mark}
              </span>
              <div>
                <p className="text-[14px] font-semibold">{c.label}</p>
                <p className="truncate font-mono text-[11.5px] text-mut">zybble.com/c/your-topic</p>
              </div>
              <ArrowRight className="ml-auto size-4 text-mut transition-transform duration-300 group-hover:translate-x-1 group-hover:text-grape" />
            </div>
          ))}
        </div>
      </Reveal>
    </Shell>
  );
}

/* --------------------------------- dashboard ---------------------------------- */

export function DashboardSection() {
  return (
    <Shell
      id="dashboard"
      eyebrow="Command center"
      title="A creator dashboard that talks numbers."
      sub="Revenue, students, completion, conversion — the four signals that matter, always a glance away. Built for checking with one thumb."
    >
      <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1fr,1.2fr]">
        <Reveal>
          <ul className="space-y-4">
            <Tick>
              <span><strong className="font-semibold text-ink">Thirty-day revenue view</strong> — watch launches land in real time.</span>
            </Tick>
            <Tick>
              <span><strong className="font-semibold text-ink">Every order, accounted</strong> — buyer, course, price, discount, status.</span>
            </Tick>
            <Tick>
              <span><strong className="font-semibold text-ink">Course performance</strong> — see which lessons keep students moving.</span>
            </Tick>
            <Tick>
              <span><strong className="font-semibold text-ink">Completion tracking</strong> — know when a course truly lands.</span>
            </Tick>
          </ul>
          <div className="mt-6 rounded-3xl border border-line bg-white p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-semibold text-ink-soft">Launch week</p>
              <span className="badge badge-mint">
                <TrendingUp className="size-3" /> +41%
              </span>
            </div>
            <BarsChart />
          </div>
        </Reveal>
        <Reveal delay={140}>
          <DashboardMock className="rotate-1 transition-transform duration-500 hover:rotate-0" />
        </Reveal>
      </div>
    </Shell>
  );
}

/* --------------------------------- student exp --------------------------------- */

export function StudentSection() {
  return (
    <Shell
      id="student"
      eyebrow="Student experience"
      title="Students just press play."
      sub="Buying takes seconds, learning feels effortless. Progress saves itself, lessons resume where they left off, and downloads are right beside the video."
      className="bg-cream/50"
    >
      <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
        <Reveal delay={140} className="order-2 lg:order-1">
          <PhonePlayerMock className="mx-auto max-w-[300px]" />
        </Reveal>
        <Reveal className="order-1 lg:order-2">
          <ul className="space-y-4">
            <Tick>
              <span><strong className="font-semibold text-ink">Instant access</strong> — enrolled and playing in under a minute.</span>
            </Tick>
            <Tick>
              <span><strong className="font-semibold text-ink">Progress that sticks</strong> — every lesson marked, every streak visible.</span>
            </Tick>
            <Tick>
              <span><strong className="font-semibold text-ink">Any device</strong> — the same clean player on phone, tablet, and desktop.</span>
            </Tick>
            <Tick>
              <span><strong className="font-semibold text-ink">A personal library</strong> — every course they own, one tap away.</span>
            </Tick>
          </ul>
        </Reveal>
      </div>
    </Shell>
  );
}

/* --------------------------------- creator tools -------------------------------- */

const TOOLS = [
  {
    icon: Layers,
    t: "Chapters & lessons",
    d: "Drag your curriculum into shape. Video, PDF, and text in any order.",
  },
  {
    icon: TicketPercent,
    t: "Coupons",
    d: "Percentage or flat codes with expiry dates and usage caps, per course.",
  },
  {
    icon: BarChart3,
    t: "Analytics",
    d: "Thirty-day revenue, order history, and per-course performance.",
  },
  {
    icon: TrendingUp,
    t: "Student progress",
    d: "See completion across your catalog — and where learners stall.",
  },
  {
    icon: Paperclip,
    t: "Resources",
    d: "Attach files and links to any lesson: templates, slides, worksheets.",
  },
  {
    icon: Link2,
    t: "Custom links",
    d: "Pick your slug. Rename it later — the old course moves with it.",
  },
];

export function ToolsSection() {
  return (
    <Shell
      id="tools"
      eyebrow="Creator tools"
      title="Everything in one tab."
      sub="No plugins, no duct tape. The toolbox ships inside every Zybble account."
    >
      <div className="mt-10 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool, i) => (
          <Reveal key={tool.t} delay={i * 60}>
            <div className="group h-full rounded-3xl border border-line bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-grape/40">
              <span className="grid size-11 place-items-center rounded-2xl bg-grape-soft text-grape transition-colors duration-300 group-hover:bg-grape group-hover:text-white">
                <tool.icon className="size-5" />
              </span>
              <p className="mt-4 text-[15px] font-semibold">{tool.t}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-mut">{tool.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Shell>
  );
}

/* --------------------------------- how it works --------------------------------- */

const STEPS = [
  {
    n: "01",
    t: "Create",
    d: "Open the builder and shape your course — chapters, lessons, resources. It takes an evening, not a quarter.",
  },
  {
    n: "02",
    t: "Publish",
    d: "Set your price (or keep it free), choose a slug, and your course page goes live on its own link.",
  },
  {
    n: "03",
    t: "Share",
    d: "Put the link where your audience lives — bio, newsletter, pinned post. Enrollments land in your dashboard.",
  },
];

export function HowSection() {
  return (
    <Shell
      id="how-it-works"
      eyebrow="How it works"
      title={
        <>
          From idea to enrolled students in{" "}
          <span className="font-display font-normal italic text-grape">three moves.</span>
        </>
      }
      className="bg-cream/50"
    >
      <div className="relative mt-12 grid gap-8 sm:grid-cols-3">
        <div className="absolute left-0 right-0 top-7 hidden border-t border-dashed border-line sm:block" aria-hidden />
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 120}>
            <div className="relative">
              <span className="relative z-10 inline-grid size-14 place-items-center rounded-2xl border border-line bg-white font-display text-xl italic text-grape shadow-card">
                {s.n}
              </span>
              <p className="mt-5 text-[17px] font-semibold tracking-tight">{s.t}</p>
              <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-mut">{s.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={200}>
        <div className="mt-12">
          <Link href="/signup" className="btn btn-accent btn-lg">
            Start selling — it&rsquo;s free <ArrowRight className="size-4" />
          </Link>
        </div>
      </Reveal>
    </Shell>
  );
}

/* ----------------------------------- features ----------------------------------- */

function FeatureCard({
  icon: Icon,
  title,
  desc,
  className,
  children,
}: {
  icon: typeof Zap;
  title: string;
  desc: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group flex h-full flex-col rounded-3xl border border-line bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-grape/40 sm:p-7",
        className,
      )}
    >
      <span className="grid size-11 place-items-center rounded-2xl bg-ink text-paper transition-colors duration-300 group-hover:bg-grape">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-[16px] font-semibold tracking-tight">{title}</p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-mut">{desc}</p>
      {children}
    </div>
  );
}

export function FeaturesSection() {
  return (
    <Shell
      id="features"
      eyebrow="Features"
      title="Small platform. Big levers."
      sub="Every tool is here because it moves a number: enrollments, completion, or revenue."
    >
      <div className="mt-10 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal className="lg:col-span-2">
          <FeatureCard
            icon={Zap}
            title="Enrollment in one tap"
            desc="Buyers arrive from your link, see the price, and they're in. Coupons apply right on the page — no cart, no friction, no lost checkouts."
          >
            <div className="mt-auto pt-5">
              <div className="flex items-center gap-2 rounded-2xl border border-line bg-paper px-3.5 py-2.5">
                <TicketPercent className="size-4 text-grape" />
                <span className="font-mono text-[12px] font-semibold tracking-wide text-ink">LAUNCH20</span>
                <span className="ml-auto badge badge-mint">−20%</span>
              </div>
            </div>
          </FeatureCard>
        </Reveal>
        <Reveal delay={70}>
          <FeatureCard
            icon={PlayCircle}
            title="Free previews"
            desc="Mark any lesson open-to-all. Give away the first win; sell the transformation."
          />
        </Reveal>
        <Reveal delay={120}>
          <FeatureCard
            icon={BadgeCheck}
            title="Progress tracking"
            desc="Students check off lessons; you see completion across the catalog."
          />
        </Reveal>
        <Reveal delay={170}>
          <FeatureCard
            icon={Download}
            title="Resources & downloads"
            desc="Templates, slides, and links attached to the exact lesson they belong to."
          />
        </Reveal>
        <Reveal delay={220} className="lg:col-span-2">
          <FeatureCard
            icon={BarChart3}
            title="Analytics you'll actually read"
            desc="Thirty-day revenue, order-level history, and course performance — distilled into clean cards and one honest chart. No dashboards-within-dashboards."
          >
            <div className="mt-auto pt-5">
              <div className="flex h-14 items-end gap-1" aria-hidden>
                {[30, 55, 42, 70, 58, 84, 66, 92, 74, 100, 82, 96].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-gradient-to-t from-grape/25 to-grape"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </FeatureCard>
        </Reveal>
        <Reveal delay={260}>
          <FeatureCard
            icon={Sparkles}
            title="Pages that design themselves"
            desc="Publish and the sales page composes itself — cover, curriculum, price, previews."
          />
        </Reveal>
      </div>
    </Shell>
  );
}

/* ------------------------------- product previews -------------------------------- */

function BrowserFrame({
  url,
  children,
  className,
}: {
  url: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-3xl border border-line bg-white shadow-pop", className)}>
      <div className="flex items-center gap-2 border-b border-line bg-paper px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 truncate rounded-md bg-cream px-2.5 py-1 font-mono text-[10.5px] text-mut">
          {url}
        </span>
      </div>
      <div className="bg-paper p-3 sm:p-5">{children}</div>
    </div>
  );
}

export function PreviewsSection() {
  return (
    <Shell
      id="preview"
      eyebrow="Product preview"
      title="See exactly what the internet sees."
      sub="Two views, one platform — what your buyer lands on, and what you wake up to."
      className="bg-cream/50"
    >
      <div className="mt-12 space-y-10">
        <Reveal>
          <div className="grid items-center gap-6 lg:grid-cols-[280px,1fr]">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-mut">Course preview</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight">The page your link opens.</p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-mut">
                Cover, curriculum, durations, previews, and your price — composed the second you publish.
              </p>
              <Link href="/signup" className="btn btn-outline btn-md mt-5">
                Create yours <ArrowRight className="size-4" />
              </Link>
            </div>
            <BrowserFrame url="zybble.com/c/the-indie-design-system" className="-rotate-1 transition-transform duration-500 hover:rotate-0">
              <CoursePageMock compact />
            </BrowserFrame>
          </div>
        </Reveal>
        <Reveal>
          <div className="grid items-center gap-6 lg:grid-cols-[280px,1fr]">
            <div className="lg:order-2">
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-mut">Dashboard preview</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight">The numbers you wake up to.</p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-mut">
                Overnight enrollments, week-over-week movement, and lesson-level health — one honest screen.
              </p>
              <Link href="/signup" className="btn btn-outline btn-md mt-5">
                Open your dashboard <ArrowRight className="size-4" />
              </Link>
            </div>
            <BrowserFrame url="zybble.com/dashboard" className="rotate-1 transition-transform duration-500 hover:rotate-0 lg:order-1">
              <DashboardMock className="shadow-card" />
            </BrowserFrame>
          </div>
        </Reveal>
      </div>
    </Shell>
  );
}

/* ---------------------------------- final cta ----------------------------------- */

export function FinalCTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[40px] bg-ink px-6 py-16 text-center sm:px-12 sm:py-24">
            <div className="grain pointer-events-none absolute inset-0 opacity-60" />
            <div
              className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-grape/40 blur-[120px]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-40 -right-24 size-96 rounded-full bg-[#c78bd4]/30 blur-[120px]"
              aria-hidden
            />
            <div className="relative">
              <span className="eyebrow text-paper/50">
                <span className="eyebrow-dot" /> Ready when you are
              </span>
              <h2 className="mx-auto mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.02em] text-paper sm:text-5xl">
                Put your course on the internet{" "}
                <span className="font-display font-normal italic text-[#b7a4ff]">today.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-paper/60">
                Create an account, build your first course, and share the link before the day ends.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/signup" className="btn btn-accent btn-lg">
                  Start selling <ArrowRight className="size-4" />
                </Link>
                <a href="#your-link" className="btn btn-md border border-white/15 text-paper/80 hover:text-paper hover:border-white/30">
                  See the idea again
                </a>
              </div>
              <p className="mt-6 text-[12px] text-paper/40">
                Free to start · No card required · Publish in minutes
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
