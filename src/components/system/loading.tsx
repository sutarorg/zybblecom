import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";

export function Spinner() {
  return (
    <LoaderCircle size={19} className="system-spinner" aria-hidden="true" />
  );
}
export function PendingButton({
  pending,
  pendingLabel,
  children,
  className = "",
  disabled,
  ...props
}: ComponentProps<"button"> & { pending?: boolean; pendingLabel?: string }) {
  return (
    <button
      {...props}
      disabled={disabled || pending}
      className={`button ${className || "button-primary"}`}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel ?? "Please wait…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}
export function PageLoader({
  label = "Loading Zybble…",
  description,
  fullPage = false,
}: {
  label?: string;
  description?: string;
  fullPage?: boolean;
}) {
  return (
    <div className={`system-stage ${fullPage ? "system-full-loader" : ""}`}>
      <div className="card system-card" role="status">
        <span className="icon-tile tone-purple">
          <Spinner />
        </span>
        <h1>{label}</h1>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}
