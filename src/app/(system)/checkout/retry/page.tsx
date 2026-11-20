import { ShoppingBag } from "lucide-react";
import { SystemPanel } from "@/components/system/system-shell";
import { Action } from "@/components/ui/primitives";
import { creditPacks } from "@/config/credit-packs";
import { pageMetadata } from "@/lib/seo/metadata";
export const metadata = pageMetadata(
  "/checkout/retry",
  "Review a credit pack",
  "Choose a credit pack to review before starting another checkout.",
  { noindex: true },
);
export default function RetryCheckout() {
  return (
    <SystemPanel
      icon={ShoppingBag}
      label="REVIEW CREDIT PACKS"
      title="Ready to try again?"
      description="Review a pack before starting another checkout. Checkout isn’t connected yet; choosing a pack here won’t start a payment."
    >
      <ul className="checkout-packs">
        {creditPacks.map((pack) => (
          <li key={pack.id}>
            <Action href={`/pricing/${pack.id}`} variant="secondary">
              {pack.name} · {pack.credits} credits
            </Action>
          </li>
        ))}
      </ul>
      <Action href="/pricing" variant="text" arrow={false}>
        Compare all packs
      </Action>
    </SystemPanel>
  );
}
