import { motion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  Check,
  Globe,
  MapPin,
  PenLine,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

/* ———————————————— Shared shell ———————————————— */

function MockShell({
  crumb,
  children,
  className,
}: {
  crumb: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[20px] border border-black/[0.07] bg-white text-left shadow-[0_1px_2px_rgba(20,18,15,0.05),0_28px_56px_-24px_rgba(20,18,15,0.22)]",
        className
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-black/[0.05] px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-neutral-200" />
          <span className="h-2 w-2 rounded-full bg-neutral-200" />
          <span className="h-2 w-2 rounded-full bg-neutral-200" />
        </span>
        <span className="ml-1 text-[11px] font-medium text-neutral-400">
          {crumb}
        </span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function Avatar({
  initials,
  tint,
  className,
}: {
  initials: string;
  tint: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded-md text-[10px] font-semibold",
        tint,
        className
      )}
    >
      {initials}
    </span>
  );
}

function ScorePill({ score }: { score: string }) {
  const styles = "bg-emerald-50 text-emerald-700";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
        styles
      )}
    >
      <Sparkles className="h-2.5 w-2.5" />
      {score}
    </span>
  );
}

/* ———————————————— 01 · Lead finder ———————————————— */

const LEADS = [
  {
    name: "BrightPath Dental",
    sub: "Business email",
    meta: "brightpath.dental · Dallas, TX",
    rating: "Public rating",
    score: "High fit",
    tint: "bg-sky-50 text-sky-600",
    initials: "BP",
  },
  {
    name: "Lone Star Smiles",
    sub: "Business email",
    meta: "lonestarsmiles.com · Austin, TX",
    rating: "Public rating",
    score: "Strong fit",
    tint: "bg-violet-50 text-violet-600",
    initials: "LS",
  },
  {
    name: "Hill Country Dental",
    sub: "Business email",
    meta: "hillcountrydental.com · San Antonio, TX",
    rating: "Public rating",
    score: "Review fit",
    tint: "bg-amber-50 text-amber-600",
    initials: "HC",
  },
  {
    name: "Oak Ridge Family Dental",
    sub: "Business email",
    meta: "oakridgetx.com · Houston, TX",
    rating: "Public rating",
    score: "Needs review",
    tint: "bg-emerald-50 text-emerald-600",
    initials: "OR",
  },
];

const FILTERS = [
  { icon: <MapPin className="h-2.5 w-2.5" />, label: "Texas" },
  { icon: <Building2 className="h-2.5 w-2.5" />, label: "Dental practices" },
  { icon: <BadgeCheck className="h-2.5 w-2.5" />, label: "Email verified" },
];

