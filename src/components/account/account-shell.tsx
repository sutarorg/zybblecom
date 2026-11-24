import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Captions,
  Scissors,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Bolt, Eyebrow, IconTile } from "@/components/ui/primitives";

export function AccountArt({ onboarding = false }: { onboarding?: boolean }) {
  return (
    <aside className="account-art" aria-hidden="true">
      <Image
        src="/images/podcast-host-portrait.webp"
        alt=""
        fill
        sizes="(min-width: 1200px) 495px, 46vw"
        className="object-cover"
      />
      <div className="account-art-overlay" />
      <div className="account-art-top">
        <span>
          <Bolt /> THE CREATOR WORKSPACE
        </span>
        <ArrowUpRight size={19} />
      </div>
      <div className="account-art-tag">
        <Captions size={17} /> Built for short-form
      </div>
      <div className="account-art-copy">
        <div className="account-art-kicker">
          <i /> {onboarding ? "MAKE IT YOURS" : "FROM LONG TO SHORT"}
        </div>
        <p>
          {onboarding ? (
            <>
              Your footage.
              <br />
              Your next move.
            </>
          ) : (
            <>
              Good content deserves <em>a second life.</em>
            </>
          )}
        </p>
        <div className="account-art-tools">
          <span>
            <Scissors size={15} /> AI clipping
          </span>
          <span>
            <Smartphone size={15} /> 9:16 framing
          </span>
        </div>
      </div>
    </aside>
  );
}
export function AccountFrame({
  children,
  onboarding = false,
  legal = true,
}: {
  children: ReactNode;
  onboarding?: boolean;
  legal?: boolean;
}) {
  return (
    <div className="account-grid container">
      <AccountArt onboarding={onboarding} />
      <div className="account-content">
        <div className="account-content-inner">
          {children}
          {legal && (
            <div className="account-legal">
              <Link href="/privacy">Privacy Policy</Link>
              <span aria-hidden="true">·</span>
              <Link href="/terms">Terms of Service</Link>
              <span aria-hidden="true">·</span>
              <Link href="/help">Help centre</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export function AccountHeading({
  icon,
  label,
  title,
  description,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="account-heading">
      <IconTile icon={icon} />
      <Eyebrow>{label}</Eyebrow>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
