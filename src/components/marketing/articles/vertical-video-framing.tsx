import Link from "next/link";
import type { Article } from "@/types/content";
import { Byline, Cover, JournalLink, References } from "./primitives";
import s from "./editorial.module.css";

function CropDiagram({ mode }: { mode: "center" | "track" | "fit" }) {
  return (
    <svg className={s.cropDiagram} viewBox="0 0 256 144" aria-hidden="true">
      <rect width="256" height="144" rx="8" fill="#eae2ff" />
      <circle cx="51" cy="54" r="15" fill="#a274ed" />
      <path d="M23 106a28 28 0 0 1 56 0" fill="#a274ed" />
      <rect x="147" y="35" width="86" height="68" rx="6" fill="#d59acb" />
      <path
        d="M162 53h54m-54 15h49m-49 15h26"
        stroke="#713260"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {mode === "fit" ? (
        <>
          <rect width="256" height="144" rx="8" fill="#17182c" />
          <g transform="translate(88 49.5) scale(.3125)">
            <rect width="256" height="144" rx="8" fill="#eae2ff" />
            <circle cx="51" cy="54" r="15" fill="#a274ed" />
            <path d="M23 106a28 28 0 0 1 56 0" fill="#a274ed" />
            <rect x="147" y="35" width="86" height="68" rx="6" fill="#d59acb" />
          </g>
          <rect
            x="87.5"
            y="1.5"
            width="81"
            height="141"
            rx="5"
            fill="none"
            stroke="#bfabff"
            strokeWidth="3"
          />
        </>
      ) : (
        <rect
          x={mode === "track" ? 10.5 : 87.5}
          y="1.5"
          width="81"
          height="141"
          rx="5"
          fill="none"
          stroke="#6338f5"
          strokeWidth="3"
        />
      )}
    </svg>
  );
}

