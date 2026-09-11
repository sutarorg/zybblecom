import {
  BadgeCheck,
  Check,
  Clock,
  FileText,
  GripVertical,
  Layers,
  Lock,
  Play,
  Plus,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 select-none place-items-center rounded-full bg-gradient-to-br from-[#b7a4ff] to-[#6d4cff] text-[10px] font-bold text-white",
        className,
      )}
      aria-hidden
    >
      {name}
    </span>
  );
}

/* ------------------------------ course page mock ----------------------------- */

export function CoursePageMock({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("card overflow-hidden shadow-pop", className)}>
      <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-[#2b2350] via-[#6d4cff] to-[#c78bd4]">
        <span className="badge absolute left-3 top-3 bg-white/15 text-white backdrop-blur">Design</span>
        <span className="grid size-12 place-items-center rounded-full bg-white/95 text-ink shadow-pop">
          <Play className="ml-0.5 size-5 fill-current" />
        </span>
        <span className="badge absolute bottom-3 right-3 bg-ink/60 text-white backdrop-blur">
          <Clock className="size-3" /> 4h 20m
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Avatar name="MR" />
          <span className="text-[12px] font-medium text-ink-soft">Maya Rao</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-amber">
            <Star className="size-3.5 fill-current" /> 4.9
          </span>
        </div>
        <h3 className="mt-3 text-[17px] font-semibold tracking-tight">
          The Indie Design System
        </h3>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-mut">
          Ship world-class product UI without a design team — tokens, type, color, and real Figma-to-code workflows.
        </p>

        <div className="mt-4 space-y-1.5">
          {[
            { t: "Foundations & tokens", d: "12:04", open: true },
            { t: "Type scales that just work", d: "09:31", open: true },
            { t: "Color for dark mode", d: "14:12", open: false },
          ].map((l) => (
            <div
              key={l.t}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-paper px-3 py-2.5"
            >
              {l.open ? (
                <Play className="size-3.5 text-grape" />
              ) : (
                <Lock className="size-3.5 text-mut" />
              )}
              <span className="truncate text-[12.5px] font-medium text-ink-soft">{l.t}</span>
              <span className="ml-auto text-[11px] tabular-nums text-mut">{l.d}</span>
            </div>
          ))}
        </div>

        {!compact && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-grape/25 bg-grape-soft px-4 py-3">
            <div>
              <div className="text-[15px] font-bold tabular-nums">₹1,499</div>
              <div className="text-[10.5px] text-mut">Lifetime access · 24 lessons</div>
            </div>
            <span className="btn btn-accent btn-sm pointer-events-none">Enroll now</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function EnrollToast({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "card flex items-center gap-3 rounded-2xl px-4 py-3 shadow-pop",
        className,
      )}
    >
      <Avatar name="AM" />
      <div className="text-[12px]">
        <p className="font-semibold text-ink">Aarav just enrolled</p>
        <p className="text-mut">Motion 101 · paid ₹1,899</p>
      </div>
      <BadgeCheck className="ml-2 size-4 text-mint" />
    </div>
  );
}

export function StudentsToast({ className }: { className?: string }) {
  return (
    <div className={cn("card flex items-center gap-3 rounded-2xl px-4 py-3 shadow-pop", className)}>
      <span className="grid size-8 place-items-center rounded-full bg-mint-soft text-mint">
        <TrendingUp className="size-4" />
      </span>
      <div className="text-[12px]">
        <p className="font-semibold text-ink">128 students this week</p>
        <p className="text-mut">+23% vs last week</p>
      </div>
    </div>
  );
}

/* ------------------------------ dashboard mock ------------------------------- */

const BARS = [42, 58, 38, 74, 52, 88, 64, 46, 92, 71, 56, 98, 79, 63];

export function BarsChart({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-24 items-end gap-1.5 sm:h-32", className)} aria-hidden>
      {BARS.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-[5px] bg-gradient-to-t from-grape/25 to-grape"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export function DashboardMock({ className }: { className?: string }) {
  return (
    <div className={cn("card overflow-hidden shadow-pop", className)}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 rounded-md bg-cream px-2 py-0.5 font-mono text-[10.5px] text-mut">
          zybble.com/dashboard
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold">Good morning, Maya</p>
          <Avatar name="MR" className="size-6" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { icon: Wallet, label: "Revenue", value: "₹84.2k" },
            { icon: Users, label: "Students", value: "312" },
            { icon: TrendingUp, label: "Conversion", value: "6.8%" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-paper p-3">
              <s.icon className="size-3.5 text-grape" />
              <p className="mt-2 text-[14px] font-bold tabular-nums sm:text-[16px]">{s.value}</p>
              <p className="text-[10px] text-mut">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-line bg-paper p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-ink-soft">Last 30 days</p>
            <span className="badge badge-mint">
              <TrendingUp className="size-3" /> +23%
            </span>
          </div>
          <BarsChart />
        </div>
        <div className="mt-3 space-y-1.5">
          {[
            { n: "Aria Mehta", c: "Motion 101", p: "₹1,899" },
            { n: "Rohan Iyer", c: "The Indie Design System", p: "₹1,499" },
          ].map((o) => (
            <div key={o.n} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2">
              <Avatar name={o.n.split(" ").map((w) => w[0]).join("")} className="size-6" />
              <span className="truncate text-[12px] font-medium">{o.n}</span>
              <span className="hidden truncate text-[11px] text-mut sm:block">{o.c}</span>
              <span className="ml-auto text-[12px] font-semibold tabular-nums">{o.p}</span>
              <span className="badge badge-mint hidden sm:inline-flex">Paid</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- builder mock -------------------------------- */

export function BuilderMock({ className }: { className?: string }) {
  return (
    <div className={cn("card overflow-hidden shadow-pop", className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <Layers className="size-4 text-grape" /> Course builder
        </div>
        <span className="btn btn-ink h-7 rounded-full px-3 text-[11px] pointer-events-none">
          Publish
        </span>
      </div>
      <div className="space-y-2.5 p-4">
        {[
          {
            title: "Foundations",
            lessons: [
              { t: "Welcome & setup", type: "video" as const },
              { t: "The 80/20 checklist", type: "pdf" as const },
            ],
          },
          {
            title: "Deep work",
            lessons: [{ t: "Editorial workflow", type: "video" as const }],
          },
        ].map((ch) => (
          <div key={ch.title} className="rounded-2xl border border-line bg-paper p-3">
            <div className="flex items-center gap-2">
              <GripVertical className="size-4 text-mut" />
              <p className="text-[12.5px] font-semibold">{ch.title}</p>
              <span className="ml-auto text-[10.5px] text-mut">{ch.lessons.length} lessons</span>
            </div>
            <div className="mt-2 space-y-1.5">
              {ch.lessons.map((l) => (
                <div
                  key={l.t}
                  className="flex items-center gap-2 rounded-xl border border-line bg-white px-2.5 py-2"
                >
                  {l.type === "video" ? (
                    <Play className="size-3 text-grape" />
                  ) : (
                    <FileText className="size-3 text-amber" />
                  )}
                  <span className="text-[12px] text-ink-soft">{l.t}</span>
                  <Check className="ml-auto size-3.5 text-mint" />
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-line px-2.5 py-2 text-[11.5px] text-mut">
                <Plus className="size-3" /> Add lesson
              </div>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-grape/40 bg-grape-soft/50 py-2.5 text-[12px] font-medium text-grape-deep">
          <Plus className="size-3.5" /> Add chapter
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- phone mock --------------------------------- */

export function PhonePlayerMock({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="rounded-[40px] border border-line bg-ink p-2.5 shadow-pop">
        <div className="overflow-hidden rounded-[32px] bg-paper">
          <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-[#1c1a2e] to-[#6d4cff]">
            <span className="grid size-11 place-items-center rounded-full bg-white/95 text-ink">
              <Play className="ml-0.5 size-4 fill-current" />
            </span>
            <span className="absolute bottom-2.5 right-3 rounded-md bg-ink/60 px-1.5 py-0.5 text-[9.5px] font-medium text-white">
              07:42
            </span>
          </div>
          <div className="p-4">
            <p className="text-[13px] font-semibold">Color for dark mode</p>
            <p className="mt-0.5 text-[11px] text-mut">Chapter 3 · The Indie Design System</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10.5px] font-medium">
                <span className="text-mut">Course progress</span>
                <span className="tabular-nums text-ink">64%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream">
                <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-grape to-[#b7a4ff]" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {[
                { t: "Foundations & tokens", done: true },
                { t: "Type scales that just work", done: true },
                { t: "Color for dark mode", done: false, current: true },
              ].map((l) => (
                <div key={l.t} className="flex items-center gap-2 rounded-xl border border-line px-2.5 py-2">
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded-full border",
                      l.done
                        ? "border-mint bg-mint text-white"
                        : l.current
                          ? "border-grape text-grape"
                          : "border-line text-transparent",
                    )}
                  >
                    {l.done ? <Check className="size-2.5" /> : <span className="size-1.5 rounded-full bg-current" />}
                  </span>
                  <span className={cn("text-[11px]", l.done ? "text-mut line-through" : "text-ink-soft")}>
                    {l.t}
                  </span>
                </div>
              ))}
            </div>
            <div className="btn btn-ink btn-sm mt-3 w-full pointer-events-none">
              Mark lesson complete
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
