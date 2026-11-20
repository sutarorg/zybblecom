import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Zap, type LucideIcon } from "lucide-react";

export function Bolt({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M13.7 1.6 3.5 14h7.1L9.5 22.4 20.6 9.1h-7.9l1-7.5Z" />
    </svg>
  );
}
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Zybble home">
      <span className="brand-mark">
        <Bolt />
      </span>
      <span>
        zybble<span className="brand-period">.</span>
      </span>
    </Link>
  );
}
export function Action({
  href,
  children,
  variant = "primary",
  arrow = true,
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "light" | "text";
  arrow?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={`button button-${variant} ${className}`}>
      {children}
      {arrow && <ArrowRight size={17} aria-hidden="true" />}
    </Link>
  );
}
export function Eyebrow({
  children,
  pill = false,
}: {
  children: ReactNode;
  pill?: boolean;
}) {
  return (
    <span className={`eyebrow ${pill ? "eyebrow-pill" : ""}`}>
      {pill ? (
        <Zap size={13} aria-hidden="true" />
      ) : (
        <span className="eyebrow-dot" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
export function SectionTitle({
  label,
  title,
  description,
  align = "center",
}: {
  label?: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`section-title ${align === "left" ? "is-left" : ""}`}>
      {label && <Eyebrow>{label}</Eyebrow>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
export function IconTile({
  icon: Icon,
  tone = "purple",
}: {
  icon: LucideIcon;
  tone?: "purple" | "pink" | "blue" | "mint" | "orange";
}) {
  return (
    <span className={`icon-tile tone-${tone}`}>
      <Icon size={21} strokeWidth={1.9} aria-hidden="true" />
    </span>
  );
}
