import { FileText } from "lucide-react";
import { SystemPanel } from "@/components/system/system-shell";
import { Action } from "@/components/ui/primitives";
import { pageMetadata } from "@/lib/seo/metadata";
export const metadata = pageMetadata(
  "/terms",
  "Preview terms notice",
  "Understand the limits of the Zybble account and checkout preview.",
  { noindex: true },
);
export default function Terms() {
  return (
    <SystemPanel
      icon={FileText}
      label="PREVIEW TERMS NOTICE"
      title="What this preview supports."
      description="You can explore the marketing site and try the account forms. This notice isn’t a production agreement."
    >
      <div className="system-prose">
        <h2>No accounts or purchases are created</h2>
        <p>
          Acknowledging this notice on the signup page only checks the form. It
          does not create an account, charge you, or grant credits.
        </p>
        <h2>Before the service opens</h2>
        <p>
          Production terms will need to be available for review before Zybble
          accepts registrations or payments.
        </p>
      </div>
      <Action href="/privacy" variant="secondary">
        Read the preview privacy notice
      </Action>
    </SystemPanel>
  );
}
