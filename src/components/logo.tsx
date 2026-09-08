import Link from "next/link";
import { cx } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "grid size-8 place-items-center rounded-[10px] bg-brand font-display text-lg font-bold text-white shadow-[0_6px_16px_-6px_rgba(91,61,245,0.8)]",
        className,
      )}
    >
      z
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cx("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-tight">zybble</span>
    </Link>
  );
}
