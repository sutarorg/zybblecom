import Link from "next/link";
import type { Article } from "@/types/content";
import { Byline, Cover, JournalLink, References } from "./primitives";
import s from "./editorial.module.css";

const comparison = [
  [
    "Starting point",
    "Import a recording to discover and refine highlights.",
    "Bring media into an editable project and work on the composition.",
  ],
  [
    "Clip selection",
    "AI suggests excerpts from imported footage; review the suggestions against the recording.",
    "Create Clips scans the selected composition. Set quantity and duration; optional topics can steer suggestions.",
  ],
  [
    "Where you fix a bad cut",
    "Refine the generated excerpt in the clip editor where the plan supports the controls you need.",
    "Edit the clip’s composition; use the transcript and timeline to find a precise boundary.",
  ],
  [
    "Audio and source edits",
    "Evaluate available editing or cleanup tools for the clip; keep a separate master when the full episode needs work.",
    "Transcript edits can change the full composition. Studio Sound and filler-word removal are listed on Hobbyist.",
  ],
  [
    "Portrait layout",
    "AI reframing and captions are part of the clipping workflow; options depend on plan.",
    "Create Clips supports portrait layout presets; the generated cuts remain editable compositions.",
  ],
  [
    "Budget unit",
    "Processing credits tied to source duration, with plan-specific allowances.",
    "Per-person subscription with separate media-hour and AI-credit allowances.",
  ],
  [
    "Release handoff",
    "Check the plan for exports, watermark and access to any social publishing features before you commit.",
    "Test that the chosen export tier and file handoff fit whoever approves and publishes clips.",
  ],
];

