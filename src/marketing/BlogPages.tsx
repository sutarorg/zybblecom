import { ArrowRight, Clock } from "lucide-react";
import Reveal from "../components/Reveal";
import { MLink, Seo, SITE_URL, breadcrumbJsonLd } from "../seo/Seo";
import { cn } from "../utils/cn";
import MarketingLayout, { CtaBlock, Kicker, ProseSection } from "./Layout";

// ————————————————————————————————————————————————————————————
// Guides — genuinely useful, original, expertise-driven content.
// Three deep articles, written to be the best answer on the
// topic — not a content farm. Dates reflect real publication.
// ————————————————————————————————————————————————————————————

interface ArticleSection {
  h: string;
  paras?: string[];
  bullets?: string[];
  table?: { head: string[]; rows: string[][] };
  afterParas?: string[];
}

interface Article {
  slug: string;
  title: string;
  metaTitle: string;
  desc: string;
  category: string;
  date: string;
  dateISO: string;
  readingTime: string;
  excerpt: string;
  sections: ArticleSection[];
  related: { title: string; to: string; body: string }[];
}

export const ARTICLES: Article[] = [
  {
    slug: "/blog/build-a-local-lead-list",
    title: "How to build a local lead list that actually converts in 2026",
    metaTitle: "How to Build a Local Lead List in 2026 — Zybble Blog",
    desc: "A practical process for turning a broad market into a focused list of businesses to contact, without buying a stale database.",
    category: "Playbooks",
    date: "September 8, 2026",
    dateISO: "2026-09-08",
    readingTime: "6 min read",
    excerpt:
      "A practical process for turning a broad market into a focused list of businesses to contact, without buying a stale database.",
    sections: [
      {
        h: "Start with an ICP you can observe",
        paras: [
          "The most common list-building mistake is describing your ideal customer in traits you can't see: \"growth-minded,\" \"ready to buy,\" \"decision-maker.\" You can't search for those. You can, however, search for observable proxies: a business with a strong public reputation may be established; a business with no website may have a gap you can name in your first sentence.",
          "Write your ICP as three columns: industry + geography, positive signals (what good looks like), and exclusion signals (what you'll skip). If any row can't be checked from public data, rewrite it until it can.",
        ],
      },
      {
        h: "Search wide, filter hard",
        paras: [
          "Run category-and-geography searches that deliberately overshoot — \"dentists in Texas\" rather than \"affluent dentists in Plano with growth mindsets.\" Breadth is cheap upfront and expensive later: every unqualified lead you email costs deliverability, a resource no filter can rebuild quickly.",
          "Then filter hard on your observable signals before a single send. In Zybble that means trimming by rating presence, review volume, website presence and email status — a broad search should be narrowed to the businesses that match your actual criteria, not sent as an undifferentiated list.",
        ],
      },
      {
        h: "Deduplicate before anything else",
        paras: [
          "The fastest way to look like spam is asking the same business to hear your pitch twice in different weeks. Dedupe by business identity — company plus city — before leads touch any sequence. Once dedupe is structural, re-running searches monthly becomes pure upside: only net-new businesses enter your pipeline.",
        ],
      },
      {
        h: "Add email truth early",
        paras: [
          "A lead without a reachable channel is a research note, not a lead. Enrich records while they're fresh: find the email the business itself published, check whether the domain accepts mail, and note the source. Public, business-published addresses convert better and bounce less than any guessed pattern ever will — and they keep you on the right side of anti-spam law everywhere you sell.",
          "Treat the status honestly: verified → send; risky → send but watch; invalid → another channel; unknown → phone, form, or skip. Never paper over an unknown with an invented address.",
        ],
      },
      {
        h: "Score, then review by hand",
        paras: [
          "AI scoring exists to order your day, not to replace it. A reliable rhythm: score the batch, review a sample of the highest-fit leads by eye, and check whether the reasoning matches your judgment. If you keep overrule the model, your ICP signals are wrong — fix the signals, not the score.",
        ],
        table: {
          head: ["Score band", "Your time allocation"],
          rows: [
            ["High fit", "Personalized outreach — research, angle, custom first line"],
            ["Strong fit", "This week's sequence, with step one personalized"],
            ["Needs review", "Hold; validate the fit with another signal"],
            ["Low fit", "Skip when the record does not support a useful message"],
          ],
        },
      },
      {
        h: "Mistakes that quietly kill lists",
        bullets: [
          "Scaling volume before fixing fit — a long list of wrong contacts is worse than a short list of right ones",
          "Re-emailing bounced or unsubscribed addresses — one repeat offense can burn a domain for months",
          "Letting lists go stale without re-verification",
          "Personalizing with invented specifics — one fake \"loved your redesign\" erases ten good emails",
          "Measuring sends instead of replies — the list's job is conversations, not volume",
        ],
      },
    ],
    related: [
      { title: "Deliverability checklist", body: "Everything to fix before your first send.", to: "/blog/cold-email-deliverability-checklist" },
      { title: "AI Lead Scoring", body: "How the 0–100 score works under the hood.", to: "/features/ai-lead-scoring" },
      { title: "Lead Finder", body: "Run your first focused search with public business data.", to: "/features/lead-finder" },
    ],
  },
  {
    slug: "/blog/cold-email-deliverability-checklist",
    title: "The cold email deliverability checklist: land in the inbox, not spam (2026)",
    metaTitle: "Cold Email Deliverability Checklist for 2026 — Zybble Blog",
    desc: "A pre-send checklist for cold email deliverability: authentication, list hygiene, pacing, bounce handling and unsubscribe mechanics.",
    category: "Deliverability",
    date: "September 10, 2026",
    dateISO: "2026-09-10",
    readingTime: "7 min read",
    excerpt:
      "Deliverability is decided before you write a word. Here's the complete pre-send checklist we run for every campaign.",
    sections: [
      {
        h: "Deliverability is earned before the first word",
        paras: [
          "Mailbox providers judge the sender long before they judge the sentence. Your domain's authentication, history and sending behavior determine whether recipient one-thousand sees your email at all. Treat deliverability as infrastructure you build once and protect forever — not a copywriting problem you solve per email.",
        ],
      },
      {
        h: "The DNS trio, in plain English",
        table: {
          head: ["Record", "What it proves", "What good looks like"],
          rows: [
            ["SPF", "Which servers may send mail for your domain", "One TXT record listing your providers — no \"+all\" wildcard"],
            ["DKIM", "The email wasn't altered in transit and was signed by your domain", "Valid 2048-bit key published by your email provider"],
            ["DMARC", "What receivers should do when SPF/DKIM fail — and where to report", "p=quarantine or p=reject with a real reporting address"],
          ],
        },
        afterParas: [
          "Check all three for the exact domain you send from — including any outreach subdomain. A pass, pass, aligned-DMARC result is table stakes in 2026.",
        ],
      },
      {
        h: "Warm up like a human, not a cannon",
        paras: [
          "A new or dormant domain that suddenly sends a large burst reads as unusual to mailbox providers. Ramp gradually, watch responses and keep the sending pattern steady.",
        ],
        table: {
          head: ["Week", "Max emails / day", "Focus"],
          rows: [
            ["Start", "Small, controlled batch", "Warm contacts and confirm the setup"],
            ["Next", "Increase cautiously", "Keep the best-fit segment"],
            ["Steady", "Consistent daily pace", "Watch bounce and reply signals"],
            ["Ongoing", "Hold a sustainable level", "Do not trade list quality for volume"],
          ],
        },
      },
      {
        h: "Volume math and pacing",
        paras: [
          "One sender, one domain, one offer — and modest daily volume spread over the day. Single bursts look like campaigns; steady flow looks like a human who works. This is precisely why Zybble paces sends instead of firing them in batches.",
        ],
      },
      {
        h: "Set a bounce threshold and pause",
        paras: [
          "There is no universal safe bounce percentage for every sender or provider. Set a conservative threshold for your domain, pause when it moves in the wrong direction, and investigate the source. Durable defenses include verified public emails, permanent hard-bounce suppression (Zybble suppresses 5xx permanently and marks the lead invalid), and regular re-verification.",
        ],
      },
      {
        h: "One-click unsubscribe actually protects you",
        paras: [
          "Every major mailbox provider rewards senders who make leaving easy and punishes those who don't. A working unsubscribe converts \"report spam\" clicks into quiet exits — spam complaints are the fastest domain-killer there is. Every Zybble sequence email carries a per-recipient, one-click unsubscribe link that updates an account-wide suppression list instantly.",
        ],
      },
      {
        h: "Plain text first, polish later",
        paras: [
          "Heavily templated HTML emails read as marketing before they're opened. Plain-text-first emails with real sentences, one link maximum, and a full-name sign-off behave like one-to-one mail — because to the filters, they are.",
        ],
      },
      {
        h: "Monitor after then fix",
        table: {
          head: ["Metric", "Healthy", "If it slips"],
          rows: [
            ["Open rate", "Compare with your own baseline", "Check subject lines and sender reputation"],
            ["Reply rate", "Track by segment and message", "Tighten ICP and angles before increasing volume"],
            ["Bounce rate", "Keep as low as possible", "Pause and audit list sources and verification"],
            ["Spam complaints", "As close to zero as possible", "Pause and review targeting, frequency and unsubscribe visibility"],
          ],
        },
      },
    ],
    related: [
      { title: "Email Sequences", body: "Automation with these guardrails built in.", to: "/features/email-sequences" },
      { title: "Build a local lead list", body: "Better lists = better deliverability.", to: "/blog/build-a-local-lead-list" },
      { title: "Lead Enrichment", body: "Verified emails with provenance.", to: "/features/lead-enrichment" },
    ],
  },
  {
    slug: "/blog/how-ai-lead-scoring-works",
    title: "What AI lead scoring actually measures (and how to use it without fooling yourself)",
    metaTitle: "What AI Lead Scoring Measures — Zybble Blog",
    desc: "A clear guide to the public signals behind AI lead scoring, how to validate a model against reply data and when to override it.",
    category: "AI & Data",
    date: "September 12, 2026",
    dateISO: "2026-09-12",
    readingTime: "6 min read",
    excerpt:
      "Scores are compressed evidence, not prophecy. Here's how to get real value out of them — and when to override them.",
    sections: [
      {
        h: "A score is compressed evidence, not prophecy",
        paras: [
          "Ask what any score is really saying and the honest answer is narrow: \"given these observable signals, this lead resembles the ones that tend to work out.\" That is enormously useful for ordering a day — and useless for predicting any single lead's answer. Teams burn scores by treating a number as a promise or verdict; teams get value by using fit bands to allocate attention.",
        ],
      },
      {
        h: "The signal categories that actually predict fit",
        paras: [
          "For local and SMB prospecting, several families of public signals provide useful context. Reputation signals — rating and review volume — proxy business health and momentum. Reachability signals — a verified public email, a phone, an active website — determine whether a conversation is even possible. Presence signals — the strength and currency of the website — estimate both sophistication and gap size. Fit signals — category and geography — make sure the lead belongs to your market at all.",
          "Anything a model can't observe must not affect the score. The moment scores encode guesses — headcount invented from thin air, \"intent\" with no observable basis — explainability is gone and so is trust.",
        ],
      },
      {
        h: "Transparent models beat accurate-seeming ones",
        table: {
          head: ["", "Transparent scoring (Zybble)", "Opaque black-box scores"],
          rows: [
            ["You see", "The exact reasons for every score", "A number and a shrug"],
            ["When wrong", "You learn which signal misled you", "You learn nothing"],
            ["Process fit", "Coaches judgment; sharpens ICP", "Rots judgment; breeds dependency"],
            ["Auditability", "Defensible per lead", "Unverifiable"],
          ],
        },
      },
      {
        h: "Validate against your own reply data, monthly",
        paras: [
          "The only ground truth for lead scoring is your reply data. Bucket sends by score band and compare reply rates over time. If the ordering does not match your experience, your scoring inputs may be misreading the market: change the signals, not the spreadsheet.",
        ],
        table: {
          head: ["Score band", "Expected reply gradient", "If reality disagrees"],
          rows: [
            ["High fit", "Compare with your strongest replies", "Check whether the signals reflect real need"],
            ["Strong fit", "Compare with the next band", "Review whether band boundaries help"],
            ["Needs review", "Look for useful patterns", "Add context before changing the model"],
            ["Low fit", "Check for unexpected replies", "Improve exclusion signals if needed"],
          ],
        },
      },
      {
        h: "When to override the score",
        bullets: [
          "Time-based context the model can't see — a storm season, a regulation change, a funding headline",
          "Referral-adjacent knowledge: someone you know vouched for or against them",
          "A pattern you own that the model doesn't: \"owners who reply to me hate polished agencies\"",
          "Never override to excuse a worse list — overrides sharpen focus; they don't inflate it",
        ],
        afterParas: [
          "The healthiest workflow is boring: score, order, eyeball the top band, send, measure, adjust. Zybble's scoring was built to be used exactly that way — every score carries its reasons in writing.",
        ],
      },
    ],
    related: [
      { title: "AI Lead Scoring", body: "See the transparent 0–100 score in action.", to: "/features/ai-lead-scoring" },
      { title: "AI Email Writer", body: "Turn a high score into a personal email.", to: "/features/ai-email-writer" },
      { title: "Build a local lead list", body: "Feed the scorer with better inputs.", to: "/blog/build-a-local-lead-list" },
    ],
  },
];

