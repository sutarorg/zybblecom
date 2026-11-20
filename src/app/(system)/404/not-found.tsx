import { Compass } from "lucide-react";
import { Action } from "@/components/ui/primitives";
import { SystemPanel } from "@/components/system/system-shell";
export default function Missing() {
  return (
    <SystemPanel
      icon={Compass}
      label="404 · NOT FOUND"
      title="This page is off the timeline."
      description="The link may have changed, or the page may no longer be available. Here’s how to get back."
    >
      <div className="actions system-actions">
        <Action href="/">Back to homepage</Action>
        <Action href="/dashboard" variant="secondary">
          Go to dashboard
        </Action>
      </div>
    </SystemPanel>
  );
}
