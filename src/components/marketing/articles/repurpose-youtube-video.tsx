import Link from "next/link";
import type { Article } from "@/types/content";
import { Byline, Cover, JournalLink, References } from "./primitives";
import s from "./editorial.module.css";

export function YouTubeProductionGuide({ article }: { article: Article }) {
  return (
    <article
      className={`${s.article} ${s.production}`}
      data-editorial-view="production-bench"
    >
      <header className="container">
        <JournalLink />
        <p className={s.kicker}>Production bench · Source to export</p>
        <h1>{article.title}</h1>
        <p className={s.deck}>{article.description}</p>
        <Byline article={article} />
        <Cover article={article} sizes="(min-width: 1280px) 1200px, 92vw" />
      </header>
      <div className={`container ${s.productionBody}`}>
        <nav className={s.productionNav} aria-label="Production steps">
          <a href="#source">01 · Source</a>
          <a href="#timeline">02 · Timeline</a>
          <a href="#deliverables">03 · Deliverables</a>
          <a href="#render">04 · Render</a>
          <a href="#release">05 · Release</a>
        </nav>
        <div className={s.prose}>
          <section id="source">
            <h2>01. Recover a source worth editing</h2>
            <p>
              Start with your approved edit project or the highest-quality clean
              master you have permission to use. A published YouTube video is
              often the easiest reference, not the best source: it may contain
              baked titles, a channel outro, music mixed over dialogue, or a
              screen capture smaller than its original feed. Keep the published
              video ID and timestamp for reference, but cut from the approved
              project, original camera files, slide deck or clean stems when
              they’re available.
            </p>
            <p>
              If only your own upload remains,{" "}
              <a href="https://support.google.com/youtube/answer/56100?hl=en">
                YouTube’s download instructions
              </a>{" "}
              point to Studio → Content → the video menu → Download. YouTube
              says the MP4 may be 720p or 360p depending on the video. That is a
              fallback, not the same as recovering the high-resolution local
              source. Inspect what you got before planning a tight punch-in. If
              you cannot download the upload, ask the owner for an authorized
              copy rather than extracting someone else’s video.
            </p>
            <p>
              Inventory the footage and the clearances together. A guest release
              for the original program may not cover paid advertising; a music
              license for YouTube may not cover an export posted elsewhere.
              Review stock, slide graphics, customer information and sponsor
              disclosures. If a blur or correction was applied to the live
              upload after publication, reproduce it in your editable source.
              The clean master is not necessarily the cleared master.
            </p>
          </section>
          <section id="timeline">
            <h2>02. Build the edit around one complete point</h2>
            <p>
              Imagine you made a 26-minute landscape walkthrough of a monthly
              budget spreadsheet. At 08:20 the host enters annual insurance,
              divides by twelve, and then marks the resulting number as a saving
              target rather than a recurring bill. Pull the few seconds with the
              formula alone and viewers may mistake it for either a bank payment
              or a spending cut. Choose source ranges by what the edit must
              prove; for this example, preserve the formula, the meaning of the
              result, and a visible example.
            </p>
            <p>
              Make a small timeline log: source version and range, first
              intelligible sentence, visual evidence, audio edits, and end
              point. If the original opening is “like we saw earlier,” replace
              it with a fresh introduction or start on the complete example.
              Label a newly recorded voiceover in the edit notes so a reviewer
              can distinguish it from a quotation. Leave enough room at each end
              for a comfortable audio cut and a natural final cue. Identify any
              spot where a spoken number and screen value diverge before
              assembling variations.
            </p>
            <p>
              Lock a content edit before branching for layout. You may need to
              shorten or re-record bridging narration in the portrait cut, but
              don’t make each aspect ratio a free rewrite. Give each variant its
              own timeline and keep the source range and approval rules visible.
              If an underlying number is corrected later, you can find exactly
              which variants need new exports.
            </p>
          </section>
          <section id="deliverables">
            <h2>03. Cut each deliverable for its viewing surface</h2>
            <div className={s.productionRecipes}>
              <section>
                <h3>Portrait short · One demonstration</h3>
                <p>
                  On a 9:16 canvas, open with the number and its meaning, then
                  show a close-up containing both the formula and the cell
                  label. Introduce the speaker only where their face helps. Plan
                  the crop and caption band together; on this shot, the default
                  lower-third might cover the resulting monthly figure. See the{" "}
                  <Link href="/blog/vertical-video-framing">
                    portrait framing field guide
                  </Link>{" "}
                  for speaker, center and full-frame choices.
                </p>
              </section>
              <section>
                <h3>Landscape excerpt · More context</h3>
                <p>
                  Use 16:9 for a wider walkthrough where the value from the
                  first tab flows into a second tab. Preserve the relationship
                  with edit points and clear labels, not a tiny portrait file
                  scaled up and padded. Include the source assumptions next to
                  the calculation. If possible, render a clean copy for
                  embedding so the site can use its own player captions and
                  playback controls.
                </p>
              </section>
              <section>
                <h3>Square or feed cut · One comparison</h3>
                <p>
                  Put last year’s example and this year’s example on separate
                  beats rather than squeezing the whole spreadsheet into a
                  square. Reposition text and re-time cues after changes. Use
                  square only if the intended surface and editorial choice
                  warrant it; don’t declare a specific shape mandatory for every
                  feed. Choose the few deliverables you can actually verify.
                </p>
              </section>
            </div>
            <p>
              A viewer who wants to know what to publish next doesn’t need four
              ratios of one edit. Use the companion{" "}
              <Link href="/blog/youtube-video-twenty-posts">
                20-post publishing plan
              </Link>{" "}
              to decide which different ideas deserve separate pieces. If you
              only need the portrait video,{" "}
              <Link href="/features">Zybble’s AI clip workflow</Link> can
              propose excerpts, add captions and produce 9:16 MP4s. Upload the
              chosen exports yourself and independently verify the frames and
              claims.
            </p>
          </section>
          <figure className={s.productionLog}>
            <figcaption>
              <strong>Example handoff:</strong> same source, three cut decisions
            </figcaption>
            <dl>
              <dt>Source reference</dt>
              <dd>
                Budget master r04, 08:20–09:12. The creator enters an
                illustrative annual bill of 600, divides by twelve, and marks 50
                as a monthly saving target. The currency and input are examples,
                not advice about what people should spend.
              </dd>
              <dt>Portrait r02</dt>
              <dd>
                Show the monthly target cell before leaving the formula. Crop
                from the full-resolution screen master so the “monthly reserve”
                label is legible. End after the qualification that no payment is
                being made in the demo.
              </dd>
              <dt>Landscape r01</dt>
              <dd>
                Keep the adjacent year-total column and the next worksheet open.
                If you cut out the switch between tabs, add a brief transition
                line to explain why the value reappears in a new place.
              </dd>
              <dt>Square r02</dt>
              <dd>
                Use before/after views in sequence. Place the units inside the
                main image on both views and use the title to signal that you
                are comparing yearly and monthly numbers, not costs for two
                customers.
              </dd>
            </dl>
          </figure>
          <section id="render">
            <h2>
              04. Export from the clean timeline, not another social upload
            </h2>
            <p>
              Use the destination’s current upload guidance. For your own editor
              preset, a progressive H.264 MP4 with AAC audio and a frame rate
              matching the finished source is a practical default; check{" "}
              <a href="https://support.google.com/youtube/answer/1722171?hl=en">
                YouTube’s encoding recommendations
              </a>{" "}
              for its detailed settings. An example might be 1080 × 1920 at 30
              fps from a 30 fps portrait sequence when the source supports it. A
              1080 export label cannot restore text softened in a 360p download.
              If you need a low-resolution reference for approvals, produce it
              alongside, not in place of, the final.
            </p>
            <p>
              Watch for a silent or doubled audio track. For example, when you
              sync a clean mic recording with a camera file, the camera’s
              scratch track may still be active under the voice and make it
              sound hollow. Mute the scratch layer when it’s not needed. Check
              lip sync near the beginning and end as well as at cut points. In
              the example, if a clean music bed is unavailable or the license
              doesn’t cover the destination, render with the dialogue track and
              a cleared replacement or no music.
            </p>
            <p>
              Keep a clean render and, where supported, an approved timed
              caption file. If you need an open-caption version, render it
              separately and tag it accordingly. The{" "}
              <Link href="/blog/short-video-captions">
                short-video caption clinic
              </Link>{" "}
              covers versioning and phone checks. Never apply a timed track made
              for a 45-second cut to the 35-second edit without retiming. For
              the spreadsheet example, verify that “per month” and “per year”
              are both correct and stay visible as the screen changes.
            </p>
            <p>
              When an export looks stretched, verify that you cropped or fitted
              the source rather than scaling each axis separately. When a
              recording looks blurry only in the first few minutes after upload,
              wait for the expected processed version before judging final
              playback; if the local file is also blurry, zoom out, use the
              original screen recording, or recreate the view. When playback
              crops important edges, check both the file’s dimensions and the
              destination’s actual display. Render settings alone can’t diagnose
              a preview layout.
            </p>
          </section>
          <section id="release">
            <h2>05. Verify the upload and file the evidence</h2>
            <p>
              Check the actual uploaded asset, not just the export thumbnail. A
              square or vertical video up to three minutes can qualify as a
              Short on eligible uploads;{" "}
              <a href="https://support.google.com/youtube/answer/15424877?hl=en">
                YouTube’s current Shorts guidance
              </a>{" "}
              has separate upload dates for standard and Official Artist
              Channels and says a Short longer than one minute with an active
              copyright claim is blocked. Check those rules before choosing your
              soundtrack and duration. A 9:16 file is a shape, not a publishing
              guarantee.
            </p>
            <p>
              Before making it public, confirm the right version, language,
              sequence, sound, caption mode, title, and disclosure. In a narrow
              player, read the on-screen number without opening the description.
              If the proof is obscured, fix the video; “full details in the
              original” is not a substitute. For a replacement upload, check
              whether the older derivative or scheduled posts still point to the
              wrong file. Then archive the edited sequence, approved caption
              file, clearance note and destination URL together. Give the next
              editor both the approved upload and clean master names. If a
              license is limited by platform or date, record the restriction in
              the same handoff rather than making a future editor infer it from
              the filename. That record is what makes a future crop or
              correction routine.
            </p>
          </section>
          <References article={article} />
        </div>
      </div>
    </article>
  );
}
