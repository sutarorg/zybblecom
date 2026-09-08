import Link from "next/link";
import { cx } from "@/lib/utils";

/** The Zybble mark — a z-bolt cut into a violet tile with a citron spark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cx("size-8", className)} aria-hidden="true">
      <defs>
        <linearGradient id="zybble-tile" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#7b5cff" />
          <stop offset="100%" stopColor="#4527e0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#zybble-tile)" />
      <path
        d="M13.5 15.5h21L21 32.5h13.5"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="37" cy="12.5" r="3.6" fill="#c8f542" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cx("group inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-8 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      <span className="font-display text-[22px] font-bold leading-none tracking-tight">
        zybble
      </span>
    </Link>
  );
}