// ————————————————— Hub —————————————————

export function BlogIndex() {
  return (
    <MarketingLayout path="/blog">
      <Seo
        title="Blog — Zybble | Lead generation, deliverability & AI guides"
        description="Practical guides on local lead generation, cold email deliverability and AI-powered prospecting from the Zybble team."
        path="/blog"
        jsonld={[
          breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }]),
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "Zybble Blog",
            url: `${SITE_URL}/blog`,
            publisher: { "@id": "https://zybble.com/#org" },
            blogPost: ARTICLES.map((a) => ({
              "@type": "BlogPosting",
              headline: a.title,
              description: a.desc,
              url: `${SITE_URL}${a.slug}`,
              datePublished: a.dateISO,
            })),
          },
        ]}
      />
      <div className="px-6 pb-12 pt-16 text-center sm:pt-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center">
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
            <span className="h-px w-8 bg-neutral-300" />
            The Zybble blog
            <span className="h-px w-8 bg-neutral-300" />
          </p>
          <h1 className="mt-6 font-display text-[clamp(2.2rem,4.6vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-950">
            Field notes on finding<br />customers.
          </h1>
          <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-neutral-500 sm:text-lg">
            Deep, practical guides on lead generation, deliverability and
            AI-assisted prospecting — written from running the machine, not
            theorizing about it.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-4 px-6 pb-8 lg:grid-cols-3">
        {ARTICLES.map((a, i) => (
          <Reveal key={a.slug} delay={i * 0.08}>
            <MLink
              to={a.slug}
              className="group flex h-full flex-col rounded-[20px] border border-black/[0.07] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgba(20,18,15,0.2)]"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
                <span className="text-indigo-500">{a.category}</span>
                <span className="text-neutral-300">·</span>
                <span className="text-neutral-400">{a.readingTime}</span>
              </div>
              <h2 className="mt-3 font-display text-[19px] font-semibold leading-snug tracking-[-0.01em] text-neutral-950">
                {a.title}
              </h2>
              <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-neutral-500">
                {a.excerpt}
              </p>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-[11.5px] text-neutral-400">{a.date}</span>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-950">
                  Read
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </MLink>
          </Reveal>
        ))}
      </div>
      <CtaBlock />
    </MarketingLayout>
  );
}

