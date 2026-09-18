import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Gauge,
  Globe,
  Lightbulb,
  MapPin,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import {
  GmailIcon,
  GoogleIcon,
  HubSpotIcon,
  LinkedInIcon,
  OutlookIcon,
  SalesforceIcon,
  SlackIcon,
  ZoomIcon,
} from "../BrandIcons";

/* ————————————————— Orbit geometry ————————————————— */

const RINGS = [
  { rx: 16.0, ry: 21.5 },
  { rx: 23.5, ry: 29.0 },
  { rx: 31.5, ry: 36.5 },
  { rx: 39.5, ry: 43.5 },
  { rx: 47.0, ry: 47.5 },
];

type Orbiter = {
  ring: number;
  start: number; // degrees
  duration: number; // seconds per revolution
  dir: 1 | -1;
  label: string;
  icon: ReactNode;
};

const ORBITERS: Orbiter[] = [
  { ring: 1, start: 200, duration: 95, dir: 1, label: "Gmail", icon: <GmailIcon className="h-[18px] w-[18px]" /> },
  { ring: 1, start: 15, duration: 95, dir: 1, label: "Google", icon: <GoogleIcon className="h-[17px] w-[17px]" /> },
  { ring: 2, start: 335, duration: 115, dir: -1, label: "LinkedIn", icon: <LinkedInIcon className="h-[17px] w-[17px]" /> },
  { ring: 2, start: 128, duration: 115, dir: -1, label: "HubSpot", icon: <HubSpotIcon className="h-[18px] w-[18px]" /> },
  { ring: 3, start: 64, duration: 130, dir: 1, label: "Salesforce", icon: <SalesforceIcon className="h-[18px] w-[18px]" /> },
  { ring: 3, start: 250, duration: 130, dir: 1, label: "Slack", icon: <SlackIcon className="h-[18px] w-[18px]" /> },
  { ring: 4, start: 160, duration: 150, dir: -1, label: "Outlook", icon: <OutlookIcon className="h-[17px] w-[17px]" /> },
  { ring: 4, start: 322, duration: 150, dir: -1, label: "Zoom", icon: <ZoomIcon className="h-[18px] w-[18px]" /> },
];

/* ————————————————— Floating mini cards ————————————————— */

const MINIS = [
  {
    icon: <Sparkles className="h-3 w-3" />,
    tint: "bg-violet-50 text-violet-600",
    title: "AI Research complete",
    sub: "Lone Star Smiles",
    pos: "left-[1%] top-[15%] xl:left-[4%]",
    delay: "0s",
  },
  {
    icon: <Gauge className="h-3 w-3" />,
    tint: "bg-emerald-50 text-emerald-600",
    title: "94 AI Score",
    sub: "High fit · Recommended",
    pos: "right-[2%] top-[13%] xl:right-[5%]",
    delay: "1.1s",
  },
  {
    icon: <BadgeCheck className="h-3 w-3" />,
    tint: "bg-sky-50 text-sky-600",
    title: "Email verified",
    sub: "sarah@lonestarsmiles.com",
    pos: "left-[0%] top-[62%] xl:left-[3%]",
    delay: "0.6s",
  },
  {
    icon: <Lightbulb className="h-3 w-3" />,
    tint: "bg-amber-50 text-amber-600",
    title: "Best outreach angle",
    sub: "Based on 12 live signals",
    pos: "right-[1%] top-[58%] xl:right-[3%]",
    delay: "1.6s",
  },
  {
    icon: <Building2 className="h-3 w-3" />,
    tint: "bg-indigo-50 text-indigo-600",
    title: "New company found",
    sub: "Roofing · Dallas, TX",
    pos: "left-[9%] top-[87%]",
    delay: "0.3s",
  },
  {
    icon: <Users className="h-3 w-3" />,
    tint: "bg-rose-50 text-rose-600",
    title: "3 high-fit leads",
    sub: "Match score above 90",
    pos: "right-[9%] top-[85%]",
    delay: "1.9s",
  },
];

