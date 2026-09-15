import { ArrowRight } from "lucide-react";
import Reveal from "../components/Reveal";
import { MLink, Seo, breadcrumbJsonLd } from "../seo/Seo";
import { cn } from "../utils/cn";
import MarketingLayout, { CtaBlock, Kicker, PageHero, ProseSection } from "./Layout";

// ————————————————————————————————————————————————————————————
// Feature pages — original, decision-complete content targeting
// genuine commercial search intent. No keyword stuffing: each
// page answers the actual question a buyer is researching.
// ————————————————————————————————————————————————————————————

interface Section {
  h: string;
  paras?: string[];
  bullets?: string[];
  table?: { head: string[]; rows: string[][] };
  afterParas?: string[];
}

interface Feature {
  slug: string;
  kicker: string;
  h1: string;
  lede: string;
  metaTitle: string;
  metaDesc: string;
  sections: Section[];
  faq: { q: string; a: string }[];
  related: { title: string; body: string; to: string }[];
}

const FEATURES: Feature[] = [
  {
    slug: "/features/lead-finder",
    kicker: "Lead Finder",
    h1: "Find local businesses that actually need what you sell.",
    lede: "Describe your market in plain language — Zybble searches public business listings and returns clean, deduplicated leads with the context that decides fit.",
    metaTitle: "Local Lead Finder — Find Businesses to Sell To | Zybble",
    metaDesc: "Search local businesses by industry, location and signals that matter. Zybble's lead finder returns enriched, deduplicated prospects in seconds — free 100 leads/month.",
    sections: [
      {
        h: "Search the way you'd ask a colleague",
        paras: [
          "Most lead tools hand you a database and forty filters. Zybble starts from a sentence: \"roofing companies in Dallas\" or \"marketing agencies in London\". The searcher interprets the business category, resolves the geography, and scans public listings for exact matches — the same sources your buyers use when they look for a business like yours.",
          "That matters because local prospecting lives and dies on specificity. A generic \"SMB, USA\" list converts at nothing; a tight \"4.5★ dental practices in Dallas-Fort Worth with a website\" list starts real conversations.",
        ],
        table: {
          head: ["You type", "Zybble returns"],
          rows: [
            ["dentists in Texas", "Dental practices across Dallas, Austin, Houston and more — with ratings, reviews, phone, website and hours"],
            ["roofing companies in Dallas", "Roofing contractors in the Dallas metro, each with public contact data and a Google Maps link"],
            ["marketing agencies in London", "Agencies across London boroughs, enriched with web presence and reputation signals"],
          ],
        },
      },
      {
        h: "Every lead arrives with context, not just a name",
        paras: [
          "A company name alone tells you nothing about whether to reach out. Each Zybble lead ships with what's publicly observable about the business: category, full location, phone, website, opening hours, Google rating and review count, plus a direct Maps link so you can sanity-check any record yourself.",
        ],
        bullets: [
          "Rating and review volume reveal whether a business is established, trusted or struggling",
          "Website presence tells you both reachability and the size of the opportunity",
          "Hours and phone data make multi-channel follow-up straightforward",
        ],
      },
      {
        h: "Deduplicated by business — you never pay twice",
        paras: [
          "Run the same search next month and Zybble recognizes businesses already in your database. Quota is only consumed for genuinely new leads, so a list built in September doesn't eat budget in October. It's a small contract with big consequences: your cost per lead trends toward zero as your database compounds.",
        ],
      },
    ],
    faq: [
      {
        q: "How many leads can I find per month?",
        a: "Free includes 100 new leads monthly, Growth 5,000 and Agency 20,000. Only genuinely new, deduplicated businesses count against the quota.",
      },
      {
        q: "Where does the data come from?",
        a: "Public business listings and the businesses' own public websites. Zybble never scrapes personal profiles, never guesses personal data, and never pays into shared data pools.",
      },
      {
        q: "Can I search outside the US?",
        a: "Yes. The lead finder works anywhere public listings cover local businesses — including the UK, Canada, Europe and beyond. Location resolution understands cities, states, regions and countries.",
      },
    ],
    related: [
      { title: "Lead Enrichment", body: "Turn listings into outreach-ready records with verified emails.", to: "/features/lead-enrichment" },
      { title: "AI Lead Scoring", body: "Rank every lead 0–100 against your ideal customer profile.", to: "/features/ai-lead-scoring" },
      { title: "Build a local lead list", body: "Our step-by-step guide to lists that actually convert.", to: "/blog/build-a-local-lead-list" },
    ],
  },
  {
    slug: "/features/lead-enrichment",
    kicker: "Enrichment & Email Finder",
    h1: "From a map pin to an outreach-ready record in seconds.",
    lede: "Zybble enriches every business with its public website, phone, hours and reputation — then finds the email the business itself published, and tells you how much to trust it.",
    metaTitle: "Lead Enrichment & Email Verification | Zybble",
    metaDesc: "Enrich leads with verified public data and find business-published emails with honest statuses: verified, risky, invalid or unknown — never invented addresses.",
    sections: [
      {
        h: "Raw listings in, complete records out",
        paras: [
          "A search result is just the beginning of a record. During enrichment Zybble visits each business's public website and listing, normalizes the data and stores it in one clean shape. That's what makes filtering, export and personalization reliable downstream.",
        ],
        table: {
          head: ["Field", "Source", "Used for"],
          rows: [
            ["Company, category, address", "Public business listing", "Filtering, personalization, dedupe"],
            ["Rating & review count", "Public listing reputation", "Fit signals, AI scoring, opening lines"],
            ["Phone & hours", "Public listing", "Multi-channel follow-up, call timing"],
            ["Website", "Listing → live site check", "Research depth, web-presence signals"],
            ["Public email + source URL", "The business's own website", "Outreach with provenance you can defend"],
          ],
        },
      },
      {
        h: "Email statuses you can actually act on",
        paras: [
          "Every email Zybble reports was found published by the business itself — on its contact page, about page or homepage. Nothing is guessed, pattern-fabricated or invented. Each address carries a status so you always know the confidence level before you write.",
        ],
        table: {
          head: ["Status", "Meaning", "Recommended action"],
          rows: [
            ["Verified", "Found on a contact-type page; domain accepts mail (MX confirmed)", "Send with confidence"],
            ["Risky", "Found on a general page or obfuscated; deliverability less certain", "Send, but watch bounces"],
            ["Invalid", "Domain has no mail records — delivery is impossible", "Do not send; reach out another way"],
            ["Unknown", "No public email found on the site", "Phone, form or skip"],
          ],
        },
        afterParas: [
          "Every email also stores its source URL — when a teammate asks \"where did this address come from?\", the answer is one click away.",
        ],
      },
      {
        h: "Public business data only — and why that's a feature",
        paras: [
          "Zybble deliberately never touches personal profiles, scraped social data, or sensitive personal information. B2B outreach to a business's own publicly listed contact channel is the cleanest legal and ethical basis for prospecting there is — it keeps you aligned with CAN-SPAM and GDPR's outreach provisions, and it keeps your sender reputation intact.",
        ],
      },
    ],
    faq: [
      {
        q: "Does Zybble ever guess email addresses?",
        a: "Never. If a pattern like info@domain.com wasn't actually published by the business, it does not appear as a lead email. Invented addresses are the single biggest driver of bounces and spam complaints — we simply don't do it.",
      },
      {
        q: "What does 'verified' mean technically?",
        a: "The address was found on a page whose purpose is contact, and the domain has live mail-exchange (MX) records. It is not a guarantee of inbox placement — no tool can promise one honestly — but it is the strongest signal available without contacting the server.",
      },
      {
        q: "Is enrichment included on the free plan?",
        a: "Yes. Enrichment and email finding are core to the product and included on every plan, including Free.",
      },
    ],
    related: [
      { title: "Lead Finder", body: "Find businesses by industry, location and live signals.", to: "/features/lead-finder" },
      { title: "AI Research", body: "Turn enriched records into briefs and outreach angles.", to: "/features/ai-email-writer" },
      { title: "Email Sequences", body: "Send and follow up automatically, with guardrails.", to: "/features/email-sequences" },
    ],
  },
  {
    slug: "/features/ai-lead-scoring",
    kicker: "AI Lead Scoring",
    h1: "A 0–100 fit score you can actually audit.",
    lede: "Zybble scores every lead against visible signals — reputation, reachability, web presence, completeness — and shows its work. No black box, no mysticism.",
    metaTitle: "AI Lead Scoring Software, Explained | Zybble",
    metaDesc: "Score leads 0–100 with transparent, explainable AI. See exactly why each lead earned its score — reputation, reachability, web presence — and focus on the top 5%.",
    sections: [
      {
        h: "What the score actually looks at",
        paras: [
          "Zybble's scoring weighs the signals that genuinely predict whether a small or mid-sized business is worth your time this week. Reputation — rating and review volume — tells you if the business is healthy. Reachability — a verified public email, a phone, an active website — tells you if a conversation is even possible. Web presence tells you both the sophistication of the business and the size of the gap you might fill.",
        ],
        bullets: [
          "Google rating and review velocity as health signals",
          "Verified email availability as an outreach-readiness signal",
          "Website presence and activity as sophistication signals",
          "Record completeness as a data-confidence signal",
          "Category and location match against your search criteria",
        ],
      },
      {
        h: "Transparent beats mysterious",
        paras: [
          "Every score arrives with its reasons written in plain language: \"4.9 rating signals a trusted, well-run business,\" \"No website found — may be harder to reach, easier to help.\" If a score ever surprises you, you can read exactly why it happened. That auditability is what separates a scoring system you can build a process around from one you learn to ignore.",
        ],
        table: {
          head: ["Score band", "Meaning", "What to do"],
          rows: [
            ["85–100 · Excellent fit", "Strong reputation, verified contact, clear opening", "Prioritize today — personalized outreach"],
            ["70–84 · Strong fit", "Healthy signals with a gap or two", "Work through this week"],
            ["50–69 · Moderate fit", "Missing reachability or thin reputation", "Nurture; revisit with a different channel"],
            ["Under 50 · Low fit", "Unreachable or mismatched", "Skip — protect your time and your sender reputation"],
          ],
        },
      },
      {
        h: "Score ten leads or ten thousand",
        paras: [
          "Single leads score in about two seconds from the lead detail page, and \"Score all\" runs your whole database through the same engine. Scores are cached per lead — they don't drift every time you look, and they refresh when you ask them to.",
        ],
      },
      {
        h: "What a score can't tell you",
        paras: [
          "A score is triage, not prophecy. It can't know that the owner just signed a competitor, or that they're about to expand. Use it to order your day, not to replace judgment — and check your reply rates by score band monthly to keep your expectations calibrated to reality.",
        ],
      },
    ],
    faq: [
      {
        q: "Is AI scoring available on the free plan?",
        a: "Scoring requires Growth or Agency, along with AI research and the AI writer. Free covers finding, enriching and verifying leads.",
      },
      {
        q: "Can I see why a lead scored the way it did?",
        a: "Always. Every score stores its reasoning alongside it, written from the lead's actual data points.",
      },
      {
        q: "Does the score learn from my results?",
        a: "The model weighs fixed, explainable signals rather than black-box correlations, so scores stay auditable. As your ICP sharpens, scoring criteria stay aligned with the searches you run.",
      },
    ],
    related: [
      { title: "How AI lead scoring works", body: "Our deep-dive on using scores without fooling yourself.", to: "/blog/how-ai-lead-scoring-works" },
      { title: "AI Email Writer", body: "Turn a scored lead into a researched, personal email.", to: "/features/ai-email-writer" },
      { title: "Lead Enrichment", body: "The data foundation every score is built on.", to: "/features/lead-enrichment" },
    ],
  },
  {
    slug: "/features/ai-email-writer",
    kicker: "AI Email Writer",
    h1: "Cold emails that read like you did the homework — because the AI did.",
    lede: "Zybble drafts short, personal outreach grounded only in real lead data: the rating you saw, the city they serve, the gap they have. Choose the tone, keep the specifics, send it as yourself.",
    metaTitle: "AI Cold Email Writer — No Templates, Real Research | Zybble",
    metaDesc: "Write personalized cold outreach with AI that's grounded only in real lead data. No hallucinated facts, no fake flattery, no templates — choose the tone and send as yourself.",
    sections: [
      {
        h: "Grounded in research — literally",
        paras: [
          "The writer's source material is the lead's own record plus the AI research brief: their category, city, rating, review count, web presence and the outreach angle the research produced. If a fact isn't in the record, it does not appear in the email. That constraint is the whole product — it's what makes the output sendable without a forensic review of every sentence.",
        ],
      },
      {
        h: "The anti-hallucination guarantee",
        paras: [
          "Most AI outreach fails the same way: invented case studies, imagined tech stacks, fake compliments about a redesign that never happened. Zybble's writer is instructed to use only the provided business data, and the system prompt forbids fabricating customers, achievements, partnerships, technologies or staff. Here is exactly what the writer will never put in an email:",
        ],
        bullets: [
          "Named customers, results or revenue claims about your company or theirs",
          "Technologies the prospect supposedly uses",
          "Awards, press mentions or milestones not present in the record",
          "Personal details about any individual — outreach goes to businesses, not people",
        ],
      },
      {
        h: "Choose the tone, keep the specifics",
        paras: [
          "Friendly, direct or formal — the opening observation, the relevance and the ask stay intact; the register shifts to match how you actually write.",
        ],
        table: {
          head: ["Tone", "Reads like", "Best for"],
          rows: [
            ["Friendly", "Warm, conversational, low-pressure", "Agencies, creative services, local SMB"],
            ["Direct", "Three short paragraphs, one clear ask", "Busy owners, operational services"],
            ["Formal", "Measured, professional register", "Legal, financial, enterprise-adjacent prospects"],
          ],
        },
      },
      {
        h: "What actually earns replies in 2026",
        paras: [
          "The emails that work are short, specific and end with one small question. Zybble keeps drafts under about 120 words, leads with something true about their business, and closes with a low-commitment ask. You stay the editor — copy the draft, adjust a line, or drop it straight into a campaign.",
        ],
      },
    ],
    faq: [
      {
        q: "Will every email be different?",
        a: "Yes. Drafts are generated per lead from that lead's record, so two roofing companies in the same city get observably different emails — different ratings, different review counts, different angles.",
      },
      {
        q: "Can I edit drafts before sending?",
        a: "Absolutely. Drafts open in a review modal — edit, copy, or use them as-is. In campaigns, step copy is fully yours; the AI writer is for one-to-one personalization.",
      },
      {
        q: "Does it invent results for my company?",
        a: "No. It references only what the business itself can verify plus the sender name and company you set in your profile.",
      },
    ],
    related: [
      { title: "AI Lead Scoring", body: "Decide who deserves the personalized touch first.", to: "/features/ai-lead-scoring" },
      { title: "Email Sequences", body: "Put the draft into a Day 0/3/7 cadence.", to: "/features/email-sequences" },
      { title: "Deliverability checklist", body: "Make sure the email actually lands in the inbox.", to: "/blog/cold-email-deliverability-checklist" },
    ],
  },
  {
    slug: "/features/email-sequences",
    kicker: "Email Sequences",
    h1: "Follow-up automation with the guardrails already on.",
    lede: "Most replies arrive after the second or third touch. Zybble sends your Day 0 email, waits, follows up — and stops the moment someone replies, bounces or unsubscribes.",
    metaTitle: "Email Sequences & Follow-up Automation | Zybble",
    metaDesc: "Automated email sequences with stop-on-reply, bounce suppression and one-click unsubscribe built in. Send through your own SMTP and let follow-ups run themselves.",
    sections: [
      {
        h: "The reply math behind follow-ups",
        paras: [
          "One-off cold emails leave most of your replies on the table. The majority of positive responses arrive after the second or third contact — yet almost nobody follows up consistently by hand. A simple cadence beats a clever message sent once.",
        ],
        table: {
          head: ["Step", "When", "Job of the email"],
          rows: [
            ["Initial email", "Day 0", "Lead with one true observation; one small ask"],
            ["Follow-up 1", "Day 3", "Add value or a sharper reason to reply — never \"just bumping\""],
            ["Follow-up 2", "Day 7", "Close the loop gracefully; leave the door open"],
          ],
        },
        afterParas: [
          "You set the days, the subjects and the copy — with per-lead variables like {{company}}, {{city}} and {{rating}} rendered at send time from the lead record.",
        ],
      },
      {
        h: "Automation with guardrails",
        paras: [
          "Unbounded automation is how domains get burned. Zybble's guardrails are structural — they run whether you remember them or not:",
        ],
        bullets: [
          "Stops automatically the moment a recipient replies — no awkward robot follow-ups",
          "Hard bounces (5xx) permanently suppress the address and mark the lead invalid",
          "Transient failures retry up to three times, five minutes apart, then stop",
          "Every email carries a working one-click unsubscribe link — unsubscribed addresses are never contacted again, by any campaign",
          "Sends are paced seconds apart per recipient, not blasted in one burst",
        ],
      },
      {
        h: "Your SMTP, your reputation",
        paras: [
          "Zybble sends through your own SMTP account — Gmail, Outlook or any provider — under your domain and your warm-up history. Credentials are encrypted with AES-256-GCM before they reach the database, verified with a live handshake on save, and never exposed to the browser again. Shared sender pools are how deliverability dies; we don't have one.",
        ],
      },
      {
        h: "Read the activity feed like a dashboard",
        paras: [
          "Every schedule, send, retry, bounce, reply and unsubscribe lands in a live feed per campaign — with per-recipient step tracking and exact next-send countdowns. You'll never wonder what the machine is doing in your name.",
        ],
      },
    ],
    faq: [
      {
        q: "What happens when someone replies?",
        a: "The sequence stops for that recipient immediately, and the reply is logged in the campaign feed so you can take over the conversation personally.",
      },
      {
        q: "How does the unsubscribe system work?",
        a: "Each recipient gets a per-sequence unsubscribe token in their email footer. One click adds the address to your account-wide suppression list — honored by every campaign, present and future, forever. Manual and bounce suppressions live in the same list.",
      },
      {
        q: "Can I pause a campaign mid-flight?",
        a: "Yes — pause holds all scheduled sends; resume picks them right back up. Drafts can be edited freely, and paused campaigns can be edited before resuming.",
      },
    ],
    related: [
      { title: "Deliverability checklist", body: "Everything to fix before your first send.", to: "/blog/cold-email-deliverability-checklist" },
      { title: "AI Email Writer", body: "Research-grounded drafts for step one.", to: "/features/ai-email-writer" },
      { title: "Lead Finder", body: "Fill the sequence with businesses that fit.", to: "/features/lead-finder" },
    ],
  },
];

