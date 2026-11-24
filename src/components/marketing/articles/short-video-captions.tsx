import Link from "next/link";
import type { Article } from "@/types/content";
import { Byline, Cover, JournalLink, References } from "./primitives";
import s from "./editorial.module.css";

export function CaptionClinic({ article }: { article: Article }) {
  return (
    <article
      className={`${s.article} ${s.clinic}`}
      data-editorial-view="timing-clinic"
    >
      <header className={s.clinicHeader}>
        <div className="container">
          <JournalLink />
          <p className={s.kicker}>Accessibility clinic · Short-form video</p>
          <h1>{article.title}</h1>
          <p className={s.deck}>{article.description}</p>
          <Byline article={article} />
        </div>
      </header>
      <div className="container">
        <figure className={s.timing} aria-labelledby="timing-example">
          <div className={s.timingMain}>
            <p className={s.kicker}>Illustrative edit · 3 seconds</p>
            <h2 id="timing-example">
              The caption says the opposite of the speaker
            </h2>
            <div className={s.badCue}>
              <span>Raw · 00:00–00:03</span>
              <p>“We did export at 60 FPS.”</p>
            </div>
            <ol aria-label="Corrected caption cues">
              <li>
                <span>00:00.00–00:01.50</span>
                <p>We didn’t export</p>
              </li>
              <li>
                <span>00:01.50–00:03.00</span>
                <p>at 16 frames per second.</p>
              </li>
            </ol>
          </div>
          <figcaption>
            Fix meaning before timing or styling. This invented example changes
            a negation and a number, then separates cues at a spoken pause. The
            phrase break and cue boundaries must follow the actual audio.
          </figcaption>
        </figure>
        <div className={s.clinicGrid}>
          <nav aria-label="On this page" className={s.sectionNav}>
            <p className={s.kicker}>The clinic</p>
            <ol>
              <li>
                <a href="#caption-track">Choose the track</a>
              </li>
              <li>
                <a href="#caption-pass">Correct and time</a>
              </li>
              <li>
                <a href="#caption-placement">Design for the phone</a>
              </li>
              <li>
                <a href="#caption-handoff">Hand off approved text</a>
              </li>
              <li>
                <a href="#caption-delivery">Check the upload</a>
              </li>
            </ol>
          </nav>
          <div className={s.prose}>
            <section id="caption-track">
              <h2>Choose the caption deliverable before you edit</h2>
              <p>
                Captions carry speech and meaningful sound information in sync
                with the video. In this guide, “open” means the captions are
                visible on the picture itself, and “closed” means the player
                displays a separate caption track that viewers can toggle. An
                SRT or WebVTT is a timed text file, not a video export; a
                transcript on a web page is useful for other reasons, but it
                doesn’t tell the viewer when a line was spoken. See the{" "}
                <a href="https://www.w3.org/WAI/media/av/captions/">
                  W3C guide to captions
                </a>{" "}
                for the accessibility distinctions and examples.
              </p>
              <p>
                For many teams, the cleanest handoff is a clean MP4, an approved
                timed track where supported, and a separate open-caption render
                only where needed. Confirm whether the publisher can upload a
                file in their specific publishing surface, account and app
                version. If a destination applies its own captions over yours,
                check the replay before publishing: two simultaneous text bands
                can make both unreadable. If a network only offers an editable
                auto-caption track for your upload path, budget to proof that
                track against the approved wording instead.
              </p>
              <p>
                Decide your localization needs at the same time. An existing
                timed master can guide translations, but a translation may need
                different cue breaks to read naturally. Have someone check the
                rendered translation against the scene rather than preserving
                English line breaks regardless of language. Keep stylized
                headline overlays separate from captions, so an editor can
                revise promotion without reopening accessibility copy or timing
                again. Keep the approved punctuation in the timed master.
              </p>
            </section>
            <section id="caption-pass">
              <h2>Correct the transcript, then cut and time the cues</h2>
              <p>
                Generate an initial transcript from the current edit. Pause
                where a correction would change what the audience believes: a
                negation, name, unit, decimal, time, attribution, or word like
                “until.” Use the source recording and a verified spelling sheet,
                not an autocomplete guess. In the example above, “did” versus
                “didn’t” flips the claim, and 60 versus 16 points the audience
                at a different setting. A highlighted error is still an error.
              </p>
              <h3>Keep context and speech where they belong</h3>
              <p>
                Narrative editing and caption editing are separate jobs. If a
                speaker qualifies a rule after a pause, keep that audio in the
                clip when it’s necessary to the meaning. Do not add a missing
                qualification as if it had been spoken. Identify an off-screen
                speaker when it would be unclear who is talking, and label a
                meaningful sound when the viewer needs it to understand the
                sequence. For example, if the host says “wait for that,” the
                caption <em>[timer beeps]</em> explains the next action. A
                constant music label is not automatically more helpful than a
                targeted cue.
              </p>
              <h3>Read the cue as a phrase, not as a string of characters</h3>
              <p>
                Start cues around their spoken phrase and keep them visible long
                enough to read at playback speed. Where a long cue forces the
                viewer to hold half a sentence in memory, break where the
                thought turns or at a natural pause. Avoid separating a name,
                negation and verb, or number and unit across lines where
                possible. Watch for cue boundaries that cross a hard cut or move
                a punchline earlier than the audio. The{" "}
                <a href="https://www.bbc.co.uk/accessibility/forproducts/guides/subtitles/">
                  BBC’s subtitle guidelines
                </a>{" "}
                give examples of timing and presentation tradeoffs; broadcast
                recommendations are not universal social-media requirements.
              </p>
              <p>
                When the editor removes a second from the opening, assume every
                downstream cue may now need review, even if the words have not
                changed. Sync to the rendered file or update the timing track in
                the same timeline as the cut. If cues get progressively later,
                check that the track and video describe the same export rather
                than dragging the entire track by a fixed offset. Recheck the
                beginning, middle and very last cue before export, then play the
                full piece.
              </p>
              <p>
                For dialogue, one cue may contain a question and its answer even
                though the speaker changes midway. If the faces aren’t both
                visible, separate the turns or use a speaker label. In a
                demonstration, check that a cue like “choose Advanced” doesn’t
                arrive before the menu opens or later than the cursor movement
                that gives it meaning. If a cue can’t be read before the next
                action, lengthen or simplify the edit rather than asking the
                viewer to read faster.
              </p>
            </section>
            <section id="caption-placement">
              <h2>Design placement around the thing people must see</h2>
              <p>
                Start with a typeface that stays recognizable at phone size.
                Keep robust contrast over the brightest and darkest backgrounds;
                if a subtle shadow fails, use a solid or translucent backing.
                Start with stable phrase-level text and introduce animated
                emphasis only if it preserves legibility. Rapid word-by-word
                styling can hide the rest of a phrase and make catching up
                difficult. Don’t convey identification or emphasis only through
                color.
              </p>
              <p>
                Reserve a consistent reading zone. Look for conflicts with eyes,
                hands, on-screen labels, chat bubbles, a cursor, and the
                platform’s controls and description. The correct position can
                differ by clip: the lower third may be clear on a talking head
                but critical in a tutorial where the cursor is confirming
                “Save.” Move the band for a whole shot if necessary, not for
                every moving word. Plan that band when choosing{" "}
                <Link href="/blog/vertical-video-framing">
                  how to frame the vertical clip
                </Link>
                , so you’re not trading away the face or the visual evidence
                after the edit is locked.
              </p>
              <p>
                One practical check: pick the longest cue, the brightest
                background and the point where an important onscreen label
                appears. Freeze each rendered frame on a phone. If you need to
                zoom in to read either the caption or the label, revise the
                layout. Then play without stopping; a caption that looks fine in
                a still may flash too briefly during normal playback.
              </p>
              <p>
                Export tests should include at least one small phone viewport
                and every platform you plan to publish to. A template’s
                safe-area overlay is a starting point, not a guarantee: check
                the actual viewing surfaces available to you. Don’t put critical
                caption information in the description just to make it fit on
                the frame. Some viewers will see the video before they open that
                text.
              </p>
            </section>
            <section id="caption-handoff">
              <h2>Make the approved text easy to recover</h2>
              <p>
                Give the editor and the reviewer a simple correction format: cue
                time, words as shown, replacement, and reason. For the example
                at the top, the reason is “wrong negation and frame rate,” not
                “change copy.” Keep routine capitalization changes separate from
                errors that change meaning. If there is a dispute, the source
                audio is the authority for what was spoken; if the speech itself
                is wrong, resolve that with an editorial cut or a clearly
                labeled correction, not a silent rewrite of the caption.
              </p>
              <p>
                For example, imagine a captioned screen tutorial going out as a
                webinar replay excerpt and a Reel. The replay can use a clean
                render and a selectable track; for the Reel, the publisher first
                checks their actual upload path for native captions. If the
                publisher needs an open-caption copy, render it from the same
                approved timed text. Ask them to watch where the app places
                buttons on the right and its description at the bottom, and save
                a phone screenshot of any collision with the cue time. That
                report is more actionable than “captions too low.”
              </p>
              <p>
                When you’re editing a batch, reuse style settings but audit each
                clip’s first cue and last cue individually. A missing opening
                sound can spoil identification, and a final call to action can
                appear over a caption that was still readable in the edit
                timeline. If the two compete, move the call to action or extend
                the edit. Don’t make the person who needs captions choose which
                text to read.
              </p>
            </section>
            <section id="caption-delivery">
              <h2>Check the exact version viewers will play</h2>
              <p>
                Use matching names for the clean video and timed track, such as{" "}
                <code>demo-r03.mp4</code> and <code>demo-r03.en.srt</code>. If
                there’s also a burned-in file, give it a visible suffix. In{" "}
                <a href="https://support.google.com/youtube/answer/2734796?hl=en">
                  YouTube Studio’s subtitle workflow
                </a>
                , select the correct video and language, then upload the timed
                file using the appropriate upload option and verify timing and
                playback. Other destinations may need native editing or an
                open-caption render. Do not assume that the same subtitle
                controls in a mobile app exist for a desktop or scheduler
                upload.
              </p>
              <div className={s.releaseChecks}>
                <h3>Two-pass release check</h3>
                <ol>
                  <li>
                    <strong>Sound off:</strong> Can I follow the point, tell who
                    is speaking and understand the relevant sounds? Can I read
                    every cue with the app interface visible?
                  </li>
                  <li>
                    <strong>Sound on:</strong> Do the wording, speaker changes,
                    numbers and timing match the final cut? Did this upload
                    introduce a second caption layer?
                  </li>
                </ol>
              </div>
              <p>
                Keep the reviewed text file with the master, the publishing
                target and the name of the approver. If the track is changed
                natively in a social app, note the correction in your working
                file before republishing elsewhere. Editors who routinely handle
                dialogue can pair this process with our{" "}
                <Link href="/blog/podcast-clips">
                  podcast clip selection guide
                </Link>
                . For a starting draft on vertical clips, see{" "}
                <Link href="/features">Zybble’s AI caption workflow</Link>; the
                release check still belongs to the editor.
              </p>
            </section>
            <References article={article} />
          </div>
          <aside className={s.clinicIllustration}>
            <Cover article={article} sizes="(min-width: 1000px) 24vw, 84vw" />
            <p>
              Check timing and placement together on the delivered frame, not
              just in a transcript.
            </p>
          </aside>
        </div>
      </div>
    </article>
  );
}
