import { checkoutEnabled } from "@/lib/backend/dodo";
import {
  Check,
  CircleDollarSign,
  Infinity,
  LockKeyhole,
  ReceiptText,
} from "lucide-react";
import {
  creditPacks,
  type CreditPack,
  type Currency,
} from "@/config/credit-packs";
import { requestPricing } from "@/lib/pricing/region";
import { Action, SectionTitle } from "@/components/ui/primitives";

export function PriceDisplay({
  pack,
  currency,
}: {
  pack: CreditPack;
  currency: Currency;
}) {
  const price = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(pack.pricesMinor[currency] / 100);
  return (
    <p className="pack-price">
      <strong>{price}</strong>
      <span>{currency} · one-time</span>
    </p>
  );
}

export async function PricingSection({
  preview = false,
}: {
  preview?: boolean;
}) {
  const { currency } = await requestPricing();
  const enabled = creditPacks.some((pack) =>
    checkoutEnabled(pack.id, currency),
  );
  return (
    <section className={`section pricing-section ${preview ? "tinted" : ""}`}>
      <div className="container">
        {preview ? (
          <SectionTitle
            label="ONE-TIME CREDIT PACKS"
            title={
              <>
                Pay once. <span className="accent">Create anytime.</span>
              </>
            }
            description="Choose the credits you need today. Keep what you don’t use for the next recording."
          />
        ) : (
          <h2 className="sr-only">Compare credit packs</h2>
        )}
        <div className="pricing-grid">
          {creditPacks.map((pack) => (
            <article
              className={`card price-card pack-${pack.id}`}
              key={pack.id}
              id={pack.id}
            >
              <div className="pack-heading">
                <h3>{pack.name}</h3>
                {pack.badge && <span>{pack.badge}</span>}
              </div>
              <p>{pack.description}</p>
              <PriceDisplay pack={pack} currency={currency} />
              <div className="pack-credits">
                <CircleDollarSign size={18} aria-hidden="true" />
                <strong>{pack.credits} credits</strong>
              </div>
              <Action
                href={`/pricing/${pack.id}`}
                variant={pack.id === "creator" ? "primary" : "secondary"}
              >
                View {pack.name} pack
              </Action>
              <ul>
                {pack.features.map((feature) => (
                  <li key={feature}>
                    <Check size={16} aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="credit-note">
          <strong>1 credit = 1 minute of standard video processing.</strong>
        </p>
        <ul className="trust-list">
          <li>
            <ReceiptText size={17} aria-hidden="true" />
            One-time payment
          </li>
          <li>
            <Check size={17} aria-hidden="true" />
            No subscriptions
          </li>
          <li>
            <Infinity size={18} aria-hidden="true" />
            Credits never expire
          </li>
          <li>
            <LockKeyhole size={17} aria-hidden="true" />
            {enabled ? "Hosted test checkout" : "Secure checkout at launch"}
          </li>
        </ul>
        {!preview && (
          <p className="launch-note">
            {enabled
              ? "Test checkout is enabled. No live payments are collected."
              : "Checkout is not available yet. No payments are collected on this site."}
          </p>
        )}
      </div>
    </section>
  );
}
