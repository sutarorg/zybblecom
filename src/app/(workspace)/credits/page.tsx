import { checkoutEnabled } from "@/lib/backend/dodo";
import {
  Check,
  Coins,
  History,
  LockKeyhole,
  Zap,
  ShieldCheck,
} from "lucide-react";
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
    <div className="ws-studio ws-studio-billing">
      <WorkspaceHeading
        label="BILLING"
        title="Credits & Purchases"
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
        <div className="pricing-grid">
          {creditPacks.map((pack) => (
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
        <aside className="ws-credit-trust">
          <IconTile icon={ShieldCheck} />
          <div>
            <h3>How credits work</h3>
            <p>
              One credit covers one minute of standard video processing. Review
              your quote before generating.
            </p>
            <p className="ws-muted">
              {checkoutEnabled()
                ? "No subscription. Test checkout only; no live payments are collected."
                : "No subscription. Checkout is not connected in this preview; reviewing a pack does not start a payment."}
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
