import { Suspense } from "react";
import { Link2Off } from "lucide-react";
import { authSettings } from "@/lib/backend/supabase";
import { serviceMessage } from "@/lib/services/messages";
import { pageMetadata } from "@/lib/seo/metadata";
import { Action } from "@/components/ui/primitives";
import { PageLoader } from "@/components/system/loading";
import { SystemPanel } from "@/components/system/system-shell";
export const metadata = pageMetadata(
  "/auth/callback",
  "Account link",
  "Finish an account verification or password recovery step.",
  { noindex: true },
);
type Params = Promise<Record<string, string | string[] | undefined>>;
export default function Callback({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense
      fallback={
        <PageLoader
          label="Checking your account link…"
          description="You’ll be taken to the next step once your link is verified."
        />
      }
    >
      <CallbackResult searchParams={searchParams} />
    </Suspense>
  );
}
async function CallbackResult({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const type = params.type;
  // Configured callbacks exchange proofs in a Route Handler (not during render).
  const error =
    !authSettings() && (params.code || params.token_hash)
      ? "unavailable"
      : "invalid_link";
  return (
    <SystemPanel
      icon={Link2Off}
      label="ACCOUNT LINK"
      title={
        error === "unavailable"
          ? "Account links aren’t active yet."
          : "This link can’t be used."
      }
      description={serviceMessage(error)}
    >
      <div className="actions system-actions">
        <Action
          href={type === "recovery" ? "/forgot-password" : "/verify-email"}
          variant="secondary"
        >
          {type === "recovery" ? "Password recovery" : "Verification help"}
        </Action>
        <Action href="/login">Back to log in</Action>
      </div>
    </SystemPanel>
  );
}
