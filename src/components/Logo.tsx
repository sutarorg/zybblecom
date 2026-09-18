import { cn } from "../utils/cn";
import { MLink } from "../seo/Seo";

/** The supplied Zybble mark, kept as an external SVG so it is also cacheable and indexable. */
export function LogoMark({ className }: { className?: string }) {
  return <img src="/logo.svg" alt="" aria-hidden="true" className={cn("rounded-[4px]", className)} />;
}

export default function Logo({ className }: { className?: string }) {
  return (
    <MLink
      to="/"
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
    </MLink>
  );
}
