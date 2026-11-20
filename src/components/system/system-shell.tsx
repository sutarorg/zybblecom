import Link from "next/link";
import { ArrowUpLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Bolt, Brand, Eyebrow, IconTile } from "@/components/ui/primitives";

export function SystemHeader() {
  return (
    <header className="system-header">
      <div className="container system-header-inner">
        <Brand />
        <Link href="/" className="system-home">
          <ArrowUpLeft size={16} aria-hidden="true" /> Back to home
        </Link>
      </div>
    </header>
  );
}
export function SystemLayout({ children }: { children: ReactNode }) {
  return (
    <div className="system-layout">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SystemHeader />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
export function SystemPanel({
  icon,
  label,
  title,
  description,
  children,
  tone = "purple",
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  children?: ReactNode;
  tone?: "purple" | "pink" | "blue" | "mint" | "orange";
}) {
  return (
    <section className="system-stage">
      <div className="card system-card">
        <Bolt className="system-watermark" />
        <IconTile icon={icon} tone={tone} />
        <Eyebrow>{label}</Eyebrow>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </div>
    </section>
  );
}
