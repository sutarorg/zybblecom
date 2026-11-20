import { CheckoutCancelled } from "@/components/system/payment-result";
import { pageMetadata } from "@/lib/seo/metadata";
export const metadata = pageMetadata(
  "/checkout/cancelled",
  "Checkout cancelled",
  "Return to pricing or review a prior credit-pack purchase.",
  { noindex: true },
);
export default CheckoutCancelled;
