import { ShieldCheck } from "lucide-react";
import { SystemPanel } from "@/components/system/system-shell";
import { Action } from "@/components/ui/primitives";
import { pageMetadata } from "@/lib/seo/metadata";
export const metadata = pageMetadata(
  "/privacy",
  "Preview privacy notice",
  "Understand how account form inputs are handled in the Zybble frontend preview.",
  { noindex: true },
);
export default function Privacy() {
  return (
    <SystemPanel
      icon={ShieldCheck}
      label="PREVIEW PRIVACY NOTICE"
      title="Your account form inputs."
      description="This notice applies to the account screens in the frontend preview. It isn’t the production privacy policy."
    >
      <div className="system-prose">
        <h2>What happens to form inputs?</h2>
        <p>
          Sign-in, signup, and recovery forms validate inputs in your browser.
          They do not send passwords or email addresses to an authentication
          service. Onboarding choices stay on the page and aren’t saved to a
          profile.
        </p>
        <h2>Before accounts open</h2>
        <p>
          A production privacy policy needs to be published before account
          services are enabled. Don’t enter a real password in the preview.
        </p>
      </div>
      <Action href="/help" variant="secondary">
        Visit help centre
      </Action>
    </SystemPanel>
  );
}
