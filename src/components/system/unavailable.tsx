import { Timer } from "lucide-react";
import { Action } from "@/components/ui/primitives";
import { SystemPanel } from "./system-shell";
import { RetryButton } from "./errors";
export function ServiceUnavailable({
  description = "This part of Zybble is temporarily unavailable. Check again in a little while, or visit the help centre.",
}: {
  description?: string;
}) {
  return (
    <SystemPanel
      icon={Timer}
      label="TEMPORARILY UNAVAILABLE"
      title="We’ll be back shortly."
      description={description}
    >
      <div className="actions system-actions">
        <RetryButton label="Check again" />
        <Action href="/help" variant="secondary">
          Help centre
        </Action>
      </div>
    </SystemPanel>
  );
}
