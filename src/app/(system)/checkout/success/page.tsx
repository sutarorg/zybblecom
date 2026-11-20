import { Suspense } from "react";
import { PaymentResult } from "@/components/system/payment-result";
import { PageLoader } from "@/components/system/loading";
import { purchaseStatus } from "@/lib/backend/purchase-status";
import { pageMetadata } from "@/lib/seo/metadata";
export const metadata = pageMetadata(
  "/checkout/success",
  "Payment status",
  "Check the status of a Zybble credit pack purchase.",
  { noindex: true },
);

type Params = Promise<Record<string, string | string[] | undefined>>;
export default function Success({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense
      fallback={
        <PageLoader
          label="Confirming your payment"
          description="Looking up the payment status. No credits are confirmed yet."
        />
      }
    >
      <CheckoutStatus searchParams={searchParams} />
    </Suspense>
  );
}
async function CheckoutStatus({ searchParams }: { searchParams: Params }) {
  const { reference } = await searchParams;
  // The reference is a locator only; account ownership and payment/grant must be checked by the server adapter.
  const result = await purchaseStatus(
    typeof reference === "string" ? reference : undefined,
  );
  return <PaymentResult result={result} />;
}