// ————————————————— Hub —————————————————

export function FeaturesIndex() {
  return (
    <MarketingLayout path="/features">
      <Seo
        title="Features — Zybble | Find, enrich, score and reach customers"
        description="Explore Zybble's six-step lead engine: local lead finder, enrichment, email verification, AI research and scoring, AI email writer and automated follow-up sequences."
        path="/features"
        jsonld={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Features", path: "/features" }])}
      />
      <PageHero
        kicker="Features"
        center
        title={<>Five tools. One continuous motion.</>}
        lede="Every Zybble feature exists to move a lead exactly one step forward — from found, to understood, to a reply in your inbox. Here's how each one works."
      />
      <div className="mx-auto grid max-w-5xl gap-4 px-6 pb-8 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.slug} delay={i * 0.06} className={cn(i === 4 && "sm:col-span-2 lg:col-span-1")}>
            <MLink
              to={f.slug}
              className="group flex h-full flex-col rounded-[20px] border border-black/[0.07] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgba(20,18,15,0.2)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                {f.kicker}
              </p>
              <h2 className="mt-3 font-display text-[19px] font-semibold leading-snug tracking-[-0.01em] text-neutral-950">
                {f.h1.split(".")[0]}.
              </h2>
              <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-neutral-500">
                {f.lede}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-950">
                Read more
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </MLink>
          </Reveal>
        ))}
      </div>
      <CtaBlock />
    </MarketingLayout>
  );
}