export function MockFinder() {
  return (
    <MockShell crumb="Zybble · Find">
      {/* Search */}
      <div className="flex items-center gap-2.5 rounded-lg border border-black/[0.07] bg-neutral-50/70 px-3 py-2.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        <span className="truncate text-[12.5px] font-medium text-neutral-700">
          dentists in Texas
        </span>
        <span className="h-3.5 w-px animate-pulse bg-neutral-400" />
        <span className="ml-auto hidden shrink-0 rounded border border-black/[0.08] bg-white px-1.5 py-0.5 text-[9px] font-medium text-neutral-400 sm:block">
          /
        </span>
        <span className="shrink-0 rounded-md bg-neutral-950 px-2.5 py-1 text-[10.5px] font-medium text-white">
          Search
        </span>
      </div>

      {/* Filters + count */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <span
            key={f.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.07] bg-white px-2.5 py-1 text-[10.5px] font-medium text-neutral-500"
          >
            <span className="text-neutral-400">{f.icon}</span>
            {f.label}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-neutral-900">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Search matches
        </span>
      </div>

      {/* Results */}
      <div className="mt-3 overflow-hidden rounded-xl border border-black/[0.06]">
        {LEADS.map((l, i) => (
          <motion.div
            key={l.name}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 + i * 0.09 }}
            className="group flex items-center gap-3 border-b border-black/[0.05] px-3 py-2.5 transition-colors last:border-0 hover:bg-neutral-50/80"
          >
            <Avatar initials={l.initials} tint={l.tint} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-neutral-900">
                {l.name}
              </p>
              <p className="truncate text-[10.5px] text-neutral-400">{l.sub}</p>
            </div>
            <div className="hidden w-40 shrink-0 md:block">
              <p className="truncate text-[10.5px] text-neutral-500">{l.meta}</p>
            </div>
            <span className="hidden shrink-0 items-center gap-1 text-[11px] font-medium text-neutral-600 sm:inline-flex">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {l.rating}
            </span>
            <ScorePill score={l.score} />
          </motion.div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between px-0.5">
        <p className="text-[10.5px] text-neutral-400">
          Verified and ready for outreach
        </p>
        <button className="text-[11px] font-medium text-neutral-900 hover:underline underline-offset-4">
          View results →
        </button>
      </div>
    </MockShell>
  );
}

/* ———————————————— 02 · AI scoring ———————————————— */

const SIGNALS = [
  { label: "High fit for your ICP", ok: true },
  { label: "Strong, active website", ok: true },
  { label: "Email verified and deliverable", ok: true },
];

export function MockScore() {
  const C = 2 * Math.PI * 46;
  return (
    <MockShell crumb="Zybble · Score">
      {/* Lead header */}
      <div className="flex items-center gap-3">
        <Avatar initials="LS" tint="bg-violet-50 text-violet-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-neutral-900">
            Lone Star Smiles
          </p>
          <p className="truncate text-[10.5px] text-neutral-400">
            Austin, TX · Dental practice
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-700">
          <Check className="h-3 w-3" />
          Recommended
        </span>
      </div>

      <div className="mt-5 flex items-center gap-5 sm:gap-6">
        {/* Score ring */}
        <div className="relative h-[104px] w-[104px] shrink-0 sm:h-[116px] sm:w-[116px]">
          <svg viewBox="0 0 104 104" className="h-full w-full -rotate-90">
            <circle
              cx="52"
              cy="52"
              r="46"
              fill="none"
              stroke="#f1f0ee"
              strokeWidth="8"
            />
            <motion.circle
              cx="52"
              cy="52"
              r="46"
              fill="none"
              stroke="url(#score-grad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              whileInView={{ strokeDashoffset: C * 0.1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            />
            <defs>
              <linearGradient id="score-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#6366f1" />
                <stop offset="1" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[26px] font-semibold leading-none tracking-tight text-neutral-950 sm:text-[30px]">
              Fit
            </span>
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              AI Score
            </span>
          </div>
        </div>

        {/* Signals */}
        <div className="min-w-0 flex-1 space-y-2.5">
          {SIGNALS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }}
              className="flex items-center gap-2.5"
            >
              <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              <p className="truncate text-[12px] font-medium text-neutral-600">
                {s.label}
              </p>
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.66 }}
            className="flex items-center gap-2.5"
          >
            <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-indigo-100 text-indigo-600">
              <Sparkles className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            <p className="truncate text-[12px] font-medium text-neutral-600">
              Review the public signals before contacting
            </p>
          </motion.div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="mt-5 flex items-center justify-between rounded-lg border border-black/[0.05] bg-neutral-50/70 px-3 py-2">
        <p className="truncate text-[11px] text-neutral-500">
          Fit signals: category · location · public presence
        </p>
        <button className="shrink-0 text-[11px] font-medium text-neutral-900 hover:underline underline-offset-4">
          Why this fit? →
        </button>
      </div>
    </MockShell>
  );
}

/* ———————————————— 03 · AI research ———————————————— */

const INSIGHTS = [
  { icon: <TrendingUp className="h-3 w-3" />, label: "Hiring", value: "Public signal" },
  { icon: <Star className="h-3 w-3" />, label: "Reputation", value: "Public rating" },
  { icon: <Globe className="h-3 w-3" />, label: "Web presence", value: "Website signal" },
  { icon: <Building2 className="h-3 w-3" />, label: "Contact path", value: "Review available" },
];

export function MockResearch() {
  return (
    <MockShell crumb="Zybble · Research">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Avatar initials="OH" tint="bg-amber-50 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-neutral-900">
            Oak Hill Dental Group
          </p>
          <p className="truncate text-[10.5px] text-neutral-400">
            Houston, TX · oakhilldental.com
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/60 px-2.5 py-1 text-[10.5px] font-semibold text-indigo-600">
          <Sparkles className="h-3 w-3" />
          AI Research
        </span>
      </div>

      {/* Summary */}
      <div className="mt-4">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
          Summary
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-600">
          Local business with public reputation and website signals ready for
          review. Use the available context to decide whether the offer is
          relevant before writing.
        </p>
      </div>

      {/* Insight tiles */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {INSIGHTS.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.2 + i * 0.08 }}
            className="rounded-lg border border-black/[0.05] bg-neutral-50/60 p-2.5"
          >
            <p className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-400">
              <span className="text-neutral-500">{t.icon}</span>
              {t.label}
            </p>
            <p className="mt-1 text-[11.5px] font-semibold text-neutral-800">
              {t.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Outreach angle */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.55 }}
        className="mt-3 rounded-xl border border-indigo-100/80 bg-indigo-50/50 p-3"
      >
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-500">
          <Sparkles className="h-3 w-3" />
          Best outreach angle
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-700">
          Start with a public business detail, connect it to your offer, and
          ask a small question that the recipient can answer.
        </p>
      </motion.div>
    </MockShell>
  );
}