// ————————————————— Article —————————————————

export function ArticleDetail({ path }: { path: string }) {
  const a = ARTICLES.find((x) => x.slug === path);
  if (!a) return null;

  return (
    <MarketingLayout path={a.slug}>
      <Seo
        title={a.metaTitle}
        description={a.desc}
        path={a.slug}
        ogType="article"
        jsonld={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: a.title, path: a.slug },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: a.title,
            description: a.desc,
            url: `${SITE_URL}${a.slug}`,
            datePublished: a.dateISO,
            dateModified: "2026-09-18",
            inLanguage: "en",
            image: `${SITE_URL}/og.png`,
            author: { "@id": "https://zybble.com/#org" },
            publisher: { "@id": "https://zybble.com/#org" },
            mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${a.slug}` },
            articleSection: a.category,
          },
        ]}
      />

      <article itemScope itemType="https://schema.org/Article">
        <nav aria-label="Breadcrumb" className="mx-auto max-w-3xl px-6 pt-8 text-[12px] text-neutral-400">
          <MLink to="/" className="hover:text-neutral-900">Home</MLink>
          <span className="mx-2">/</span>
          <MLink to="/blog" className="hover:text-neutral-900">Blog</MLink>
          <span className="mx-2">/</span>
          <span className="text-neutral-700">{a.category}</span>
        </nav>

        <header className="mx-auto max-w-3xl px-6 pb-10 pt-10">
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
            <span className="h-px w-8 bg-neutral-300" />
            {a.category}
          </p>
          <h1 itemProp="headline" className="mt-5 font-display text-[clamp(2rem,4.2vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.032em] text-neutral-950">
            {a.title}
          </h1>
          <div className="mt-6 flex items-center gap-3 text-[13px] text-neutral-500">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-neutral-950 text-[11px] font-semibold text-white">
              Zy
            </span>
            <div>
              <p className="font-semibold text-neutral-900" itemProp="author">The Zybble team</p>
              <p className="flex items-center gap-1.5 text-[12px] text-neutral-400">
                <time itemProp="datePublished" dateTime={a.dateISO}>{a.date}</time>
                <span>·</span>
                <Clock className="h-3 w-3" />
                {a.readingTime}
              </p>
            </div>
          </div>
        </header>

        {a.sections.map((s) => (
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

        {/* Methodology note — E-E-A-T signal */}
        <section className="mx-auto max-w-3xl px-6 pb-8">
          <div className="rounded-2xl border border-black/[0.06] bg-neutral-50/70 p-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              How we wrote this
            </p>
            <p className="mt-2 text-[13px] leading-[1.7] text-neutral-600">
              This guide reflects the systems that ship in Zybble itself and the
              deliverability and scoring practices we run against real
              campaigns — not recycled advice. Examples are illustrative; calibrate
              decisions against your own audience, sending environment and
              reply data.
            </p>
          </div>
        </section>

        {/* Related */}
        <section className="mx-auto max-w-3xl px-6 pb-6">
          <Kicker>Read next</Kicker>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {a.related.map((r) => (
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
      </article>

      <CtaBlock
        title="Put this playbook to work."
        sub="Find 100 leads free every month — no credit card required."
      />
    </MarketingLayout>
  );
}