// ————————————————— Detail —————————————————

export function FeatureDetail({ path }: { path: string }) {
  const f = FEATURES.find((x) => x.slug === path);
  if (!f) return null;

  return (
    <MarketingLayout path={f.slug}>
      <Seo
        title={f.metaTitle}
        description={f.metaDesc}
        path={f.slug}
        jsonld={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Features", path: "/features" },
            { name: f.kicker, path: f.slug },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: f.metaTitle,
            description: f.metaDesc,
            url: `https://zybble.com${f.slug}`,
            isPartOf: { "@id": "https://zybble.com/#website" },
            about: { "@type": "Thing", name: f.kicker },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: f.faq.map((x) => ({
              "@type": "Question",
              name: x.q,
              acceptedAnswer: { "@type": "Answer", text: x.a },
            })),
          },
        ]}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-3xl px-6 pt-8 text-[12px] text-neutral-400">
        <MLink to="/" className="hover:text-neutral-900">Home</MLink>
        <span className="mx-2">/</span>
        <MLink to="/features" className="hover:text-neutral-900">Features</MLink>
        <span className="mx-2">/</span>
        <span className="text-neutral-700">{f.kicker}</span>
      </nav>

      <PageHero kicker={f.kicker} title={f.h1} lede={f.lede} />

      {f.sections.map((s) => (
        <ProseSection key={s.h} title={s.h}>
          {s.paras?.map((p, i) => <p key={i}>{p}</p>)}
          {s.bullets && (
            <ul className="list-none space-y-2.5">
              {s.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {s.table && (
            <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-black/[0.06] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                    {s.table.head.map((h) => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.table.rows.map((r, i) => (
                    <tr key={i} className="border-b border-black/[0.04] align-top last:border-0">
                      {r.map((c, j) => (
                        <td key={j} className={cn("px-4 py-3 text-[13px] leading-relaxed", j === 0 ? "font-semibold text-neutral-900" : "text-neutral-600")}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {s.afterParas?.map((p, i) => <p key={`a${i}`}>{p}</p>)}
        </ProseSection>
      ))}

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 pb-6 pt-4">
        <h2 className="font-display text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-[-0.02em] text-neutral-950">
          Questions about {f.kicker.toLowerCase()}
        </h2>
        <div className="mt-6 space-y-5">
          {f.faq.map((x) => (
            <div key={x.q} className="rounded-2xl border border-black/[0.06] bg-white p-5">
              <h3 className="text-[14.5px] font-semibold text-neutral-900">{x.q}</h3>
              <p className="mt-2 text-[14px] leading-[1.7] text-neutral-600">{x.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related */}
      <section className="mx-auto max-w-3xl px-6 pb-6 pt-2">
        <Kicker>Keep exploring</Kicker>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {f.related.map((r) => (
            <MLink
              key={r.to}
              to={r.to}
              className="group rounded-2xl border border-black/[0.06] bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(20,18,15,0.18)]"
            >
              <h3 className="text-[14px] font-semibold text-neutral-950">{r.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500">{r.body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-neutral-950">
                Open <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </MLink>
          ))}
        </div>
      </section>

      <CtaBlock />
    </MarketingLayout>
  );
}
