import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/utils";

export function buttonClasses(
  variant: "ink" | "brand" | "outline" | "ghost" | "lime" | "danger" = "ink",
  size: "sm" | "md" | "lg" = "md",
) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    size === "sm" && "h-9 px-4 text-[13px]",
    size === "md" && "h-11 px-5 text-sm",
    size === "lg" && "h-13 px-7 text-base",
    variant === "ink" && "bg-ink text-paper hover:bg-black hover:shadow-lg",
    variant === "brand" &&
      "bg-brand text-white shadow-[0_10px_30px_-10px_rgba(91,61,245,0.7)] hover:bg-brand-deep",
    variant === "lime" && "bg-lime text-ink hover:brightness-95",
    variant === "outline" &&
      "border border-ink/15 bg-white/60 text-ink hover:border-ink/35 hover:bg-white",
    variant === "ghost" && "text-ink-soft hover:bg-ink/5 hover:text-ink",
    variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
  );
}

export function Button({
  variant = "ink",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ink" | "brand" | "outline" | "ghost" | "lime" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  return <button className={cx(buttonClasses(variant, size), className)} {...props} />;
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-line bg-white shadow-[var(--shadow-card)]",
        className,
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
  tone?: "neutral" | "brand" | "green" | "amber" | "red" | "ink";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tone === "neutral" && "bg-ink/6 text-ink-soft",
        tone === "brand" && "bg-brand/10 text-brand",
        tone === "green" && "bg-emerald-100 text-emerald-700",
        tone === "amber" && "bg-amber-100 text-amber-700",
        tone === "red" && "bg-red-100 text-red-700",
        tone === "ink" && "bg-ink text-paper",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
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
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-ink/15 bg-white/50 px-6 py-14 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-cream text-ink-soft">
        {icon}
      </div>
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-ink-soft">{body}</p>
      {action}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      aria-label="Loading"
    />
  );
}

export const inputClasses =
  "h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-brand focus:ring-4 focus:ring-brand/15";

export const labelClasses =
  "mb-1.5 block text-[13px] font-semibold text-ink-soft";
