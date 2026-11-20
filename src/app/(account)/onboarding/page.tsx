import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AccountFrame } from "@/components/account/account-shell";
import { ServiceUnavailable } from "@/components/system/unavailable";
import { Onboarding } from "@/components/account/onboarding";
import { accountServer } from "@/lib/services/account-server";
import { pageMetadata } from "@/lib/seo/metadata";
export const metadata = pageMetadata(
  "/onboarding",
  "Set up your workspace",
  "Choose how you want to get started with Zybble.",
  { noindex: true },
);
export default async function OnboardingPage() {
  await connection();
  const session = await accountServer.getSession();
  if (session.ok && session.value?.onboardingComplete) redirect("/dashboard");
  if (session.ok && !session.value) redirect("/login");
  if (
    !session.ok &&
    ["unauthorized", "expired_session"].includes(session.error)
  )
    redirect("/unauthorized");
  if (!session.ok && session.error !== "unavailable")
    return (
      <ServiceUnavailable description="We couldn’t check your workspace session. Try again before choosing your preferences." />
    );
  return (
    <AccountFrame onboarding legal={false}>
      <Onboarding connected={session.ok && session.value !== null} />
    </AccountFrame>
  );
}