export function FramingFieldGuide({ article }: { article: Article }) {
  return (
    <article
      className={`${s.article} ${s.fieldGuide}`}
      data-editorial-view="framing-field-guide"
    >
      <header className={s.fieldHeader}>
        <div className="container">
          <JournalLink />
          <p className={s.kicker}>Editing field guide · 9:16 video</p>
          <h1>{article.title}</h1>
          <p className={s.deck}>{article.description}</p>
          <Byline article={article} />
        </div>
      </header>
      <div className="container">
        <section className={s.cropLab} aria-labelledby="three-frames">
          <h2 id="three-frames">Three frames. Three different trade-offs.</h2>
          <p>
            The example puts the speaker on the left and an important diagram on
            the right. The outlined box represents the portrait frame.
          </p>
          <div className={s.cropCards}>
            <figure>
              <CropDiagram mode="center" />
              <figcaption>
                <strong>Center crop</strong>
                <span>
                  Fills the portrait canvas but cuts away the off-center speaker
                  and much of the diagram.
                </span>
              </figcaption>
            </figure>
            <figure>
              <CropDiagram mode="track" />
              <figcaption>
                <strong>Speaker-focused crop</strong>
                <span>
                  Moves the crop to keep the speaker visible. The diagram is now
                  outside it.
                </span>
              </figcaption>
            </figure>
            <figure>
              <CropDiagram mode="fit" />
              <figcaption>
                <strong>Full-frame fit</strong>
                <span>
                  Keeps both subjects in a smaller landscape inset. Check
                  whether details survive the reduction.
                </span>
              </figcaption>
            </figure>
          </div>
        </section>
        <div className={s.framingIntro}>
          <div className={s.prose}>
            <h2>Decide what can be discarded before you crop</h2>
            <p>
              To turn 16:9 into 9:16, you can crop the landscape source to fill
              a portrait project, fit the whole source inside the project, or
              rebuild a layout from separate pieces. None of those choices makes
              missing details visible by itself. Start by naming what the viewer
              must see at the moment the audio refers to it. The answer could be
              a face, a raised eyebrow, a mouse pointer, or the cells used to
              prove a claim. If the crop removes that information, it has failed
              even if it looks like an intentional shot.
            </p>
            <p>
              Use a stable center crop when the subject is centered and stays
              there. If they are consistently off-center, try a fixed offset
              before adding motion. Speaker tracking is useful when the target
              moves or the person speaking changes, but it can select the wrong
              person or hide the other half of a scene. Full-frame fit is useful
              when several parts of the source matter at once. If the original
              is text-heavy, use fit for orientation, then punch in where the
              detail is needed. Treat each shot independently; a single clip can
              need several of these decisions.
            </p>
          </div>
          <aside className={s.cropMath}>
            <p className={s.kicker}>Crop arithmetic</p>
            <strong>31.64%</strong>
            <p>
              of the original width remains when a 9:16 crop takes the full
              height of a 16:9 image: (9 ÷ 16) ÷ (16 ÷ 9) = 81 ÷ 256. From a
              1920 × 1080 source, that’s about 608 × 1080 source pixels before
              scaling to 1080 × 1920. Export dimensions are not the same as
              captured detail.
            </p>
            <p>
              Fitting the whole 1920 × 1080 shot to a 1080-pixel-wide portrait
              canvas makes it about 608 pixels tall. You gain context but keep
              less detail on screen at once.
            </p>
          </aside>
        </div>
        <section className={s.shotbook} aria-labelledby="shotbook">
          <h2 id="shotbook">A shotbook for four difficult sources</h2>
          <div className={s.shots}>
            <section>
              <span aria-hidden="true">01</span>
              <h3>Single speaker with a prop</h3>
              <p>
                Open with a stable crop that leaves breathing room in the
                direction of the speaker’s gaze. When they hold up a phone,
                keyframe a short move only if the phone and face need to be seen
                together. Otherwise, cut to the prop. Suppose a chef holds a lid
                beside their face and points to a pressure indicator: the cut to
                the indicator must come before “wait until this drops,” not
                after. A jumping crop that eventually arrives at the lid is
                still late.
              </p>
              <p>
                Scrub the gesture and check whether fingertips or edges
                disappear. If the room is already soft or noisy, don’t chase a
                tight fill just to eliminate bars. A controlled medium frame or
                a separately captured insert can show more useful detail.
              </p>
            </section>
            <section>
              <span aria-hidden="true">02</span>
              <h3>Two speakers on one camera</h3>
              <p>
                Don’t pan back and forth on every acknowledgment. Hold the
                questioner long enough to establish the question, then choose a
                clean cut to the answer or keep both speakers for a meaningful
                exchange. A laugh, a silent reaction or a handoff of an object
                may matter more than whichever microphone is loudest. Use a
                stacked layout only if you can isolate both faces without making
                either slice too small; preserve eyelines and make it obvious
                who owns the words.
              </p>
              <p>
                If you’re editing from separate camera feeds, try switching on
                completed thoughts rather than every change in speaker activity.
                With only a baked two-shot, use a fit or static crop when they
                interrupt one another and the relationship between their
                expressions matters. Start with a{" "}
                <Link href="/blog/podcast-clips">
                  context-complete podcast excerpt
                </Link>
                ; framing cannot reintroduce a question you left out.
              </p>
            </section>
            <section>
              <span aria-hidden="true">03</span>
              <h3>Screen recording with a small talking head</h3>
              <p>
                Prioritize the cursor path and the actual control. Start with
                the full interface for orientation, then crop in on the menu
                being opened or rebuild the tutorial as a few closeups. In an
                example showing an “Archive” option, preserve the menu title and
                the selected option together. A zoom into a pointer with no
                surrounding menu helps nobody repeat the action. Freeze one
                frame before the click to see whether there is time to read the
                target.
              </p>
              <p>
                Move or remove the webcam tile if it competes with the control.
                If the video was captured at low resolution, a fresh
                portrait-friendly recording can be more readable than repeatedly
                upscaling the old one. Place captions independently of the
                webcam badge, and confirm that popovers and cursor tooltips
                don’t appear beneath the caption band.
              </p>
            </section>
            <section>
              <span aria-hidden="true">04</span>
              <h3>Webinar with a chart or slide deck</h3>
              <p>
                Find the slide explaining the claim, not just the slide that
                appeared when the speaker made it. In an example comparing last
                quarter’s orders by market, a crop that leaves the bars but
                drops the labels may imply the wrong market performed best.
                Start with the whole chart, then show a larger region while the
                speaker names it. Keep the units, comparison period and baseline
                visible when they affect interpretation. If a slide contains
                audience or customer details, treat it as separately reviewable
                even if the long recording was cleared for its original venue.
              </p>
              <p>
                Where the slide is dense, use a rebuilt chart or annotated still
                if you have the rights and can verify the labels. Preserve the
                source values and mark explanatory additions. If the numbers
                won’t fit legibly, pick a different excerpt rather than
                attaching a glossy background to an unreadable slide.
              </p>
            </section>
          </div>
        </section>
        <section className={s.prose} aria-labelledby="framing-timeline">
          <h2 id="framing-timeline">
            Storyboard the first pass before adding keyframes
          </h2>
          <p>
            Take an illustrative 24-second remote interview. At 0–5 seconds, the
            guest introduces a worksheet; use a fixed portrait crop that
            includes their face. At 5–9 seconds, they say “the next column is
            the one to watch” while sharing a wide screen. Switch to an overview
            with the guest inset only if the guest is still useful. At 9–18
            seconds, use a close view of the two adjacent columns, keeping their
            headings. At 18–24 seconds, return to the guest for the
            recommendation. The point is to time changes to the evidence the
            viewer needs, not to make every shot move.
          </p>
          <p>
            Duplicate your edit or use a separate portrait sequence so the
            landscape master remains intact. Mark the beats where faces or
            details need to change size and place the caption band before
            reviewing motion. Establish each shot’s position and scale at its
            start, then scrub to its widest gesture or densest frame. For
            deliberate pans, set a hold at both ends if the editor supports it,
            so the shot settles before the viewer has to read or identify the
            object. For hard camera cuts, don’t interpolate a crop move across
            the boundary unless you want it to behave like a pan.
          </p>
          <p>
            When something looks off, diagnose the kind of failure. A face
            clipped at the same point throughout a shot calls for a fixed
            position change or a wider composition. A face that disappears only
            on gestures calls for a change in framing around that beat. A zoom
            jumping aimlessly between two faces calls for a stable shot or
            manual switch, not faster tracking. A chart too small at every point
            calls for a different layout or source, not a sharper export preset.
          </p>
          <p>
            Keep the source range and crop decision with the export. A note such
            as “00:09–00:18: worksheet columns B and C, no upper caption band”
            helps the next editor understand why a different-looking revision
            could be worse. When you revise the crop after a shift in timing,
            recheck the affected caption cues and review the new export against
            the master. The original reviewer may have approved the argument,
            not every future framing of it.
          </p>
        </section>
        <section className={s.frameReview} aria-labelledby="frame-review">
          <Cover article={article} sizes="(min-width: 900px) 40vw, 92vw" />
          <div className={s.prose}>
            <h2 id="frame-review">
              Inspect the boundaries, not just the thumbnail
            </h2>
            <p>
              Review the opening frame, the moment of maximum movement or
              overlap, and the point where the viewer needs proof. Then watch
              the whole export. Ask someone who hasn’t seen the master what they
              thought the speaker was pointing at. If they can follow the
              sentence but can’t identify its evidence, choose a different crop
              or layout.
            </p>
            <p>
              Check the delivery surface at phone size for control and caption
              overlap. Our{" "}
              <Link href="/blog/short-video-captions">
                caption placement and playback checks
              </Link>{" "}
              show how to test for collisions. If you’re delivering to YouTube,
              read the platform’s{" "}
              <a href="https://support.google.com/youtube/answer/15424877?hl=en">
                current Shorts eligibility and copyright guidance
              </a>
              ; portrait framing and eligibility are different questions.
            </p>
            <p>
              <a href="https://helpx.adobe.com/premiere/desktop/add-video-effects/commonly-used-effects/add-auto-reframe-effect-to-a-sequence.html">
                Adobe’s Auto Reframe guide
              </a>{" "}
              describes working on a duplicated sequence and adjusting the
              effect when motion needs attention.{" "}
              <a href="https://www.opus.pro/tools/vertical-video-maker">
                OpusClip’s reframing overview
              </a>{" "}
              describes speaker and object tracking. For a generated clip with
              speaker-focused framing and captions, see{" "}
              <Link href="/features">Zybble’s video features</Link>. In each
              case, inspect the result against the original claim before
              publishing.
            </p>
          </div>
        </section>
        <References article={article} />
      </div>
    </article>
  );
}
