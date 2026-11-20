import {
  BadgeCheck,
  CircleAlert,
  Hourglass,
  ReceiptText,
  XCircle,
} from "lucide-react";
import { Action } from "@/components/ui/primitives";
import { creditPacks } from "@/config/credit-packs";
import type { PaymentStatus, ServiceResult } from "@/lib/services/contracts";
import { SystemPanel } from "./system-shell";
import { RetryButton } from "./errors";

export function PaymentResult({
  result,
}: {
  result: ServiceResult<PaymentStatus>;
}) {
  const confirmed =
    result.ok && result.value.kind === "confirmed" ? result.value : null;
  const incomplete = result.ok && result.value.kind === "not_completed";
  if (incomplete)
    return (
      <SystemPanel
        icon={CircleAlert}
        tone="orange"
        label="CHECKOUT STATUS"
        title="Payment wasn’t completed."
        description="This checkout did not grant credits. Review the available packs if you’d like to try again."
      >
        <div className="actions system-actions">
          <Action href="/checkout/retry">Retry checkout</Action>
          <Action href="/dashboard/purchases" variant="secondary">
            View purchase history
          </Action>
        </div>
      </SystemPanel>
    );
  const available = result.ok;
  const retry =
    !confirmed &&
    (available ||
      (!result.ok && ["network", "unexpected"].includes(result.error)));
  const amount = confirmed
    ? new Intl.NumberFormat(confirmed.currency === "INR" ? "en-IN" : "en-US", {
        style: "currency",
        currency: confirmed.currency,
      }).format(confirmed.amountMinor / 100)
    : null;
  return (
    <SystemPanel
      icon={confirmed ? BadgeCheck : Hourglass}
      tone={confirmed ? "mint" : "purple"}
      label={confirmed ? "VERIFIED PURCHASE" : "CHECKOUT STATUS"}
      title={confirmed ? "Payment confirmed." : "Confirming your payment"}
      description={
        confirmed
          ? "Your confirmed purchase is recorded in your purchase history."
          : available
            ? "Your checkout has returned. Credits will appear after the payment and credit grant are both verified."
            : result.error === "unavailable"
              ? "This return page can’t verify a payment on its own. Billing isn’t connected in this preview, so no payment or credit grant is confirmed here."
              : "We couldn’t look up a confirmed payment or credit grant. Check your purchase history before trying another checkout."
      }
    >
      <div className="payment-summary">
        <h2>
          <ReceiptText size={18} aria-hidden="true" /> Purchase summary
        </h2>
        <dl>
          <div>
            <dt>Credit pack</dt>
            <dd>
              {confirmed
                ? (creditPacks.find((pack) => pack.id === confirmed.packId)
                    ?.name ?? "Credit pack")
                : "Awaiting confirmation"}
            </dd>
          </div>
          <div>
            <dt>Credits granted</dt>
            <dd>
              {confirmed
                ? new Intl.NumberFormat().format(confirmed.creditsGranted)
                : "Not confirmed"}
            </dd>
          </div>
          {amount && (
            <div>
              <dt>Amount paid</dt>
              <dd>
                {amount} {confirmed?.currency}
              </dd>
            </div>
          )}
        </dl>
      </div>
      <div className="actions system-actions">
        <Action href="/dashboard">Go to dashboard</Action>
        <Action href="/dashboard/purchases" variant="secondary">
          View purchase history
        </Action>
        {retry && <RetryButton label="Check payment status" />}
      </div>
    </SystemPanel>
  );
}
export function CheckoutCancelled() {
  return (
    <SystemPanel
      icon={XCircle}
      tone="pink"
      label="CHECKOUT CANCELLED"
      title="Checkout was cancelled."
      description="No credit purchase has been confirmed on this page. If you already submitted payment, check your purchase history before starting another checkout."
    >
      <div className="actions system-actions">
        <Action href="/checkout/retry">Retry checkout</Action>
        <Action href="/pricing" variant="secondary">
          Return to pricing
        </Action>
        <Action href="/dashboard/purchases" variant="text" arrow={false}>
          View purchase history
        </Action>
      </div>
    </SystemPanel>
  );
}