export function OpusClipComparison({ article }: { article: Article }) {
  return (
    <article
      className={`${s.article} ${s.comparison}`}
      data-editorial-view="comparison-desk"
    >
      <header className={`container ${s.comparisonHero}`}>
        <div>
          <JournalLink />
          <p className={s.kicker}>Buying guide · Editing and clipping</p>
          <h1>{article.title}</h1>
          <p className={s.deck}>{article.description}</p>
          <Byline article={article} />
        </div>
        <Cover article={article} sizes="(min-width: 900px) 38vw, 92vw" />
      </header>
      <div className="container">
        <section className={s.splitVerdict} aria-labelledby="where-to-start">
          <h2 id="where-to-start">
            The right starting point depends on what’s finished
          </h2>
          <div>
            <h3>Master approved? Start with OpusClip.</h3>
            <p>
              If the episode has cleared review and the social editor needs more
              candidates than they can find by scrubbing, audition a
              clipping-first tool on the approved export. This is a production
              handoff, not a reason to replace your episode editor.
            </p>
          </div>
          <div>
            <h3>Master still changing? Start with Descript.</h3>
            <p>
              If you still need to remove false starts, revise a cut, or repair
              dialogue, test an editor that can work on the source composition.
              Descript can also make clips automatically; you don’t need to buy
              a second product just to find out whether its suggestions are
              enough.
            </p>
          </div>
        </section>
        <section
          id="feature-matrix"
          className={s.matrix}
          aria-labelledby="feature-heading"
        >
          <h2 id="feature-heading">
            Compare the work, not the feature checkboxes
          </h2>
          <p>
            Both vendors document clipping and reframing. The distinction is
            what happens to the media around that operation. This comparison is
            based on public product documentation, not a hands-on speed or
            quality trial.
          </p>
          <div
            className={s.tableScroll}
            role="region"
            tabIndex={0}
            aria-label="Scrollable OpusClip and Descript comparison"
          >
            <table>
              <caption>
                Workflow and purchase differences. Recheck entitlements for the
                plan you intend to buy.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Decision</th>
                  <th scope="col">OpusClip</th>
                  <th scope="col">Descript</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map(([label, opus, descript]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{opus}</td>
                    <td>{descript}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className={s.comparisonColumns}>
          <div className={s.prose}>
            <section id="one-recording-two-editing-paths">
              <h2>One recording, two editing paths</h2>
              <p>
                Imagine a 48-minute interview about shipping a product on a
                deadline. The speaker first says her team stopped taking feature
                requests on Friday. Later she adds that this rule applied to the
                release branch, not customer support. Pull the first statement
                on its own and you’ve made a tidy video that misrepresents the
                advice. Assume you also need a 25-second teaser, a short that
                shows the release checklist, and a clean full episode.
              </p>
              <h3>Clipping-first: hand off a stable export</h3>
              <p>
                Lock the full episode before handing it over. Upload that
                export, then sort the proposed excerpts by what they offer a new
                viewer: a rule, an illustration, or a reason to watch the full
                episode. Combine candidate lists on paper before committing to
                an edit. Two different timestamps explaining the same release
                rule count as one story, not two publishable ideas. Include the
                release-branch qualifier in the proposed cut or leave the
                excerpt out.
              </p>
              <p>
                A clipping tool can help find moments that a producer who knows
                the conversation too well may miss. Its suggestions are also
                constrained by the input: if the master has a titles-only cold
                open, a tiny screen recording, or music baked across the
                dialogue, the clip editor can’t magically recover the original
                stems. If your workflow routinely needs those assets back, hand
                over the corresponding clean media or change where the
                derivative is cut.
              </p>
              <h3>Editor-first: stabilize the full composition, then branch</h3>
              <p>
                In Descript, edit the master as a composition and run{" "}
                <a href="https://help.descript.com/repurpose/create-clips-from-your-content">
                  Create Clips on that composition
                </a>
                . The vendor documents editable output compositions, a requested
                count of 1–20, a duration choice from 10 seconds to 5 minutes
                and optional guidance. Those settings describe requests, not
                promises of 20 distinct cuts. If the request is “clips about
                shipping,” you’re leaving the tool to decide whether shipping
                means logistics, product delivery, or software releases. A
                request that names the release-branch decision provides more
                specific direction.
              </p>
              <p>
                Use the transcript to navigate, but listen to the actual edit.
                Punctuation added by speech recognition is not evidence of a
                speaker taking a pause. A removed false start may also contain
                the only mention of the product name. If a long-form change
                invalidates a published excerpt, you need a record of which
                master it came from regardless of whether both compositions live
                in the same application.
              </p>
              <h3>Make the handoff reproducible</h3>
              <p>
                Attach the source time range to each excerpt and give approved
                exports their own revision. For example,{" "}
                <code>release-branch__m02__c03-r01.mp4</code> tells the next
                editor which master and clip they are looking at. Keep a note
                for the locked qualifier and the frame with the checklist.
                Review changes against those two checks, not just whether the
                new export appears smoother. If different people own full
                episodes and social, agree who decides when a new master
                requires a replacement clip and who contacts the publisher.
              </p>
            </section>
            <section id="controlled-pilot">
              <h2>Run a pilot that makes rejection visible</h2>
              <p>
                Use the same cleared recording and the same finished source
                version in both tools. If the question is whether to change your
                master editor, run a separate master-edit trial; don’t hide its
                time in only one stopwatch. Start with one straightforward
                talking-head segment, one section with overlapping voices, and
                one where a screen or prop carries the proof. Don’t accept a set
                of three easy single-speaker clips as evidence that your
                two-person show will behave the same way.
              </p>
              <ol className={s.pilot}>
                <li>
                  <strong>Define the deliverable.</strong> Three distinct
                  vertical exports, usable audio at phone volume, no missing
                  qualifications, captions checked against the final audio, and
                  a visible checklist when a clip refers to it.
                </li>
                <li>
                  <strong>Track two clocks.</strong> Write down time from ingest
                  to first candidates, then log hands-on minutes spent finding,
                  correcting, rendering and approving the final files. Count the
                  person doing the work, not just the machine’s elapsed time.
                </li>
                <li>
                  <strong>Code rejection reasons.</strong> Mark missing context,
                  duplicate idea, caption error, unstable crop, or rights
                  restriction. If an excerpt fails both tools due to missing
                  context, adjust the source or pick a different moment rather
                  than spending another round on settings.
                </li>
                <li>
                  <strong>Try one revision.</strong> Ask a reviewer to restore a
                  qualification and move the caption without covering a key
                  number. Record who can make the change and how they find the
                  right export. A front-loaded tool demo will not tell you this.
                </li>
              </ol>
              <p>
                Judge delivery after watching the approved files with sound off
                and on. Our guides to{" "}
                <Link href="/blog/podcast-clips">
                  selecting context-complete podcast clips
                </Link>
                ,{" "}
                <Link href="/blog/vertical-video-framing">
                  keeping onscreen evidence in frame
                </Link>
                , and{" "}
                <Link href="/blog/short-video-captions">
                  proofing timed captions
                </Link>{" "}
                can help you define pass criteria independently of either
                product. A vendor’s clip score is a triage aid, not a quality
                grade or prediction you can use in a business case.
              </p>
              <p>
                Retest with a difficult source. A clean single-speaker clip can
                conceal poor handling of off-screen voices, tiny slide details,
                or long reaction shots. A failed first pass also doesn’t prove
                the tool is wrong for the project: try designating a known-good
                excerpt manually. If the approved output is quick to produce
                from that excerpt, discovery is the limiting stage. If it still
                takes a long time, investigate framing, correction and handoff
                rather than tuning candidate count again.
              </p>
            </section>
            <section id="total-cost">
              <h2>Calculate cost per clip that clears review</h2>
              <p>
                Make the denominator the number of distinct, approved clips
                delivered this cycle. For an illustrative batch of 12 candidates
                with four duplicates, two context failures and one rights
                rejection, the denominator is five. If the tools cost $15 for
                the batch and 90 minutes of loaded labor cost $45, your cost is
                $60 ÷ 5, or $12 per approved clip. A second workflow that costs
                $24 in software but only $24 in labor would be $9.60 at the same
                yield. Use incremental software cost when the editor is already
                budgeted for the master; use the full allocated share when
                deciding which tools to renew.
              </p>
              <p>
                Don’t extrapolate a one-recording result to the whole catalog.
                If an easy source pays for the tool but episodes with guest
                permissions, screen demos or poor audio consistently fail the
                delivery gate, separate those groups in the forecast. A lower
                average that depends on quietly dropping hard clips doesn’t help
                if those clips are the campaign deliverables.
              </p>
            </section>
            <section id="selecting-a-tool">
              <h2>When paying for both makes sense</h2>
              <p>
                Keep a single tool when it handles the stage where revision
                actually happens and gets your minimum approved output out the
                door. A writer-led team shipping one weekly episode and a few
                clips might be better served by a shared editable source and
                fewer handoffs. A separate social team receiving locked
                episodes, with enough approved short-form work to justify a new
                queue, is a more credible reason to consider adding a clipper.
              </p>
              <p>
                If you do buy both, give each a clear boundary. The full episode
                gets edited in the master project; the short has authority over
                only its derivative framing and timing. If one person regularly
                repairs the same credits, spellings and cuts twice, test a
                single-tool week before renewing. Budget for onboarding, saved
                templates, export permissions and who can still recover the
                project after a contractor leaves. These rarely show up in the
                public plan matrix but can decide which workflow you can
                maintain.
              </p>
              <p>
                Zybble is another option to evaluate if the deliverable is a
                batch of vertical MP4s rather than a full edit suite. Its
                documented workflow is AI highlight selection, speaker-focused
                framing and captions, with one-time non-expiring credits. Upload
                the exports where you publish; this is not a social scheduling
                recommendation. Check{" "}
                <Link href="/pricing">Zybble’s credit packs</Link> and compare a
                recurring subscription with your real source volume, not your
                busiest month.
              </p>
            </section>
          </div>
          <aside className={s.priceRail} aria-labelledby="plan-meters">
            <p className={s.kicker}>Plan desk · US USD</p>
            <h2 id="plan-meters">Read the meters before the prices</h2>
            <p>
              Public plans checked November 20, 2026. Listed prices can change;
              check billing interval, currency, tax and export entitlements
              before purchase.
            </p>
            <dl>
              <dt>OpusClip Starter</dt>
              <dd>
                <strong>$15/month</strong> · 150 monthly credits. For standard
                clip processing, OpusClip documents one credit per source
                minute, subject to its rounding and timeframe rules.
              </dd>
              <dt>Descript Hobbyist</dt>
              <dd>
                <strong>$24/person monthly</strong> or a $16/person monthly
                equivalent on annual billing. Public listing: 10 media hours and
                400 AI credits per month.
              </dd>
            </dl>
            <p>
              Four 48-minute exports are <strong>192 source minutes</strong>.
              That exceeds Starter’s 150 by 42 if you process every minute.
              Processing only a 30-minute approved segment from each would use
              120 credits under the documented standard meter. That saves
              allowance, not footage review: someone must already know which
              sections to process.
            </p>
            <p>
              The same four sources total <strong>3.2 hours</strong> against a
              10-hour Descript media allowance, before other imports and
              activity. That arithmetic does not tell you how many AI operations
              you can run. Track the AI meter separately, especially when
              clipping and cleanup are happening in the same account.
            </p>
            <p>
              If the clipper adds $15 and removes 45 minutes of review from the
              month, that’s a $20/hour break-even on those saved minutes alone.
              Substitute your own labor cost and add the cost of any extra
              handoff. This is a budgeting illustration, not a measured
              performance claim.
            </p>
            <p>
              <a href="https://www.opus.pro/pricing">OpusClip official plans</a>{" "}
              ·{" "}
              <a href="https://www.descript.com/pricing">
                Descript official plans
              </a>
            </p>
          </aside>
        </div>
        <References article={article} />
      </div>
    </article>
  );
}
