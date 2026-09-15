import { cn } from "../utils/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#14120f" />
      <path
        d="M21 21.5h21.5L27.5 42.5H44"
        stroke="#ffffff"
        strokeWidth="5.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="46.5" cy="18" r="4" fill="#6366f1" />
    </svg>
  );
}

export default function Logo({ className }: { className?: string }) {
  return (
    <a
      href="#top"
      className={cn(
        "group inline-flex items-center gap-2.5 outline-none",
        className
      )}
      aria-label="Zybble home"
    >
      <LogoMark className="h-[26px] w-[26px] transition-transform duration-500 group-hover:rotate-[8deg]" />
      <span className="font-display text-[17px] font-semibold tracking-[-0.02em] text-neutral-950">
        Zybble
      </span>
    </a>
  );
}
