import Link from "next/link";
import {
  PolicyPage,
  PolicySection,
  SupportLinks,
} from "@/components/legal/policy-page";
import { creditPacks } from "@/config/credit-packs";
import { dodoLegal } from "@/config/legal";
import { marketingMetadata } from "@/lib/seo/metadata";

export const metadata = marketingMetadata("/terms");
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export default function TermsOfService() {
  return (
    <PolicyPage
      path="/terms"
      title="Terms of Service"
      updated="2026-11-20"
      intro="These Terms of Service govern your access to Zybble’s website, account and video-repurposing tools. By using Zybble, you agree to these terms. Separate buyer terms apply to purchases made through Dodo Payments."
    >
      <PolicySection id="about" title="1. About Zybble">
        <p>
          Zybble is the service name of the account and video workspace at
          zybble.com. It is designed for turning long recordings into short-form
          video. These terms cover your use of the Zybble service; our{" "}
          <Link href="/privacy">Privacy Policy</Link> explains how we handle
          personal information.
        </p>
      </PolicySection>
      <PolicySection id="eligibility" title="2. Eligibility">
        <p>
          You must be at least 18 and have legal capacity to enter into these
          terms in your jurisdiction. If the local age of majority is higher,
          you must meet it. If you act for an organization, you must be
          authorized to agree on its behalf. Use the service only where it is
          lawful for you to do so.
        </p>
      </PolicySection>
      <PolicySection id="accounts" title="3. Account registration and security">
        <p>
          Give accurate account details, keep them current and verify your email
          when asked. Keep your password and recovery links private. You are
          responsible for activity you authorize on your account. If you suspect
          unauthorized access, contact us promptly and use account recovery to
          secure your account. We may restrict access to protect you or others
          while we investigate.
        </p>
      </PolicySection>
      <PolicySection id="services" title="4. What the service provides">
        <p>
          The workspace supports account and project management and credit
          history. Source-video uploads depend on whether they are enabled for
          your workspace. The editor can review available, completed clips and
          captions and download eligible MP4 files where archived media is
          available.
        </p>
        <p>
          Zybble’s intended processing workflow uses AI to find highlights in
          long videos, create short clips, reframe around speakers in vertical
          format and generate captions. Paid generation is not currently
          available for new jobs. Examples illustrate the workflow; they are not
          a promise that a new recording can be processed now. Check feature and
          checkout availability before buying credits.
        </p>
      </PolicySection>
      <PolicySection id="credits" title="5. One-time credit pricing">
        <p>
          Credit packs are one-time purchases. There is no automatic renewal or
          recurring subscription charge. Credits do not expire or reset over
          time. They are units for Zybble processing, not money or a
          transferable balance. Check the{" "}
          <Link href="/pricing">pricing page</Link> and the displayed currency,
          pack, price and available features before paying.
        </p>
        <h3>USD credit packs</h3>
        <dl>
          {creditPacks.map(({ id, name, credits, pricesMinor }) => (
            <div key={id}>
              <dt>{name}</dt>
              <dd>
                {credits} credits · {usd.format(pricesMinor.USD / 100)}
              </dd>
            </div>
          ))}
        </dl>
        <h3>How standard processing uses credits when enabled</h3>
        <p>
          One credit covers one minute of standard processing. Before a job
          starts, the quote reserves credits based on the verified source
          duration, rounded up to a whole minute, for supported sources up to
          180 minutes. Uploading alone does not use processing credits. Settling
          a job charges verified billable minutes, rounded up to a whole credit,
          within the reservation and releases the unused part. A confirmed
          failed or cancelled job can release the hold without a processing
          charge. A timeout is not proof of failure; missing or inconsistent
          usage may need review before a hold is released or settled.
        </p>
      </PolicySection>
      <PolicySection id="payments" title="6. Payments and Merchant of Record">
        <p>
          Where checkout is available, Dodo Payments acts as Merchant of Record
          and authorized reseller for supported transactions. Payment details
          are entered at Dodo’s hosted checkout; Zybble does not collect or
          store your full card number or security code. Dodo handles the
          transaction and applicable transaction taxes and may send electronic
          receipts or invoices. See{" "}
          <a href={dodoLegal.buyerTerms}>Dodo Payments’ Buyer Terms</a> for the
          purchase relationship.
        </p>
        <p>
          Zybble checks the signed payment notification and verifies the payment
          server-side with Dodo, including the purchase reference, amount,
          currency and product. A confirmation screen, email or bank
          authorization alone does not grant credits.
        </p>
      </PolicySection>
      <PolicySection id="delivery" title="7. Digital delivery">
        <p>
          Purchased credits are delivered to the account that initiated checkout
          once the payment is successfully verified. No physical item is
          shipped. If payment appears complete but your balance has not updated,
          check your purchase status or credit history and contact support
          before paying again.
        </p>
      </PolicySection>
      <PolicySection id="acceptable-use" title="8. Acceptable use">
        <ul>
          <li>
            Upload only content you have the right to use and process. Do not
            infringe copyright, privacy, publicity or other rights, or upload
            unlawful material.
          </li>
          <li>
            Do not distribute malware, bypass security or usage controls,
            interfere with service availability, or access an account or data
            without permission.
          </li>
          <li>
            Do not abuse the platform, impersonate others, use unauthorized
            payment methods or submit fraudulent payments or claims. This does
            not restrict legitimate refunds or disputes.
          </li>
        </ul>
      </PolicySection>
      <PolicySection
        id="intellectual-property"
        title="9. Content rights and intellectual property"
      >
        <p>
          You retain the rights you have in your source material. You are
          responsible for licensed material, recordings of other people and
          permission to create and publish derivatives. You give Zybble a
          limited, non-exclusive permission to receive, store, copy, process and
          deliver your content only as needed to provide and protect the
          requested service, including through service providers acting for
          those purposes. Uploading does not transfer ownership to Zybble.
        </p>
        <p>
          You may use delivered outputs subject to underlying rights and
          applicable law. Zybble’s software, branding and original website
          material remain protected; use of the service does not transfer rights
          in them.
        </p>
      </PolicySection>
      <PolicySection id="ai-limitations" title="10. AI output and limitations">
        <p>
          AI can choose the wrong excerpt, miss context, mistranscribe speech or
          frame the wrong subject. Review each output, captions and permissions
          before publishing. We do not guarantee perfect transcription or
          framing, views, engagement, virality, or revenue.
        </p>
      </PolicySection>
      <PolicySection
        id="availability"
        title="11. Availability and technical issues"
      >
        <p>
          Maintenance, provider issues and processing review can interrupt the
          service or delay delivery. We do not promise uninterrupted access, a
          fixed processing time or an uptime level. Keep an independent copy of
          originals and outputs you need. When reporting a problem, provide the
          project or purchase reference and what you observed, but not a
          password or full payment details.
        </p>
      </PolicySection>
      <PolicySection id="refunds" title="12. Refunds and cancellations">
        <p>
          Completed credit purchases are ordinarily final once delivered. The{" "}
          <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>{" "}
          explains delivery and payment exceptions and how to request a remedy.
          Your mandatory consumer rights still apply.
        </p>
      </PolicySection>
      <PolicySection
        id="termination"
        title="13. Account restrictions and closure"
      >
        <p>
          We may limit, suspend or terminate access for a material breach,
          unauthorized activity, fraud, a security risk or a legal requirement.
          Where practicable and lawful, we will explain the restriction and
          provide a way to contact us. You can stop using Zybble or request
          account closure. Restriction or closure can prevent access to
          remaining credits, but unused paid credits are not automatically
          forfeited or refunded; applicable law and the refund policy govern any
          remedy. Contact us before closure if you need access to your records
          or have a balance concern.
        </p>
      </PolicySection>
      <PolicySection id="liability" title="14. Warranties and liability">
        <p>
          To the extent permitted by law, the service is provided as available,
          and we are not responsible for losses that were not reasonably
          foreseeable or for publication and business decisions you make using
          the output. Nothing in these terms excludes liability for fraud, death
          or personal injury caused by negligence, or other liability that
          cannot lawfully be limited. Mandatory warranties, consumer guarantees
          and remedies remain available.
        </p>
      </PolicySection>
      <PolicySection id="disputes" title="15. Applicable law and disputes">
        <p>
          If something goes wrong, please contact us so we can try to resolve
          it. These terms do not select an exclusive court or displace the laws,
          courts, regulators or dispute processes available to you under
          applicable law. For payment disputes, you can also use the channels
          described in the{" "}
          <Link href="/refund-policy#payment-disputes">
            Refund &amp; Cancellation Policy
          </Link>
          .
        </p>
      </PolicySection>
      <PolicySection id="changes" title="16. Changes to these terms">
        <p>
          We will post revised terms here with a new last-updated date and
          provide additional notice where required. Changes do not take away
          rights you already have under applicable law.
        </p>
      </PolicySection>
      <PolicySection id="support" title="17. Contact">
        <p>
          <SupportLinks /> for questions about these terms, account security or
          a service problem.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
