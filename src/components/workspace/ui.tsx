import { CircleAlert, type LucideIcon } from "lucide-react";
import { Eyebrow, IconTile } from "@/components/ui/primitives";
import { RetryButton } from "@/components/system/errors";
import type { ReactNode } from "react";
import type { Result } from "@/services/workspace-contracts";
import { workspaceMessage } from "@/services/workspace";
export function WorkspaceHeading({
  label,
  title,
  description,
  action,
}: {
  label?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="ws-page-heading">
      <div>
        {label && <Eyebrow>{label}</Eyebrow>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function WorkspaceEmpty({
  icon,
  title,
  text,
  action,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`ws-empty ${className}`}>
      <div className="ws-empty-icon">
        <IconTile icon={icon} />
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function WorkspaceIssue({ result }: { result: Result<unknown> }) {
  return !result.ok && result.error !== "unavailable" ? (
    <div className="notice notice-error">
      <CircleAlert size={19} aria-hidden="true" />
      <p>{workspaceMessage(result.error)}</p>
      {["network", "unexpected"].includes(result.error) && <RetryButton />}
    </div>
  ) : null;
}
export function MediaImage({ src, alt = "" }: { src: string; alt?: string }) {
  // Private media must not enter a shared image cache. The API supplies sized thumbnails.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}
export function WorkspaceSkeleton() {
  return (
    <div role="status" className="ws-skeleton">
      <span className="sr-only">Loading workspace data…</span>
      <div aria-hidden="true">
        <i />
        <i />
        <div>
          <i />
          <i />
          <i />
        </div>
        <i />
      </div>
    </div>
  );
}
