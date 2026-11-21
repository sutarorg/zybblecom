import { expectedDodoMode } from "@/lib/backend/dodo-readiness";
import { checkoutEnabled } from "@/lib/backend/dodo";
import { accountServer } from "@/lib/services/account-server";
import { CheckoutButton } from "@/components/pricing/checkout-button";
import { notFound } from "next/navigation";
import { Check, LockKeyhole } from "lucide-react";
import { creditPacks } from "@/config/credit-packs";
import { requestPricing } from "@/lib/pricing/region";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageIntro } from "@/components/shared/page";
import { PriceDisplay } from "@/components/pricing/pricing";
import { Action } from "@/components/ui/primitives";
type Props = { params: Promise<{ pack: string }> };
export async function generateMetadata({ params }: Props) {
  const { pack } = await params;
  const selected = creditPacks.find((item) => item.id === pack);
  if (!selected) return {};
  return pageMetadata(
    `/pricing/${selected.id}`,
    `${selected.name} Credit Pack`,
    `${selected.credits} credits for standard video processing, with a single payment and no expiry.`,
    { noindex: true },
  );
}
export default async function PackPage({ params }: Props) {
  const { pack } = await params;
  const selected = creditPacks.find((item) => item.id === pack);
  if (!selected) notFound();
  const { currency } = await requestPricing();
  const mode = expectedDodoMode(process.env);
  const enabled = checkoutEnabled(selected.id, currency);
  const session = enabled ? await accountServer.getSession() : null;
  return (
    <>
      <PageIntro
        path={`/pricing/${selected.id}`}
        label={`${selected.name} pack`}
        title={`${selected.credits} credits. One payment.`}
        description={selected.description}
      />
      <section className="section compact">
        <div className="narrow">
          <div className="card pack-review">
            <h2>{selected.name} credit pack</h2>
            <PriceDisplay pack={selected} currency={currency} />
            <ul>
              {selected.features.map((feature) => (
                <li key={feature}>
                  <Check size={16} aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            {enabled ? (
              <>
                <div className="notice">
                  <LockKeyhole size={19} aria-hidden="true" />
                  <p>
                    {mode === "test_mode"
                      ? "Test mode only. No real payment will be collected."
                      : "You’ll pay securely through Dodo’s hosted checkout."}
                  </p>
                </div>
                {session?.ok && session.value ? (
                  <CheckoutButton packId={selected.id} mode={mode} />
                ) : (
                  <Action href={`/login?pack=${selected.id}`}>
                    Sign in to continue
                  </Action>
                )}
              </>
            ) : (
              <div className="notice">
                <LockKeyhole size={19} aria-hidden="true" />
                <p>
                  <strong>Checkout isn’t open yet.</strong> No payment details
                  are needed, and you haven’t been charged.
                </p>
              </div>
            )}
            <Action href="/pricing" variant="secondary" arrow={false}>
              Back to pack comparison
            </Action>
          </div>
        </div>
      </section>
    </>
  );
}
