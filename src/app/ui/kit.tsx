import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, CheckCircle2, ChevronDown, Info, Loader2, X, XCircle } from "lucide-react";
import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../../utils/cn";

// ————————————————— Buttons —————————————————

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: BtnProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 rounded-lg px-3 text-[12.5px]" : "h-10 rounded-xl px-4 text-[13.5px]",
        variant === "primary" &&
          "bg-neutral-950 text-white shadow-[0_1px_2px_rgba(20,18,15,0.2),0_10px_24px_-10px_rgba(20,18,15,0.35)] hover:-translate-y-px hover:bg-neutral-800",
        variant === "secondary" &&
          "border border-neutral-300 bg-white text-neutral-800 shadow-sm hover:border-neutral-400 hover:bg-neutral-50",
        variant === "ghost" && "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950",
        variant === "danger" && "border border-red-200 bg-white text-red-600 hover:bg-red-50",
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

// ————————————————— Form controls —————————————————

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3.5 text-[13.5px] text-neutral-900 shadow-[0_1px_2px_rgba(20,18,15,0.03)] outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-900/[0.04]",
        className
      )}
      {...rest}
    />
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed text-neutral-900 shadow-[0_1px_2px_rgba(20,18,15,0.03)] outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-900/[0.04]",
        className
      )}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative grid">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-xl border border-black/[0.08] bg-white px-3.5 pr-9 text-[13.5px] text-neutral-900 shadow-[0_1px_2px_rgba(20,18,15,0.03)] outline-none transition-all focus:border-neutral-400 focus:ring-4 focus:ring-neutral-900/[0.04]",
          className
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-neutral-700">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11.5px] text-neutral-400">{hint}</span>}
    </label>
  );
}

// ————————————————— Surfaces —————————————————

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(20,18,15,0.03),0_16px_40px_-24px_rgba(20,18,15,0.12)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "green" | "blue" | "amber" | "red" | "violet";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-neutral-100 text-neutral-600",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-600",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// ————————————————— State blocks —————————————————

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin text-neutral-400", className)} />;
}

export function Empty({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-black/[0.06] bg-neutral-50 text-neutral-400">
        {icon}
      </div>
      <p className="mt-4 font-display text-[16px] font-semibold text-neutral-900">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-neutral-500">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ————————————————— Modal —————————————————

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] grid place-items-center bg-neutral-950/20 p-4 backdrop-blur-[2px]"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "max-h-[88vh] w-full overflow-y-auto rounded-2xl border border-black/[0.07] bg-white shadow-[0_40px_90px_-30px_rgba(20,18,15,0.4)]",
              wide ? "max-w-2xl" : "max-w-md"
            )}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/[0.05] bg-white/95 px-5 py-3.5 backdrop-blur-sm">
              <p className="font-display text-[15px] font-semibold text-neutral-950">{title}</p>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-7 w-7 place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ————————————————— Toasts —————————————————

type Toast = { id: number; kind: "success" | "error" | "info"; text: string };
let toastId = 0;
const toastListeners = new Set<(t: Toast) => void>();

export function toast(text: string, kind: Toast["kind"] = "success") {
  const t = { id: ++toastId, kind, text };
  toastListeners.forEach((fn) => fn(t));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const handler = (t: Toast) => {
      setItems((xs) => [...xs, t]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), 4200);
    };
    toastListeners.add(handler);
    return () => {
      toastListeners.delete(handler);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[320px] flex-col gap-2">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-black/[0.07] bg-white px-3.5 py-3 shadow-[0_20px_44px_-16px_rgba(20,18,15,0.3)]"
          >
            {t.kind === "success" && <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-emerald-500" />}
            {t.kind === "error" && <XCircle className="mt-px h-4 w-4 shrink-0 text-red-500" />}
            {t.kind === "info" && <Info className="mt-px h-4 w-4 shrink-0 text-sky-500" />}
            <p className="text-[12.5px] font-medium leading-snug text-neutral-800">{t.text}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ————————————————— Job progress stepper —————————————————

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued",
  searching: "Searching",
  collecting: "Collecting",
  enriching: "Enriching",
  finding_emails: "Finding emails",
  complete: "Complete",
  failed: "Failed",
};

const STAGE_ORDER = ["queued", "searching", "collecting", "enriching", "finding_emails", "complete"];

export function stageLabel(s: string) {
  return STAGE_LABELS[s] ?? s;
}

export function StageStepper({ status }: { status: string }) {
  const failed = status === "failed";
  const idx = failed ? 1 : STAGE_ORDER.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {STAGE_ORDER.slice(1, 6).map((s, i) => {
        const stageIdx = i + 1;
        const done = stageIdx < idx || status === "complete";
        const active = stageIdx === idx && !failed && status !== "complete";
        return (
          <div key={s} className="flex items-center gap-1">
            <div
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full border text-[9px] font-semibold transition-colors",
                done && "border-emerald-500 bg-emerald-500 text-white",
                active && "border-neutral-900 bg-white text-neutral-900",
                !done && !active && "border-neutral-200 bg-white text-neutral-300",
                failed && stageIdx === idx && "border-red-500 bg-red-500 text-white"
              )}
            >
              {done ? <Check className="h-2.5 w-2.5" strokeWidth={3.5} /> : stageIdx}
            </div>
            {i < 4 && <div className={cn("h-px w-3 sm:w-4", done ? "bg-emerald-400" : "bg-neutral-200")} />}
          </div>
        );
      })}
    </div>
  );
}

// ————————————————— Score meter —————————————————

export function ScoreChip({ score }: { score: number | null }) {
  if (score === null) return <span className="text-[11px] text-neutral-300">—</span>;
  const tone =
    score >= 85 ? "bg-emerald-50 text-emerald-700" : score >= 70 ? "bg-sky-50 text-sky-700" : score >= 50 ? "bg-amber-50 text-amber-700" : "bg-neutral-100 text-neutral-500";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", tone)}>
      {score}
    </span>
  );
}

export function EmailStatusDot({ status }: { status: string | null }) {
  if (!status) return <span className="text-[11px] text-neutral-300">—</span>;
  const map: Record<string, { dot: string; label: string }> = {
    verified: { dot: "bg-emerald-500", label: "Verified" },
    risky: { dot: "bg-amber-400", label: "Risky" },
    invalid: { dot: "bg-red-400", label: "Invalid" },
    unknown: { dot: "bg-neutral-300", label: "Unknown" },
  };
  const s = map[status] ?? map.unknown;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function UsageMeter({ used, total }: { used: number; total: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, total)) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-neutral-500">Leads this month</span>
        <span className="text-[11px] font-semibold text-neutral-700">
          {used.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-200/70">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className={cn("h-full rounded-full", pct > 90 ? "bg-red-400" : pct > 70 ? "bg-amber-400" : "bg-neutral-900")}
        />
      </div>
    </div>
  );
}

export function LinkButton({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "group inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-950",
        className
      )}
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
    </a>
  );
}
