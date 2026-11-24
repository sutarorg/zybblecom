import Link from "next/link";
import type { Article } from "@/types/content";
import { Byline, Cover, JournalLink, References } from "./primitives";
import s from "./editorial.module.css";

const collection = [
  {
    name: "Show the difference",
    channel: "Video",
    posts: [
      [
        "Reveal Short",
        "Show the final wide video from the desk, then the cluttered starting frame. Keep both camera angles comparable. Let the viewer identify which change removed the worst distraction before naming it.",
      ],
      [
        "Glare fix Reel",
        "Use the window reflection at 04:10. Cut between the same monitor before and after turning the desk. Name the trade-off: the preferred mic position may shift too.",
      ],
      [
        "Two audio takes",
        "Let the viewer hear the same sentence with and without the soft furnishings in the example. Keep playback levels comparable and tell them which room setup each take represents.",
      ],
      [
        "Cable route walkthrough",
        "Trace the power cable from desk to wall in one short overhead video. Show the actual route adopted in the example rather than treating a tidy desk still as evidence of safe installation.",
      ],
      [
        "Teardown time-lapse",
        "Show how the shared room is returned to work mode. Add a clock or labels where relevant so a sped-up recording doesn’t imply the transition took seconds.",
      ],
    ],
  },
  {
    name: "Give the viewer a tool",
    channel: "Visual and downloadable",
    posts: [
      [
        "Rental-room carousel",
        "Start with a no-drill constraint. Lay out the baseline, the freestanding mount, the reversible arrangement and the final frame. End with a test someone can do without buying a mount.",
      ],
      [
        "Desk clearance diagram",
        "Redraw the overhead plan with room to pull a chair back. Mark the exact tutorial dimensions as an example, then ask readers to measure the space they actually use.",
      ],
      [
        "Annotated failure still",
        "Mark the microphone stand, window and bright object that compete with the speaker in the original frame. Add the diagnosis as post text as well as marks on the image.",
      ],
      [
        "One-page packing checklist",
        "Create a phone-sized checklist for switching back to a work desk: remove storage hazards, replace fixtures, confirm port access and store loose gear in a labeled container.",
      ],
      [
        "Lighting comparison sheet",
        "Show a pair of crops from the overhead light on/off test, and label which input changed. Include the lighting that stayed on, so the example doesn’t imply the room was shot in darkness.",
      ],
    ],
  },
  {
    name: "Explain a decision",
    channel: "Text and audio",
    posts: [
      [
        "LinkedIn purchase decision",
        "Write about the mount that was almost bought. Compare the problem it would solve against what borrowing a stand revealed. A useful takeaway is a decision criterion, not a gear-link list.",
      ],
      [
        "Newsletter lesson",
        "Explain why changing the room layout made a bigger difference for this creator than replacing the camera. Include the counterexample: layout can’t fix a camera that can’t focus on the subject.",
      ],
      [
        "Written window-position tutorial",
        "Write a standalone test with a starting camera position, three moved positions and instructions for comparing the frames. Point to the source chapter as evidence rather than using the transcript as the article.",
      ],
      [
        "Audio field note",
        "Record a new short audio introduction for a segment about soft surfaces and reflections. Describe the room and sequence for listeners who can’t see the test; play the relevant unaltered sample if it is cleared.",
      ],
      [
        "Short text unpacking the budget",
        "List items already owned, items borrowed and cash actually spent. Explain that another creator starting without those items would have a different budget, even if the finished room looks the same.",
      ],
    ],
  },
  {
    name: "Make room for answers",
    channel: "Community and follow-up",
    posts: [
      [
        "Room-constraint poll",
        "Ask which restriction is binding: daylight, floor space, landlord rules or noise. Each answer informs a different follow-up demonstration; don’t ask whether viewers liked the video.",
      ],
      [
        "Frame diagnosis quiz",
        "Show the failed framing and ask which adjustment is most likely to make the speaker clearer in that frame. Supply an explanation, not just the answer, and distinguish this case from a universal rule.",
      ],
      [
        "Desk photo prompt",
        "Invite viewers to describe their layout in words or share a rights-cleared photo with private details removed. Ask for the single corner they can move, then group answers by constraint.",
      ],
      [
        "What we didn’t solve post",
        "Name the issue left out of the tutorial: intermittent street noise. Say how the sample was recorded, what the footage cannot prove, and what future recording would answer the open question.",
      ],
      [
        "Reply roundup",
        "Publish two recurring questions and your answers after the earlier community posts. If replies are too sparse, answer known questions from the original comments and say where they came from; never invent audience questions.",
      ],
    ],
  },
];

