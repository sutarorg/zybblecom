import { Seo, breadcrumbJsonLd } from "../seo/Seo";
import MarketingLayout, { PageHero, ProseSection } from "./Layout";

// ————————————————————————————————————————————————————————————
// Trust pages — substantive, specific legal content. Real trust
// signals: named subprocessors, concrete practices, real dates.
// ————————————————————————————————————————————————————————————

export function PrivacyPage() {
  const lastUpdated = "September 15, 2026";
  return (
    <MarketingLayout path="/privacy">
      <Seo
        title="Privacy Policy | Zybble"
        description="Zybble's privacy policy explains how account information, public business data and AI processing are handled, retained and protected."
        path="/privacy"
        jsonld={[
          breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Privacy Policy", path: "/privacy" }]),
        ]}
      />
      <PageHero
        kicker={`Privacy Policy · Last updated ${lastUpdated}`}
        title="Privacy, in plain language."
        lede="Zybble processes two very different kinds of information: data about you, our customer, and public business data about prospects. We handle them differently, on purpose."
      />

      <ProseSection title="1. The data we process">
        <p>
          <strong className="font-semibold text-neutral-900">About you (the customer).</strong>{" "}
          Account identity — name, email, password hash (we never store plaintext passwords),
          company details, and billing status. Usage telemetry limited to what the service
          needs to function: lead quotas consumed, job counts, and timestamps.
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">About prospects (public business data).</strong>{" "}
          Publicly listed business information: company name, category, address, phone,
          website, opening hours, rating and review counts, and emails the business itself
          published on its website. Zybble never collects personal social profiles, consumer
          data, or sensitive personal information about individuals.
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Your SMTP credentials.</strong>{" "}
          When you connect a sending account, the password is encrypted with AES-256-GCM
          before storage and is used only to authenticate with your provider. It is never
          returned to the browser, never logged, and never readable by staff.
        </p>
      </ProseSection>

      <ProseSection title="2. How we use it">
        <p>
          Customer data is used to operate the service: authentication, quota enforcement,
          billing, and support. Public prospect data exists to let you organize outreach
          inside your account — it belongs to you while you're a customer and is deleted
          with your account.
        </p>
        <p>
          We do not sell data. We do not run advertising. We do not train shared AI models
          on your prospects or your emails.
        </p>
      </ProseSection>

      <ProseSection title="3. AI processing">
        <p>
          When you use AI Research, AI Scoring or AI Email Writer, the relevant lead record
          is sent to our AI provider's API to generate the result. Prompts include only the
          lead's public fields plus your sender name/company — never your full database,
          other users' data, or sensitive information. Results are cached to your account.
        </p>
      </ProseSection>

      <ProseSection title="4. Subprocessors">
        <p>We use a small, named set of processors to run Zybble:</p>
        <ul className="list-none space-y-2.5">
          {[
            "Supabase — PostgreSQL database, authentication and row-level security (hosted infrastructure)",
            "OpenAI — AI model processing for research, scoring and writing (API, no model training on API data)",
            "Razorpay — subscription billing and payment processing (we never see full card numbers)",
            "Your SMTP provider — sends emails under your account, visible only to you and the provider",
            "Vercel / container hosting — serves the application and API",
          ].map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </ProseSection>

      <section id="security" className="scroll-mt-24">
        <ProseSection title="5. Security">
          <p>
            Passwords are salted and hashed; sessions are short-lived JWTs. All traffic is
            TLS-encrypted. Database access is governed by row-level security so accounts can
            only ever see their own records, with server-side authorization checks on every
            request. SMTP credentials are AES-256-GCM encrypted at rest. Payment events are
            accepted only via signature-verified, idempotent webhooks.
          </p>
          <p>
            Report vulnerabilities to{" "}
            <a href="mailto:hello@zybble.com" className="font-semibold text-neutral-900 underline underline-offset-4">
              hello@zybble.com
            </a>{" "}
            — we treat security reports with priority and respond within two business days.
          </p>
        </ProseSection>
      </section>

      <ProseSection title="6. Retention">
        <p>
          Account data lives while your account does. Export anything, anytime — leads
          export to CSV in one click, and account deletion (Settings → Your data) removes
          your profile, leads, campaigns, senders and billing records permanently.
        </p>
      </ProseSection>

      <section id="dpa" className="scroll-mt-24">
        <ProseSection title="7. Your rights & data processing terms">
          <p>
            Depending on your jurisdiction (GDPR, UK GDPR, CCPA/CPRA and similar), you have
            rights to access, rectify, export and erase your personal data, and to object to
            or restrict processing. All of these are self-service inside the product
            (export and delete) or one email away at{" "}
            <a href="mailto:hello@zybble.com" className="font-semibold text-neutral-900 underline underline-offset-4">
              hello@zybble.com
            </a>
            .
          </p>
          <p>
            When you use Zybble to contact prospects, you act as the data controller for
            that outreach and we act as processor on your documented instructions. Our
            unsubscribe and suppression architecture exists to help you honor opt-out
            obligations automatically — the controller-side duties (identifying yourself,
            honoring opt-outs, lawful basis) remain with you and are not transferable.
          </p>
        </ProseSection>
      </section>

      <ProseSection title="8. Changes">
        <p>
          If this policy changes materially, active customers are notified by email before
          the change takes effect. The current version always lives at this URL with its
          revision date at the top.
        </p>
      </ProseSection>
    </MarketingLayout>
  );
}

export function TermsPage() {
  const lastUpdated = "September 15, 2026";
  return (
    <MarketingLayout path="/terms">
      <Seo
        title="Terms of Service | Zybble"
        description="The Zybble terms of service cover acceptable use, public-data practices, email outreach, billing, termination and liability."
        path="/terms"
        jsonld={[
          breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Terms of Service", path: "/terms" }]),
        ]}
      />
      <PageHero
        kicker={`Terms of Service · Last updated ${lastUpdated}`}
        title="The rules of the road."
        lede="These terms govern your use of Zybble. They're written to be read, not shelved — most of what matters boils down to: use public data responsibly, don't spam, and pay for what you use."
      />

      <ProseSection title="1. The service">
        <p>
          Zybble provides an AI-powered lead generation and outreach platform: searching
          public business listings, enriching and organizing leads, finding business-published
          emails, AI-assisted research/scoring/writing, and email sequence automation sent
          through your own SMTP account. Features differ by plan as described on the{" "}
          <a href="/pricing" className="font-semibold text-neutral-900 underline underline-offset-4">
            pricing page
          </a>
          , which forms part of these terms.
        </p>
      </ProseSection>

      <ProseSection title="2. Acceptable use">
        <p>You agree to use Zybble for lawful B2B outreach only. You must not:</p>
        <ul className="list-none space-y-2.5">
          {[
            "Send unsolicited bulk, deceptive, misleading, or unlawful email, or violate CAN-SPAM, CASL, GDPR/PECR or equivalent local marketing law",
            "Email addresses on your suppression list, purchased consumer lists, or addresses whose owners have objected",
            "Harvest personal data about individuals, attempt to identify private persons, or process sensitive personal information",
            "Probe, scan or attack our infrastructure, bypass usage limits, or share your account credentials",
            "Misrepresent who you are or the purpose of your outreach in email content",
            "Use the service for consumer marketing, political messaging, adult content or regulated-industry solicitations (credit, health, legal referrals) without lawful basis",
          ].map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <p>
          Violations of this section are grounds for immediate suspension. Suppression lists,
          unsubscribe mechanics and bounce handling exist to help you comply — disabling or
          circumventing them is itself a violation.
        </p>
      </ProseSection>

      <ProseSection title="3. Public data and scraping">
        <p>
          Zybble collects publicly listed business information from public listings and
          business websites. The service does not circumvent CAPTCHAs, authentication
          systems, or technical access controls, and it does not access personal profiles or
          private data. Business owners who request removal from your outreach will be
          suppressed automatically through your unsubscribe infrastructure.
        </p>
      </ProseSection>

      <ProseSection title="4. Billing">
        <p>
          Paid plans are billed monthly in USD via Razorpay. Subscriptions renew
          automatically until cancelled; cancellation takes effect at the end of the
          current period, after which accounts revert to the Free plan without data loss.
          Plan changes may be prorated at our provider's discretion. Taxes may apply based
          on your location. Server-side webhook confirmations, not browser redirects,
          determine subscription state.
        </p>
      </ProseSection>

      <ProseSection title="5. Your content and leads">
        <p>
          Leads, campaigns, and email copy you create are yours. You grant Zybble only the
          rights necessary to operate the service for you — storing, processing as
          instructed, and transmitting emails you authorize. You warrant you have a lawful
          basis for the outreach you send.
        </p>
      </ProseSection>

      <ProseSection title="6. Warranties and liability">
        <p>
          The service is provided "as is" with commercially reasonable care. Zybble does not
          warrant that prospect data will be complete, current, or that any email will reach
          an inbox — deliverability depends on your domain practices, content and providers.
          To the maximum extent permitted by law, Zybble's aggregate liability is limited to
          the amounts you paid in the twelve months preceding the claim. Nothing in these
          terms limits liability that cannot be limited by law.
        </p>
      </ProseSection>

      <ProseSection title="7. Termination">
        <p>
          You may close your account anytime (Settings → Your data). We may suspend or
          terminate accounts violating these terms, with notice proportionate to severity.
          On termination, your data is deleted as described in the Privacy Policy; export
          first if you need it.
        </p>
      </ProseSection>

      <ProseSection title="8. Contact and changes">
        <p>
          Questions about these terms:{" "}
          <a href="mailto:hello@zybble.com" className="font-semibold text-neutral-900 underline underline-offset-4">
            hello@zybble.com
          </a>
          . Material changes are announced to active customers by email before taking
          effect; the current version always lives here with its revision date.
        </p>
      </ProseSection>
    </MarketingLayout>
  );
}
