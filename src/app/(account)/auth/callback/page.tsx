import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Link2Off } from "lucide-react";
import { frontendServices, accountDestination } from "@/lib/services";
import type { CallbackProof } from "@/lib/services/contracts";
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
  // Provider parameters indicate an intent only. Only the adapter can verify them.
  const type = params.type;
  const proof: CallbackProof | null =
    typeof params.code === "string"
      ? { kind: "code" as const, value: params.code }
      : (type === "recovery" || type === "email") &&
          typeof params.token_hash === "string"
        ? { kind: type, value: params.token_hash }
        : null;
  const result = proof
    ? await frontendServices.completeCallback(proof)
    : { ok: false as const, error: "invalid_link" as const };
  if (result.ok) {
    switch (result.value.kind) {
      case "login":
        redirect(accountDestination(result.value.session.onboardingComplete));
      case "verified":
        redirect("/verify-email");
      case "recovery":
        redirect("/reset-password");
    }
  }
  return (
    <SystemPanel
      icon={Link2Off}
      label="ACCOUNT LINK"
      title={
        result.error === "unavailable"
          ? "Account links aren’t active yet."
          : "This link can’t be used."
      }
      description={serviceMessage(result.error)}
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