/* ———————————————— 04 · AI email writer ———————————————— */

export function MockWriter() {
  return (
    <MockShell crumb="Zybble · Write">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-neutral-900">New message</p>
        <button className="inline-flex h-7 items-center gap-1.5 rounded-md bg-neutral-950 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-neutral-800">
          <Sparkles className="h-3 w-3" />
          Generate with AI
        </button>
      </div>

      {/* Fields */}
      <div className="mt-4 space-y-2 border-b border-black/[0.05] pb-3">
        <div className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-[10.5px] font-medium text-neutral-400">
            To
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
            <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-amber-100 text-[7px] font-bold text-amber-700">
              S
            </span>
            Business contact
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-[10.5px] font-medium text-neutral-400">
            Subject
          </span>
          <p className="truncate text-[12px] font-medium text-neutral-800">
            A thought on your second location
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-neutral-600">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Hi there — we noticed a public detail about{" "}
          <span className="underline decoration-indigo-300 decoration-2 underline-offset-2">
            your business
          </span>
          . Thought it might be relevant to the way you reach new customers.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          We can share the public signals we used and a practical idea for
          reaching a similar audience — without inventing details about your
          business.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          Worth a quick look this week? — Alex
        </motion.p>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center gap-2 border-t border-black/[0.05] pt-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.07] px-2.5 py-1 text-[10.5px] font-medium text-neutral-500">
          <PenLine className="h-3 w-3 text-neutral-400" />
          Tone: Friendly
        </span>
        <span className="hidden text-[10.5px] font-medium text-neutral-400 sm:inline">
          2 follow-ups queued
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <button className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-black/[0.07] text-neutral-400 transition-colors hover:text-neutral-700">
            <RotateCcw className="h-3 w-3" />
          </button>
          <button className="inline-flex h-7 items-center gap-1.5 rounded-md bg-neutral-950 px-3 text-[11px] font-medium text-white transition-colors hover:bg-neutral-800">
            <Send className="h-3 w-3" />
            Send
          </button>
        </span>
      </div>
    </MockShell>
  );
}

/* ———————————————— 05 · Sequence builder ———————————————— */

const SEQUENCE = [
  {
    day: "Day 0",
    title: "Quick question about Dallas roofing",
    status: "Sent",
    style: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700",
  },
  {
    day: "Day 3",
    title: "Re: quick question — a 30-second idea",
    status: "Scheduled",
    style: "bg-sky-400",
    pill: "bg-sky-50 text-sky-700",
  },
  {
    day: "Day 7",
    title: "Closing the loop",
    status: "Draft",
    style: "bg-neutral-300",
    pill: "bg-neutral-100 text-neutral-500",
  },
];

export function MockSequence() {
  return (
    <MockShell crumb="Zybble · Reach">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[12px] font-semibold text-neutral-900">
          Roofers — Dallas, Q3
        </p>
        <div className="flex shrink-0 gap-1.5">
          <span className="rounded-full border border-black/[0.06] px-2 py-1 text-[10px] font-medium text-neutral-500">
            Draft cadence
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
            Guardrails on
          </span>
        </div>
      </div>

      {/* Timeline */}
      <ol className="mt-4">
        {SEQUENCE.map((s, i) => (
          <motion.li
            key={s.day}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.14 }}
            className="relative pb-3 pl-8 last:pb-0"
          >
            {i < SEQUENCE.length && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[6px] top-5 w-px bg-black/[0.07]",
                  i === SEQUENCE.length - 1 ? "h-0" : "bottom-[-2px]"
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "absolute left-0 top-1.5 h-3 w-3 rounded-full ring-4 ring-white",
                s.style
              )}
            />
            <div className="flex items-center gap-3 rounded-lg border border-black/[0.06] bg-white p-2.5 shadow-[0_1px_2px_rgba(20,18,15,0.03)] transition-colors hover:bg-neutral-50/70">
              <span className="w-11 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                {s.day}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-neutral-800">
                  {s.title}
                </span>
                <span className="mt-0.5 block text-[10px] text-neutral-400">
                  Email · personalized per lead
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  s.pill
                )}
              >
                {s.status}
              </span>
            </div>
          </motion.li>
        ))}
      </ol>

      {/* Add step */}
      <button className="mt-3 w-full rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-[11px] font-medium text-neutral-400 transition-colors hover:border-neutral-400 hover:text-neutral-600">
        + Add follow-up
      </button>

      <p className="mt-3 px-0.5 text-[10.5px] text-neutral-400">
        Stops automatically when a lead replies.
      </p>
    </MockShell>
  );
}
