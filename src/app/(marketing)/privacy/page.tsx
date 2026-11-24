import Link from "next/link";
import {
  PolicyPage,
  PolicySection,
  SupportLinks,
} from "@/components/legal/policy-page";
import { dodoLegal } from "@/config/legal";
import { marketingMetadata } from "@/lib/seo/metadata";

export const metadata = marketingMetadata("/privacy");

export default function PrivacyPolicy() {
  return (
    <PolicyPage
      path="/privacy"
      title="Privacy Policy"
      updated="2026-11-20"
      intro="This policy explains how Zybble handles personal information when you visit zybble.com, use a Zybble account or contact us, and how you can make a privacy request."
    >
      <PolicySection id="collection" title="1. Information we collect">
        <h3>Account and profile</h3>
        <p>
          We collect your name, email, account identifier and account
          information such as email verification, onboarding choices and saved
          preferences. Your password is sent to our authentication provider for
          verification; Zybble’s application database does not store passwords.
          If you use the optional avatar feature, we process the profile image
          you submit.
        </p>
        <h3>Video and project information</h3>
        <p>
          When source uploads are available and you choose to upload, we receive
          the file and information such as its name, type, size, duration and
          dimensions. A recording can include other people’s images, voices and
          words. We also maintain project settings and, where results are
          available, clip files, captions and related processing or credit-use
          records.
        </p>
        <h3>Payments and support</h3>
        <p>
          For purchases we keep the account and pack reference, credits, amount,
          currency, provider session or payment references, and payment,
          fulfillment and ledger status. Dodo Payments separately handles
          billing details. If you contact us, we receive the name, email, topic,
          message and other details you choose to submit. Please avoid sending
          passwords, card details or private recordings in an initial support
          request.
        </p>
        <h3>Technical information</h3>
        <p>
          Infrastructure may receive request information such as IP address,
          browser or device information in request headers, and request times.
          We use country information from trusted hosting infrastructure for
          pricing and may use a protected identifier derived from request data
          to limit abuse. We keep operational records such as errors, payment
          events and security or account activity as needed to run and
          troubleshoot the service.
        </p>
      </PolicySection>
      <PolicySection id="uses" title="2. How we use information">
        <ul>
          <li>
            To register accounts, authenticate users, deliver account emails and
            provide access to the workspace.
          </li>
          <li>
            To validate and store media when enabled, make available clips and
            captions accessible, and manage credits and purchase delivery.
          </li>
          <li>
            To verify payments, respond to support requests, and investigate
            payment or service problems.
          </li>
          <li>
            To keep the service secure, prevent abuse and fraud, diagnose
            failures and improve reliability.
          </li>
          <li>
            To comply with legal obligations, keep required records and respond
            to lawful requests.
          </li>
        </ul>
        <p>
          Where a legal basis is required, we use information as necessary to
          provide the service or respond to your request, meet legal obligations
          or pursue legitimate interests such as security and reliability,
          subject to your rights. Where we rely on consent, you may withdraw it
          without affecting earlier lawful processing.
        </p>
      </PolicySection>
      <PolicySection id="media" title="3. Uploaded media and outputs">
        <p>
          Where private media storage is enabled, Cloudflare R2 holds source
          files or archived output files in separate storage areas. Uploads may
          pass temporarily through a staging area so the file can be verified.
          Authorized users can access their own available results through
          short-lived links; a person with a valid link may use it until it
          expires, so do not share it publicly. Authorized personnel and
          infrastructure providers may access information as needed to operate,
          secure or troubleshoot the service.
        </p>
        <p>
          Paid AI generation is not currently available for new jobs. The
          ClipSDK integration supports status checks and signed notifications
          for known jobs; there is no active submission flow sending new uploads
          to ClipSDK for clipping. Zybble’s current workspace does not use
          submitted recordings or outputs to train AI models. This statement
          does not promise a future processor’s practices. We will update this
          policy before introducing new processing that changes how media is
          shared or used.
        </p>
        <p>
          Upload only media you are authorized to process. For storage and
          deletion, see <a href="#retention">Data retention</a>.
        </p>
      </PolicySection>
      <PolicySection id="payments" title="4. Dodo Payments and hosted checkout">
        <p>
          For supported purchases, Dodo Payments is the Merchant of Record. We
          send the buyer name and email available on the account, billing
          country, selected product and purchase or account references needed to
          open checkout and match payment to delivery. Card and other billing
          details are entered on Dodo’s checkout, not into Zybble. Zybble does
          not store full card numbers or security codes.
        </p>
        <p>
          We receive and use payment references, amounts, currencies and
          statuses, including refund or dispute events, to verify transactions
          and maintain the account ledger. Dodo Payments acts as an independent
          controller for its Merchant of Record activities, including
          transaction processing, tax and compliance, fraud checks and disputes.
          See the <a href={dodoLegal.privacy}>Dodo Payments Privacy Policy</a>{" "}
          and <a href={dodoLegal.buyerTerms}>Buyer Terms</a> for that separate
          handling.
        </p>
      </PolicySection>
      <PolicySection
        id="providers"
        title="5. Service providers and other disclosures"
      >
        <ul>
          <li>
            <strong>Vercel:</strong> hosts the site and application, serves
            requests and runs server functions. It processes web requests and
            operational data, such as IP addresses, request headers and
            diagnostic logs.{" "}
            <a href="https://vercel.com/legal/privacy-notice">
              Vercel privacy policy
            </a>
            .
          </li>
          <li>
            <strong>Supabase:</strong> provides authentication and database
            hosting. It handles account and verification data, profile and
            preference records, and application records such as project
            metadata, credit balances and transactions.{" "}
            <a href="https://supabase.com/privacy">Supabase privacy notice</a>.
          </li>
          <li>
            <strong>Dodo Payments:</strong> processes supported purchases as
            described above and separately handles checkout billing and payment
            details.{" "}
            <a href={dodoLegal.privacy}>Dodo Payments privacy policy</a>.
          </li>
          <li>
            <strong>Cloudflare R2, where enabled:</strong> stores private source
            videos, available archived clips and captions, or optional profile
            images, with their storage metadata.{" "}
            <a href="https://www.cloudflare.com/privacypolicy/">
              Cloudflare privacy policy
            </a>
            .
          </li>
          <li>
            <strong>Resend, when contact-form delivery is enabled:</strong>{" "}
            sends form submissions to our support mailbox, including the
            submitted name, email, topic and message. It is not required for
            contacting us directly by email.{" "}
            <a href="https://resend.com/legal/privacy-policy">
              Resend privacy policy
            </a>
            .
          </li>
          <li>
            <strong>Google Gmail:</strong> hosts the support mailbox and handles
            email addresses, correspondence and any files you send to it.{" "}
            <a href="https://policies.google.com/privacy">
              Google privacy policy
            </a>
            .
          </li>
          <li>
            <strong>ClipSDK, limited integration:</strong> existing job-status
            and signed notification paths may handle correlated job identifiers,
            statuses and result metadata if configured. They do not submit new
            media jobs.{" "}
            <a href="https://clipsdk.com/privacy">ClipSDK privacy policy</a>.
          </li>
        </ul>
        <p>
          We may also disclose relevant information when required by law, or as
          necessary and lawful to investigate fraud or a security incident,
          protect rights, or resolve a payment dispute. External sites you
          choose to visit have their own privacy practices.
        </p>
      </PolicySection>
      <PolicySection id="cookies" title="6. Cookies and similar technologies">
        <p>
          Zybble uses authentication cookies for sessions and a short-lived
          cookie to protect account recovery. Blocking or clearing them may sign
          you out or prevent sign-in and recovery. You can browse the public
          policy pages without signing in. The Zybble site does not use
          advertising trackers or a marketing analytics script. Operational
          requests and logs still exist. Dodo’s separate checkout can use its
          own technologies as described in its privacy policy.
        </p>
      </PolicySection>
      <PolicySection id="retention" title="7. Data retention and deletion">
        <p>
          We keep account and project records to support your workspace and
          while needed for the purposes above. Upload sessions expire; cancelled
          and expired staging uploads are eligible for cleanup. This does not
          impose the same expiry on verified source files or archived outputs.
          Those files may remain in private storage until removed. Keep your own
          copies of media you need and contact us if you want to request
          removal.
        </p>
        <p>
          We may retain transaction records, dispute and audit records, or
          support correspondence as needed for accounting, legal compliance,
          security or dispute resolution. Hosted logs, backups and email are
          subject to the relevant provider settings and retention practices.
          Account closure or a deletion request does not guarantee immediate
          erasure from backups or records that must be kept by law.
        </p>
      </PolicySection>
      <PolicySection id="security" title="8. Data security">
        <p>
          We use measures such as encrypted transport, account-scoped access
          controls, restricted media storage and verification of payment
          notifications. No system can guarantee absolute security. Contact us
          promptly if you think an account, a recovery link or a private media
          link has been exposed.
        </p>
      </PolicySection>
      <PolicySection id="transfers" title="9. International processing">
        <p>
          Zybble and its providers may handle information in countries other
          than the one where you live. When applicable law requires a safeguard
          for a cross-border transfer, we use the appropriate legal mechanism.
          Contact us if you need information about safeguards for your data.
        </p>
      </PolicySection>
      <PolicySection id="rights" title="10. Your privacy rights and choices">
        <p>
          Depending on the law that applies to you, you may ask to access or
          obtain a copy of your information, correct it, delete it, restrict or
          object to certain uses, or get information about our handling of it.
          You may withdraw consent where it is the basis for processing. You can
          also raise a concern with the appropriate privacy authority where
          available.
        </p>
        <p>
          Send requests through the contact options below. We may ask for
          information needed to verify your identity or authority before acting.
          Some records may be subject to legal retention or other lawful
          exceptions. For information Dodo controls independently, use the
          contact options in its privacy policy.
        </p>
      </PolicySection>
      <PolicySection id="children" title="11. Children’s privacy">
        <p>
          Zybble is not intended for children. Account holders must meet the age
          and capacity requirements in the{" "}
          <Link href="/terms#eligibility">Terms of Service</Link>. If you
          believe a child has opened an account or provided personal information
          without appropriate authorization, contact us so we can investigate
          and take appropriate action.
        </p>
      </PolicySection>
      <PolicySection id="updates" title="12. Policy updates">
        <p>
          We will post changes here with a revised last-updated date and provide
          additional notice or seek consent where required by law.
        </p>
      </PolicySection>
      <PolicySection id="support" title="13. Privacy contact">
        <p>
          <SupportLinks /> and identify your message as a privacy request. If it
          concerns an account or project, provide a reference rather than
          sending your media or credentials.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