export function YouTubeEditorialSlate({ article }: { article: Article }) {
  return (
    <article
      className={`${s.article} ${s.slate}`}
      data-editorial-view="editorial-slate"
    >
      <header className={`container ${s.slateHero}`}>
        <div>
          <JournalLink />
          <p className={s.kicker}>Creator playbook · Editorial planning</p>
          <h1>{article.title}</h1>
          <p className={s.deck}>{article.description}</p>
          <Byline article={article} />
        </div>
        <figure>
          <Cover article={article} sizes="(min-width: 1000px) 42vw, 92vw" />
          <figcaption>
            One worked example, twenty separate reasons to publish.
          </figcaption>
        </figure>
      </header>
      <div className="container">
        <div className={s.slateLead}>
          <div className={s.prose}>
            <h2>Start with one source worth revisiting</h2>
            <p>
              Imagine a 22-minute video called “Build a video corner in a shared
              room.” It shows a starting frame, moves the desk, tests audio, and
              ends with a quick reset of the room. The room, materials and
              timestamps here are illustrative. A viewer who sees only the cable
              walkthrough should learn a different thing from one who sees the
              glare fix. One clip mirrored on three networks is still one idea,
              and the subject line of a newsletter is not another post.
            </p>
            <p>
              Pick a source with several kinds of evidence: a visible change, an
              explanation that can stand alone, a comparison with enough
              context, and at least one unresolved question. Label each moment
              by what it can support. Take stills from the authorized source or
              redraw the relevant scene. Confirm any quotes with the recording.
              If there are only six defensible stories in the source, ship six
              rather than stretching one tip across twenty interchangeable
              graphics.
            </p>
          </div>
          <aside className={s.cropMath}>
            <p className={s.kicker}>Source log · Illustrative</p>
            <ul>
              <li>
                <strong>00:40:</strong> baseline frame and clutter
              </li>
              <li>
                <strong>04:10:</strong> glare and desk orientation
              </li>
              <li>
                <strong>08:25:</strong> audio test
              </li>
              <li>
                <strong>13:15:</strong> floor plan and cables
              </li>
              <li>
                <strong>19:40:</strong> tear down and reset
              </li>
            </ul>
          </aside>
        </div>
        <div className={s.slateCollection}>
          {collection.map(({ name, channel, posts }, group) => (
            <section key={name} aria-labelledby={`slate-${group}`}>
              <header>
                <p className={s.kicker}>{channel}</p>
                <h2 id={`slate-${group}`}>{name}</h2>
              </header>
              <ol start={group * 5 + 1}>
                {posts.map(([title, text]) => (
                  <li key={title} className={s.slateCard}>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
        <section className={s.slatePlan} aria-labelledby="slate-plan">
          <h2 id="slate-plan">
            Plan four weeks, then cut the queue if the evidence is thin
          </h2>
          <div className={s.slateWeeks}>
            <div>
              <h3>Week 1 · Establish the problem</h3>
              <p>
                Lead with the reveal Short (1), glare fix (2), rental carousel
                (6), purchase decision (11) and poll (16). Favor channels you
                already use. A split between YouTube, LinkedIn and email is
                enough; the post descriptions are suggestions, not a mandate to
                open accounts.
              </p>
            </div>
            <div>
              <h3>Week 2 · Help viewers try it</h3>
              <p>
                Schedule the audio takes (3), desk diagram (7), failure still
                (8), window tutorial (13) and quiz (17). Link the tutorial to
                the original chapter for viewers who want the full test.
                Alternate action and explanation rather than posting three
                versions of the reveal in a row.
              </p>
            </div>
            <div>
              <h3>Week 3 · Answer a narrower need</h3>
              <p>
                Use the cable walkthrough (4), reset checklist (9), newsletter
                (12), audio field note (14) and desk prompt (18). Swap posts
                between weeks when it makes a real answer timely. Keep the
                posting note separate from the media so a later run can reuse
                one without copying the other.
              </p>
            </div>
            <div>
              <h3>Week 4 · Report back</h3>
              <p>
                Queue the teardown (5), lighting comparison (10), budget
                breakdown (15), open problem (19) and reply roundup (20). The
                roundup is contingent on reviewable questions. Publish it when
                you have something new to answer, not just to reach a round
                number.
              </p>
            </div>
          </div>
          <div className={s.prose}>
            <h3>Check what the platform can actually publish</h3>
            <p>
              On eligible channels,{" "}
              <a href="https://support.google.com/youtube/answer/7124474?hl=en">
                YouTube Posts
              </a>{" "}
              supports formats including text, images, polls and quizzes, and
              documents how to schedule them. If your channel has advanced
              feature access, you can{" "}
              <a href="https://support.google.com/youtube/answer/14075157?hl=en">
                add a related video to a Short
              </a>{" "}
              from your own channel; the target must be public or unlisted. Give
              each derivative a complete payoff anyway. Linking back helps the
              curious viewer, but it shouldn’t be required to understand the
              post.
            </p>
            <h3>Prepare in batches, but approve by idea</h3>
            <p>
              Give each idea its own short row with the evidence reference,
              deliverable, accountable reviewer, earliest date and destination.
              An illustrative row would be “02 · Glare fix · 04:10–04:42 · two
              matched frames · editor · week 1 · existing video feed.” Gather
              the three or four frames near 04:10 once, then use them to prepare
              the glare edit and window-position tutorial. Release the assets
              separately so the viewer encounters two different levels of
              detail, not two teasers for the same answer.
            </p>
            <p>
              On a tight schedule, block one source-review session, then batch
              media fixes together and proof writing separately. Sequence
              dependencies matter more than the ideal day of the week: the desk
              layout prompt must run early enough for the roundup to have
              material, and the checklist should be downloadable before a post
              tells people to get it. If a dependency slips, publish the next
              independent idea or leave the slot empty. Keep at least one
              unscheduled slot for a good answer to a real audience question.
            </p>
            <h3>Use a question, an owner and a stop rule</h3>
            <p>
              Give each asset one question to answer and a person who checks it.
              If the footage can’t support the promise, change the question or
              cut the asset. For example, if the audio samples changed mic
              distance and furnishings at the same time, present it as a
              comparison of two setups, not proof that fabric alone made the
              difference. If the difference still isn’t clear, replace the
              before-and-after with a note about how you plan to run a cleaner
              test.
            </p>
            <p>
              Choose one observation per goal: retention or engaged views for a
              demonstration, actual checklist use when you can track it, and
              substantive replies for a question. See{" "}
              <a href="https://support.google.com/youtube/answer/9002587?hl=en">
                YouTube’s Studio reporting overview
              </a>{" "}
              for the reports available there. Compare similar formats at the
              same age, and do not combine counts across platforms as though
              measurement is identical. If the best replies all ask about a
              quiet recording location, use them to plan the next long video
              rather than making another desk shot.
            </p>
            <p>
              Hand the video jobs to the editor with the{" "}
              <Link href="/blog/repurpose-youtube-video">
                YouTube production and export checklist
              </Link>
              . For the rental-room carousel, start with{" "}
              <Link href="/blog/blog-to-linkedin-carousel">
                the editorial sequence guide
              </Link>{" "}
              before opening a design tool. If it’s difficult to find reviewable
              vertical cuts in the source,{" "}
              <Link href="/features">
                Zybble’s clip selection and caption workflow
              </Link>{" "}
              can draft candidates; it won’t plan or publish the rest of the
              slate.
            </p>
          </div>
        </section>
        <References article={article} />
      </div>
    </article>
  );
}