const AVATARS = [
  { initials: "JR", tint: "bg-sky-100 text-sky-700" },
  { initials: "MK", tint: "bg-violet-100 text-violet-700" },
  { initials: "AS", tint: "bg-amber-100 text-amber-700" },
  { initials: "+9", tint: "bg-neutral-100 text-neutral-500" },
];

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400">
        {icon}
        {label}
      </span>
      <span className="text-[13px] font-medium text-neutral-800">{value}</span>
    </div>
  );
}

/* ————————————————— Component ————————————————— */

export default function OrbitVisual() {
  const orbiterRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const place = (elapsedMs: number) => {
      for (let i = 0; i < ORBITERS.length; i++) {
        const el = orbiterRefs.current[i];
        if (!el) continue;
        const o = ORBITERS[i];
        const ring = RINGS[o.ring];
        const deg = o.start + o.dir * (elapsedMs / (o.duration * 1000)) * 360;
        const a = (deg * Math.PI) / 180;
        el.style.left = `${50 + ring.rx * Math.cos(a)}%`;
        el.style.top = `${50 + ring.ry * Math.sin(a)}%`;
      }
    };

    if (reduce) {
      place(0);
      return;
    }

    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      place(now - t0);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative mx-auto mt-14 w-full max-w-[1240px] px-2 sm:mt-16">
      <div className="relative h-[520px] sm:h-[610px] lg:h-[680px]">
        {/* Ambient AI glow */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.08),rgba(56,189,248,0.05)_45%,transparent_70%)] blur-2xl"
        />

        {/* Orbit rings */}
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full [mask-image:radial-gradient(120%_112%_at_50%_50%,black_62%,transparent_99%)]"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="orbit-accent" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#818cf8" stopOpacity="0" />
              <stop offset="0.45" stopColor="#818cf8" stopOpacity="0.9" />
              <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="orbit-accent-b" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#c4b5fd" stopOpacity="0" />
              <stop offset="0.5" stopColor="#a5b4fc" stopOpacity="0.8" />
              <stop offset="1" stopColor="#c4b5fd" stopOpacity="0" />
            </linearGradient>
          </defs>

          {RINGS.map((r, i) => (
            <ellipse
              key={i}
              cx="50"
              cy="50"
              rx={r.rx}
              ry={r.ry}
              fill="none"
              stroke="#14120f"
              strokeOpacity={i % 2 === 0 ? 0.13 : 0.08}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset="100"
              style={{
                animation: `ring-draw 2s cubic-bezier(0.4,0,0.2,1) ${
                  0.55 + i * 0.14
                }s forwards`,
              }}
            />
          ))}

          {/* Subtle flowing accents on two rings */}
          <ellipse
            cx="50"
            cy="50"
            rx={RINGS[2].rx}
            ry={RINGS[2].ry}
            fill="none"
            stroke="url(#orbit-accent)"
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
            pathLength={100}
            strokeDasharray="7 93"
            className="ring-accent"
            style={{ animation: "orbit-dash 46s linear infinite" }}
          />
          <ellipse
            cx="50"
            cy="50"
            rx={RINGS[4].rx}
            ry={RINGS[4].ry}
            fill="none"
            stroke="url(#orbit-accent-b)"
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
            pathLength={100}
            strokeDasharray="5 95"
            className="ring-accent"
            style={{ animation: "orbit-dash 64s linear infinite reverse" }}
          />
        </svg>

        {/* Orbiters — glide along elliptical paths, drift behind the card */}
        {ORBITERS.map((o, i) => (
          <div
            key={o.label}
            ref={(el) => {
              orbiterRefs.current[i] = el;
            }}
            title={o.label}
            className="absolute z-20 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(20,18,15,0.05),0_12px_28px_-12px_rgba(20,18,15,0.28)] sm:flex"
          >
            {o.icon}
          </div>
        ))}

        {/* ————— Central product card ————— */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute left-1/2 top-1/2 z-30 w-[min(88vw,382px)] -translate-x-1/2 -translate-y-1/2"
        >
          <div className="rounded-[22px] border border-black/[0.07] bg-white p-5 shadow-[0_1px_2px_rgba(20,18,15,0.05),0_32px_64px_-24px_rgba(20,18,15,0.28)]">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[12.5px] font-semibold text-neutral-900">
                  New leads found
                </span>
              </div>
              <button className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-400 transition-colors hover:text-neutral-900">
                View all
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            {/* Big number */}
            <div className="mt-3.5 flex items-baseline gap-2.5">
              <span className="font-display text-[46px] font-semibold leading-none tracking-[-0.03em] text-neutral-950">
                142
              </span>
              <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                +12 this week
              </span>
            </div>

            {/* Meta */}
            <div className="mt-4 space-y-2 border-t border-black/[0.05] pt-4">
              <MetaRow
                icon={<MapPin className="h-3 w-3" />}
                label="Location"
                value="Dallas, Texas"
              />
              <MetaRow
                icon={<Building2 className="h-3 w-3" />}
                label="Industry"
                value="Roofing companies"
              />
              <MetaRow
                icon={<Globe className="h-3 w-3" />}
                label="Source"
                value="Maps & web data"
              />
            </div>

            {/* AI Score */}
            <div className="mt-4 rounded-xl border border-black/[0.05] bg-neutral-50/80 p-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-neutral-700">
                  <Sparkles className="h-3 w-3 text-indigo-500" />
                  AI Score
                </span>
                <span className="font-display text-[15px] font-semibold text-neutral-950">
                  94
                  <span className="text-[11px] font-medium text-neutral-400">
                    /100
                  </span>
                </span>
              </div>
              <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-neutral-200/70">
                <motion.div
                  initial={false}
                  animate={{ width: "94%" }}
                  transition={{ duration: 1.4, delay: 1.15, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-sky-300"
                />
              </div>
            </div>

            {/* Verified */}
            <div className="mt-2.5 flex items-center justify-between rounded-xl border border-black/[0.05] bg-white px-3 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-neutral-600">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                Verified emails
              </span>
              <span className="text-[12.5px] font-semibold text-neutral-900">
                87%
              </span>
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center">
                {AVATARS.map((a, i) => (
                  <span
                    key={i}
                    className={`-ml-1.5 grid h-6 w-6 place-items-center rounded-full text-[8.5px] font-semibold ring-2 ring-white first:ml-0 ${a.tint}`}
                  >
                    {a.initials}
                  </span>
                ))}
                <span className="ml-2 text-[11px] font-medium text-neutral-400">
                  Ready for outreach
                </span>
              </div>
              <button className="h-7 rounded-lg bg-neutral-950 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-neutral-800">
                Start sequence
              </button>
            </div>
          </div>
        </motion.div>

        {/* ————— Floating mini lead/research cards ————— */}
        {MINIS.map((m) => (
          <motion.div
            key={m.title}
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute z-10 hidden lg:block ${m.pos}`}
          >
            <div
              className="motion-float flex items-center gap-2.5 rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(20,18,15,0.04),0_14px_32px_-16px_rgba(20,18,15,0.24)]"
              style={{ animation: "float-y 7s ease-in-out infinite", animationDelay: m.delay }}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${m.tint}`}
              >
                {m.icon}
              </span>
              <span className="text-left">
                <span className="block text-[12px] font-medium leading-tight text-neutral-800">
                  {m.title}
                </span>
                <span className="mt-0.5 block text-[10.5px] leading-tight text-neutral-400">
                  {m.sub}
                </span>
              </span>
            </div>
          </motion.div>
        ))}

        {/* Bottom blend into trust row */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-b from-transparent to-white"
        />
      </div>
    </div>
  );
}
