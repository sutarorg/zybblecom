import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <span className="eyebrow">
            <span className="eyebrow-dot" /> {eyebrow}
          </span>
        )}
        <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1.5 max-w-xl text-[14px] text-mut">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "grape",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone?: "grape" | "mint" | "amber" | "ink";
}) {
  const tones = {
    grape: "bg-grape-soft text-grape",
    mint: "bg-mint-soft text-mint",
    amber: "bg-amber-soft text-amber",
    ink: "bg-ink text-paper",
  } as const;
  return (
    <div className="card p-5 shadow-card">
      <span className={cn("grid size-9 place-items-center rounded-xl", tones[tone])}>
        <Icon className="size-4" />
      </span>
      <p className="mt-4 text-[22px] font-bold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 text-[12.5px] font-medium text-mut">{label}</p>
      {sub && <p className="mt-1 text-[11.5px] text-mut/80">{sub}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  sub,
  children,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  children?: ReactNode;
}) {
  return (
    <div className="card grid place-items-center border-dashed px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-grape-soft text-grape">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-5 text-[17px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-mut">{sub}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

export function OrderStatusBadge({ status }: { status: "pending" | "paid" | "failed" }) {
  if (status === "paid") return <span className="badge badge-mint">Paid</span>;
  if (status === "pending") return <span className="badge badge-amber">Pending</span>;
  return <span className="badge badge-rose">Failed</span>;
}

export function CourseStatusBadge({ status }: { status: "draft" | "published" }) {
  if (status === "published") return <span className="badge badge-mint">Published</span>;
  return <span className="badge badge-neutral">Draft</span>;
}

export function SettlementBadge({ status }: { status: "pending" | "paid" }) {
  if (status === "paid") return <span className="badge badge-mint">Paid</span>;
  return <span className="badge badge-amber">Processing</span>;
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-cream", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-grape to-[#b7a4ff] transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
