import { ShieldAlert } from "lucide-react";
import { Action } from "@/components/ui/primitives";
import { SystemPanel } from "@/components/system/system-shell";
import { pageMetadata } from "@/lib/seo/metadata";
export const metadata = pageMetadata(
  "/unauthorized",
  "Access unavailable",
  "Get help reaching your Zybble workspace.",
  { noindex: true },
);
export default function Unauthorized() {
  return (
    <SystemPanel
      icon={ShieldAlert}
      tone="orange"
      label="ACCESS UNAVAILABLE"
      title="You can’t access this area."
      description="Your session might have ended, or this account may not have access. Try signing in again or return to the workspace."
    >
      <div className="actions system-actions">
        <Action href="/login">Go to log in</Action>
        <Action href="/dashboard" variant="secondary">
          Return to dashboard
        </Action>
      </div>
    </SystemPanel>
  );
}
