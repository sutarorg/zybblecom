import { Check, Coins, History, LockKeyhole, Zap } from "lucide-react";
import { Action, IconTile } from "@/components/ui/primitives";
import { PriceDisplay } from "@/components/pricing/pricing";
import { creditPacks } from "@/config/credit-packs";
import { requestPricing } from "@/lib/pricing/region";
import { WorkspaceHeading, WorkspaceIssue } from "@/components/workspace/ui";
import { getBalance } from "@/services/workspace-server";
import { creditsText } from "@/services/workspace-format";
export const metadata = { title: "Credits & purchases" };
export default async function Credits() {
  const [balance, { currency }] = await Promise.all([
    getBalance(),
    requestPricing(),
  ]);
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
    <>
      <WorkspaceHeading
        label="BILLING"
        title="Credits & Purchases"
        description="Review your balance, credit usage and one-time credit packs."
        action={
          <Action href="/credits/history" variant="secondary" arrow={false}>
            <History size={17} aria-hidden="true" />
            View history
          </Action>
        }
      />
      <WorkspaceIssue result={balance} />
      <section className="ws-balance-grid" aria-label="Credit balance">
        {cards.map(({ label, icon, key, description }) => (
          <article className="ws-panel ws-balance-card" key={key}>
            <IconTile icon={icon} />
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
            <h2>Buy credits</h2>
            <p>
              1 credit covers 1 minute of standard video processing. Credits
              never expire.
            </p>
          </div>
        </div>
        <div className="pricing-grid">
          {creditPacks.map((pack) => (
            <article
              className={`card price-card pack-${pack.id}`}
              key={pack.id}
            >
              <div className="pack-heading">
                <h3>{pack.name}</h3>
              </div>
              <p>{pack.description}</p>
              <PriceDisplay pack={pack} currency={currency} />
              <div className="pack-credits">
                <Coins size={18} aria-hidden="true" />
                <strong>{pack.credits} credits</strong>
              </div>
              <Action
                href={`/pricing/${pack.id}`}
                variant={pack.id === "creator" ? "primary" : "secondary"}
              >
                Review {pack.name}
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
        <p className="ws-muted">
          No subscription. Checkout is not connected in this preview; reviewing
          a pack does not start a payment.
        </p>
      </section>
    </>
  );
}
