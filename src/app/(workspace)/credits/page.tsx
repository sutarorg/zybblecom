import { checkoutReadiness } from "@/lib/backend/dodo-readiness";
import {
  Check,
  Coins,
  History,
  LockKeyhole,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { Action, IconTile } from "@/components/ui/primitives";
import { CheckoutButton } from "@/components/pricing/checkout-button";
import { PriceDisplay } from "@/components/pricing/pricing";
import { creditPacks } from "@/config/credit-packs";
import { requestPricing } from "@/lib/pricing/region";
import { WorkspaceHeading, WorkspaceIssue } from "@/components/workspace/ui";
import { getBalance } from "@/services/workspace-server";
import { creditsText } from "@/services/workspace-format";
export const metadata = { title: "Credits" };
export default async function Credits({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string | string[] }>;
}) {
  const { pack: activePack } = await searchParams;
  const [balance, { currency }] = await Promise.all([
    getBalance(),
    requestPricing(),
  ]);
  const packs = creditPacks.map((pack) => ({
    ...pack,
    checkout: checkoutReadiness(process.env, pack.id, currency),
  }));
  const checkoutAvailable = packs.some(({ checkout }) => checkout.ready);
  const checkoutNotice = checkoutAvailable
    ? packs[0].checkout.production
      ? "You’ll pay securely through Dodo’s hosted checkout."
      : "Test checkout only. No real payment will be collected."
    : packs.every(({ checkout }) => checkout.production)
      ? "Live checkout isn’t enabled. No payment can be collected here."
      : packs.every(({ checkout }) => !checkout.enabled)
        ? "Test checkout is turned off for this environment."
        : "Test checkout isn’t configured for this region.";
  const cards = [
    {
      label: "Available",
      icon: Coins,
      key: "available",
      description: "Ready to use for generation.",
    },
    {
      label: "Reserved",
      icon: LockKeyhole,
      key: "reserved",
      description: "Held for active processing.",
    },
    {
      label: "Used",
      icon: Zap,
      key: "consumed",
      description: "Settled processing usage.",
    },
  ] as const;
  return (
    <div className="ws-studio ws-studio-billing">
      <WorkspaceHeading
        label="BILLING"
        title="Credits"
        description="Manage your processing credits and choose the right pack for your content workflow."
        action={
          <Action href="/credits/history" variant="secondary" arrow={false}>
            <History size={17} aria-hidden="true" />
            View History
          </Action>
        }
      />
      <WorkspaceIssue result={balance} />
      <section className="ws-balance-grid" aria-label="Credit balance">
        {cards.map(({ label, icon, key, description }) => (
          <article className="ws-panel ws-balance-card" key={key}>
            <IconTile
              icon={icon}
              tone={
                key === "available"
                  ? "purple"
                  : key === "reserved"
                    ? "blue"
                    : "pink"
              }
            />
            <h2>{label}</h2>
            <strong>
              {balance.ok ? creditsText(balance.value[key]) : "—"}
            </strong>
            <p>{balance.ok ? description : "Balance not connected"}</p>
          </article>
        ))}
      </section>
      <section id="credit-packs" className="ws-packs">
        <div className="ws-page-heading">
          <div>
            <span className="ws-section-tag">ONE-TIME PURCHASE</span>
            <h2>Choose your credit pack.</h2>
            <p>Simple, one-time purchases. Your credits never expire.</p>
          </div>
        </div>
        <p id="credit-checkout-status" className="ws-muted">
          {checkoutNotice}
        </p>
        <div className="pricing-grid">
          {packs.map((pack) => (
            <article
              className={`card price-card pack-${pack.id}`}
              key={pack.id}
            >
              <div className="pack-heading">
                <h3>{pack.name}</h3>
                {pack.badge && <span>{pack.badge}</span>}
              </div>
              <p>{pack.description}</p>
              <PriceDisplay pack={pack} currency={currency} />
              <div className="pack-credits">
                <Coins size={18} aria-hidden="true" />
                <strong>{pack.credits} credits</strong>
              </div>
              {activePack === pack.id && <p role="status">Selected pack</p>}
              <CheckoutButton
                packId={pack.id}
                mode={pack.checkout.mode}
                label="Buy Now"
                unavailable={
                  pack.checkout.ready
                    ? undefined
                    : checkoutAvailable
                      ? {
                          message:
                            "This pack isn’t configured for checkout in your region.",
                        }
                      : { id: "credit-checkout-status" }
                }
                variant={pack.id === "creator" ? "primary" : "secondary"}
              />
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
        <aside className="ws-credit-trust">
          <IconTile icon={ShieldCheck} />
          <div>
            <h3>How credits work</h3>
            <p>
              One credit covers one minute of standard video processing. Review
              your quote before generating.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
