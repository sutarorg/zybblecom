import type { ArticleEdition, ArticleInline } from "@/types/content";

const p = (content: string | readonly ArticleInline[]) =>
  ({ kind: "paragraph", content }) as const;

export const opusclipDescriptEdition = {
  intent:
    "Commercial investigation: choose a clip-first or master-first workflow, estimate capacity and run a fair pilot.",
  intro:
    "Both tools can find short clips. The more useful question is whether you already have an approved video to cut up, or still need to edit the episode those clips will come from.",
  sections: [
    {
      id: "where-the-master-lives",
      title: "Start with the file you actually have",
      blocks: [
        p(
          "Choose OpusClip first if you regularly receive finished recordings and need to turn them into a batch of short drafts. Choose Descript first if you own the work of making the full episode: trimming the conversation, correcting the transcript and preparing the approved master. You can ask Descript to find highlights too. The difference is not which button says AI; it is where the fuller editorial project lives and what work remains when you open it.",
        ),
        p(
          "Consider an interview that begins with five minutes of setup, includes a sponsor read that needs replacing and ends with the guest correcting one detail from the opening. The editor who owns the episode needs to fix those problems in a long-form project before anyone promotes it. Conversely, a marketer receiving the approved interview on Friday does not gain much from rebuilding that project just to make four portrait excerpts. For this second person, the important question is how fast a good shortlist gets onto a review screen.",
        ),
        p([
          "If you are starting from a raw conversation rather than a finished episode, read the ",
          {
            href: "/blog/podcast-clips",
            label: "podcast clip selection guide",
          },
          " before comparing editors. A candidate that loses the question or omits the guest’s conditions is a weak deliverable in either app.",
        ]),
      ],
    },
    {
      id: "where-they-overlap",
      title: "What the tools can do, and where the work differs",
      blocks: [
        {
          kind: "table",
          caption: "Choosing an editing workflow",
          headers: ["Job", "OpusClip", "Descript"],
          rows: [
            [
              "Find excerpts",
              "Import a recording and review candidate clips as a batch.",
              "Run Create Clips on a composition and review each result as its own editable composition.",
            ],
            [
              "Repair an unfinished episode",
              "Start from the externally approved master if changes affect both the long and short versions.",
              "Use the transcript-linked script and scenes to edit the long version before creating derivatives.",
            ],
            [
              "Reframe a dialogue",
              "Check generated portrait framing against crosstalk, reactions and shared visuals.",
              "Select a portrait layout and distinguish single-track centering from multi-track camera switching.",
            ],
            [
              "Hand off finished work",
              "Check paid export and team controls against your delivery needs.",
              "Check resolution, editor seats and access to project files against your handoff needs.",
            ],
          ],
        },
        p([
          "In ",
          {
            href: "https://help.descript.com/repurpose/create-clips-from-your-content",
            label: "Descript’s Create Clips workflow",
          },
          ", select a composition, choose a count from one to twenty and set the requested length from ten seconds to five minutes. A topic or selection brief is optional. Descript puts the results in a project folder rather than forcing you to treat them as final cuts. This matters when you need to restore half a sentence to preserve the premise, or swap a portrait layout to keep the guest and the evidence in frame.",
        ]),
        p(
          "Descript also distinguishes Center Active Speaker from Automatic Multicam. The first is documented as a beta for a clip with sound and video on the same track; the second switches views in a multi-track sequence. Neither is a reason to skip review. A crop can correctly center the person talking and still hide the object they’re demonstrating. If your source is a slide walkthrough rather than a talking head, test the section where the presenter points to small labels before choosing either tool.",
        ),
        p([
          "A sensible two-tool workflow is to make and approve the master in Descript or the editor you already use, then send that version to OpusClip if batch review is still slow. Keep one source of truth for spelling, timing and guest approvals. The ",
          { href: "/blog/vertical-video-framing", label: "9:16 framing guide" },
          " explains when to preserve a wide shot instead of letting speaker tracking cut out the relevant material.",
        ]),
      ],
    },
    {
      id: "price-and-capacity",
      title: "Compare the meters, not just the sticker price",
      blocks: [
        p([
          "US prices and plan terms checked November 20, 2026. The ",
          {
            href: "https://www.opus.pro/pricing",
            label: "OpusClip plan comparison",
          },
          " lists Free, Starter at $15 per month and Pro at $29 per month on monthly billing. Free does not include watermark-free video export. According to OpusClip’s credit documentation, Starter includes 150 credits per month and Pro includes 300; for standard clipping, the meter uses original source duration, not the combined duration of the outputs. Monthly credits have a 60-day expiry. Do not rely on leftover credits as recurring capacity.",
        ]),
        p([
          "The ",
          {
            href: "https://www.descript.com/pricing",
            label: "Descript pricing page",
          },
          " lists Hobbyist at $24 per month on monthly billing or $16 per month equivalent billed annually. It includes ten media hours, 400 AI credits per month and watermark-free 1080p export. Creator is $35 on monthly billing or $24 per month equivalent billed annually, with thirty media hours, 800 AI credits per month and watermark-free 4K export. The price is per person. Upload and recording consumption uses media hours; AI work uses a separate credit meter. Do not read 400 AI credits as 400 minutes of clipping.",
        ]),
        p(
          "For four 55-minute imports in one month, standard OpusClip clipping would consume 220 source credits before retries or other chargeable actions. That exceeds a fresh Starter allowance and fits a fresh Pro allowance. The same inputs occupy three hours and forty minutes of Descript’s media allowance, so they fit Hobbyist on the media side. That calculation says nothing about how many AI actions the team can afford or whether a second editor needs a seat. Measure both in the workflow you intend to use, and verify prices at checkout before committing.",
        ),
        p([
          "An annual price can reward steady throughput, but a quiet quarter changes the comparison. For workload-based examples, see ",
          {
            href: "/blog/video-repurposing-cost",
            label: "how to calculate cost per approved clip",
          },
          ". Include the time spent reviewing rejected drafts; it does not disappear simply because the editor didn’t export them.",
        ]),
      ],
    },
    {
      id: "run-a-comparison",
      title: "Run a fair pilot on one episode",
      blocks: [
        p(
          "Use the same original file, portrait delivery target and selection brief in both tools. Imagine a 40-minute interview with a photographer about pricing event work. Ask for excerpts that answer one beginner question with a concrete example. A complete excerpt might show how the photographer separates minimum call-out time from travel. A dramatic sentence about doubling prices is not a substitute if it leaves out that the advice only applied to weekend jobs.",
        ),
        {
          kind: "list",
          ordered: true,
          items: [
            "Give each editor the same cap on review time. Record setup, candidate review and corrections separately so you can see which part of the workflow changed.",
            "Ask a reviewer who hasn’t heard the full interview to state the question each draft answers. Reject drafts whose basic premise cannot be recovered without producer notes.",
            "Check the approved wording against the source, particularly numbers and conditions. Inspect names and negations in captions; check the portrait crop at the start, middle and end.",
            "Count clips that pass the same approval rules. Track rejections by reason, and note whether two near-identical cuts really serve different purposes.",
          ],
        },
        p(
          "A trial that works on one solo recording is not enough if you also publish panel discussions. Before buying a plan, give the preferred workflow one difficult file with fast turn-taking or a visual demonstration. If it falls down, decide whether the weakness can be corrected during ordinary review or whether it forces you back to the original timeline on every episode. That distinction often matters more than the number of draft clips shown after import.",
        ),
      ],
    },
    {
      id: "common-decisions",
      title: "Common buying questions",
      blocks: [
        p(
          "Can Descript replace a separate clipper? Yes, if its candidates and edit tools already get you to approval within budget. There is no need to buy a second product to solve a problem your editor does not have. If long-form approval is already fast but short-form selection is not, try the dedicated clipper as a downstream step before moving the whole editing process.",
        ),
        p([
          "What if I only have occasional finished uploads? Compare a recurring monthly allowance with a one-time option. Zybble offers AI highlight discovery, speaker-focused reframing, captions and 9:16 MP4 downloads on ",
          { href: "/pricing", label: "one-time credit packs" },
          " that do not expire. Keep your full editor when you also need to repair source audio or rebuild the original episode. None of these choices can promise that a finished clip earns views.",
        ]),
      ],
    },
  ],
  takeaway:
    "Choose for the work you repeat. OpusClip belongs on the shortlist when an approved master goes in and a ready-to-review batch needs to come out. Descript belongs on it when you need an editable long-form project as well as shorts. Use the same recording and approval rules before paying for either, and make your decision on repair time and approved outputs rather than candidate count.",
  cta: {
    title: "Already have an approved video?",
    text: "See how Zybble finds candidate highlights and turns them into captioned portrait MP4s for review.",
    href: "/how-it-works",
    label: "Explore the video workflow",
  },
} satisfies ArticleEdition;
