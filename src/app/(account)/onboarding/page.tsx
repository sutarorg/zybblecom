import { creditPacks } from "@/config/credit-packs";
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
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string | string[] }>;
}) {
  const { pack } = await searchParams;
  const checkoutPack = creditPacks.find((item) => item.id === pack)?.id;
  const destination = checkoutPack
    ? `/credits?pack=${checkoutPack}#credit-packs`
    : "/dashboard";
  await connection();
  const session = await accountServer.getSession();
  if (session.ok && session.value?.onboardingComplete) redirect(destination);
  if (session.ok && !session.value)
    redirect(checkoutPack ? `/login?pack=${checkoutPack}` : "/login");
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
      <Onboarding
        destination={destination}
        connected={session.ok && session.value !== null}
      />
    </AccountFrame>
  );
}
