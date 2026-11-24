import Link from "next/link";
import {
  PolicyPage,
  PolicySection,
  SupportLinks,
} from "@/components/legal/policy-page";
import { dodoLegal } from "@/config/legal";
import { marketingMetadata } from "@/lib/seo/metadata";

export const metadata = marketingMetadata("/refund-policy");

export default function RefundPolicy() {
  return (
    <PolicyPage
      path="/refund-policy"
      title="Refund & Cancellation Policy"
      updated="2026-11-20"
      intro="Zybble sells one-time credits for digital video repurposing. Completed credit purchases are generally non-refundable once the credits are delivered. Please review the package, price and available features before you pay."
    >
      <PolicySection
        id="completed-purchases"
        title="No Refunds on Completed Credit Purchases"
      >
        <p>
          Once purchased credits have been successfully added to your Zybble
          account, the purchase is ordinarily final. We do not normally refund a
          change of mind or an unused or partially used pack. Credits do not
          expire. Review the <Link href="/pricing">pack sizes and prices</Link>{" "}
          and the expected processing requirements before purchasing.
        </p>
        <p>
          <strong>
            This policy does not limit your mandatory consumer rights.
          </strong>{" "}
          Delivery of credits does not by itself remove any legal cancellation,
          withdrawal or refund right.
        </p>
      </PolicySection>
      <PolicySection
        id="exceptions"
        title="Exceptions and mandatory consumer rights"
      >
        <p>A refund or another remedy may be available in these situations:</p>
        <ul>
          <li>A duplicate payment for the same intended purchase.</li>
          <li>
            A confirmed unauthorized or fraudulent transaction, subject to
            investigation and payment-provider procedures.
          </li>
          <li>
            A successful charge for which the purchased credits were not
            delivered.
          </li>
          <li>
            A material technical failure that prevents delivery or use of the
            purchased digital service.
          </li>
          <li>
            A qualifying service deficiency, material mismatch with what was
            advertised, or any other case in which applicable law provides a
            remedy.
          </li>
        </ul>
        <p>
          Where appropriate and permitted, we may first correct the credit
          delivery or restore the service. We will not require that you accept a
          repair or replacement if applicable law gives you a different choice.
          A statutory withdrawal or cancellation right remains available where
          it applies; this page is not consent to waive it.
        </p>
      </PolicySection>
      <PolicySection
        id="request"
        title="How to request a refund or report a delivery issue"
      >
        <ol>
          <li>
            <SupportLinks />. If the contact form is unavailable, use the email
            address.
          </li>
          <li>
            Provide the transaction ID or Dodo Payments order reference from the
            receipt, and the email address used for the purchase.
          </li>
          <li>
            Describe the issue and the remedy you are requesting. Where useful,
            include the pack, date, amount and a redacted receipt or screenshot.
            Do not send a password, full card details, security code or bank
            credentials.
          </li>
          <li>
            We review the purchase, delivery and relevant usage records, and
            coordinate with Dodo Payments where needed. Dodo Payments processes
            monetary refunds for its transactions as Merchant of Record under
            its <a href={dodoLegal.buyerTerms}>Buyer Terms</a> and applicable
            law. An approved refund normally goes back to the original payment
            method.
          </li>
        </ol>
        <p>
          Report a problem promptly. Processing depends on review and
          payment-provider procedures; this policy does not impose a deadline
          that shortens any right you have under law.
        </p>
      </PolicySection>
      <PolicySection
        id="payment-failures"
        title="Duplicate charges, failed payments and missing credits"
      >
        <p>
          A missing confirmation page does not mean payment failed. Check your
          receipt, payment status and{" "}
          <Link href="/credits/history">credit history</Link> (sign-in
          required). If the transaction is pending or a charge appears without
          credits, contact us before attempting the same purchase again. An
          authorization hold can appear without a completed charge; your payment
          provider or issuer can help distinguish them. Failed or cancelled
          payments do not grant credits. If you see two charges for one intended
          purchase, send both references so we can compare them.
        </p>
      </PolicySection>
      <PolicySection
        id="credit-usage"
        title="Credit use and refund eligibility"
      >
        <p>
          Payment, delivery, reservation and consumption are separate records. A
          processing reservation temporarily reduces the available balance; it
          is not necessarily a settled debit. We check the account ledger for
          successful delivery and settled use, and whether a service failure
          prevented use. Whether some credits were used or remain unused is
          relevant to reviewing the request, but does not disqualify a legal
          remedy. A refund or dispute notification is reviewed; it does not
          itself automatically remove credits from the account. The ledger can
          be corrected after review where appropriate and lawful.
        </p>
      </PolicySection>
      <PolicySection
        id="cancellations"
        title="Cancellations and account closure"
      >
        <p>
          Zybble has no recurring subscription to cancel. You can leave checkout
          before completing payment, but closing a browser after authorizing
          payment is not a reversal. You may stop using Zybble or contact us to
          request account closure. Closing the account does not trigger an
          automatic refund; the exceptions and statutory rights above still
          apply. Some records may be retained as described in the{" "}
          <Link href="/privacy#retention">Privacy Policy</Link>.
        </p>
      </PolicySection>
      <PolicySection
        id="payment-disputes"
        title="Chargebacks and payment disputes"
      >
        <p>
          You can ask Zybble or Dodo Payments for help investigating a
          transaction. For suspected fraud, contact your payment provider or
          issuer promptly. This policy does not stop you from disputing a
          charge, exercising statutory rights or meeting an issuer’s deadline;
          you do not have to wait for our response before exercising those
          rights.
        </p>
      </PolicySection>
      <PolicySection id="support" title="Contact">
        <p>
          <SupportLinks /> for purchase, billing or delivery help.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
