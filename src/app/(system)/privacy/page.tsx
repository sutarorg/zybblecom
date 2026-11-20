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
          In a disconnected preview, account forms validate inputs without
          creating an account. When authentication is connected, Supabase Auth
          processes signup, sign-in and recovery requests, and Zybble saves
          account details and onboarding choices for your account.
        </p>
        <h2>Before accounts open</h2>
        <p>
          A production privacy policy needs to be published before account
          services are offered to customers. Use only dedicated test credentials
          in preview environments.
        </p>
      </div>
      <Action href="/help" variant="secondary">
        Visit help centre
      </Action>
    </SystemPanel>
  );
}
