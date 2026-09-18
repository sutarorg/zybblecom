import { cn } from "../utils/cn";

export type LogoMarkProps = {
  className?: string;
  /** `dark` is for placing the mark on a dark surface. */
  surface?: "light" | "dark";
};

/**
 * Zybble's geometric mark: a continuous Z-shaped route with an orbit node.
 * The route represents find → understand → reach; the node is the intelligence
 * layer. It stays legible at favicon size and has a reversed surface variant.
 */
export function LogoMark({ className, surface = "light" }: LogoMarkProps) {
  const reversed = surface === "dark";
  const id = reversed ? "zybble-mark-dark" : "zybble-mark-light";

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-node`} x1="15" y1="48" x2="50" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id={`${id}-glow`} x1="10" y1="52" x2="54" y2="10" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0f172a" />
          <stop offset="1" stopColor="#24212f" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="18"
        fill={reversed ? "#f7f6f3" : `url(#${id}-glow)`}
      />
      <path
        d="M17.5 18.5h28L19 45.5h27.5"
        fill="none"
        stroke={reversed ? "#111113" : "#ffffff"}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="46.5" cy="18.5" r="5" fill={`url(#${id}-node)`} />
      <circle cx="46.5" cy="18.5" r="2" fill="#ffffff" fillOpacity={reversed ? "0.95" : "0.75"} />
    </svg>
  );
}

export default function Logo({
  className,
  href = "/",
  surface = "light",
  "aria-label": ariaLabel = "Zybble home",
}: {
  className?: string;
  href?: string;
  surface?: "light" | "dark";
  "aria-label"?: string;
}) {
  const reversed = surface === "dark";
  return (
    <a
      href={href}
      className={cn("group inline-flex items-center gap-2.5 outline-none", className)}
      aria-label={ariaLabel}
    >
      <LogoMark
        surface={surface}
        className="h-[26px] w-[26px] transition-transform duration-500 group-hover:rotate-[8deg]"
      />
      <span
        className={cn(
          "font-display text-[17px] font-semibold tracking-[-0.02em]",
          reversed ? "text-white" : "text-neutral-950"
        )}
      >
        Zybble
      </span>
    </a>
  );
}
