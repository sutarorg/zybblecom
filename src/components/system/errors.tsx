"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, RefreshCw } from "lucide-react";
import { Action } from "@/components/ui/primitives";
import { SystemPanel } from "./system-shell";
import { PendingButton } from "./loading";

export function RetryButton({
  retry,
  label = "Try again",
}: {
  retry?: () => void;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <PendingButton
      type="button"
      pending={pending}
      pendingLabel="Checking…"
      onClick={() =>
        startTransition(() => (retry ? retry() : router.refresh()))
      }
    >
      <RefreshCw size={17} aria-hidden="true" />
      {label}
    </PendingButton>
  );
}
export function ApplicationError({ retry }: { retry: () => void }) {
  return (
    <SystemPanel
      icon={CircleAlert}
      label="APPLICATION ERROR"
      title="Something went wrong."
      description="This page couldn’t load. Try again, or return to the workspace if the problem persists."
      tone="pink"
    >
      <div className="actions system-actions">
        <RetryButton retry={retry} />
        <Action href="/dashboard" variant="secondary">
          Return to dashboard
        </Action>
        <Action href="/contact" variant="text" arrow={false}>
          Get support
        </Action>
      </div>
    </SystemPanel>
  );
}
