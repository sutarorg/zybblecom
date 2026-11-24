import type { ArticleEdition, ArticleInline } from "@/types/content";

const p = (content: string | readonly ArticleInline[]) =>
  ({ kind: "paragraph", content }) as const;
const list = (start: number, items: readonly string[]) =>
  ({ kind: "list", ordered: true, start, items }) as const;

export const youtubeContentPlanEdition = {
  intent:
    "Informational and planning: get 20 genuinely distinct deliverables from one example video, then prioritize and sequence them.",
  intro:
    "One substantial video can supply a month of ideas without becoming twenty copies of the same clip. Start with the questions it answers, then give each new piece a job of its own.",
  sections: [
    {
      id: "map-one-source",
      title: "Map the source before choosing formats",
      blocks: [
        p(
          "Imagine you run a small ceramics studio and publish a tutorial on using three household surfaces for product photography. It shows how a white wall bounces light, why a cloth backdrop wrinkles, where gloss causes reflections, and how to compare two photographs fairly. You want other makers to take better shop photos, not simply click the original video. The plan below turns that one source into twenty distinct pieces. It is an illustrative slate, not a claim that every recording produces this much useful material.",
        ),
        p([
          "Start a sheet with the source timestamp, fact or observation, permission status and reader question. Enter ‘glossy glaze reflects the window frame’, not ‘make a Reel’. Tag whether the source actually shows the result. This helps you decide if a paragraph can stand on its own or if the audience needs a photograph to follow it. The ",
          {
            href: "/blog/content-repurposing-workflow",
            label: "weekly content repurposing workflow",
          },
          " gives you a way to move each entry from draft to reviewed. Duplicate the sheet for future videos, not the ideas.",
        ]),
        p(
          "Count an asset only when its audience question, evidence or intended action differs. The same light-bounce clip exported for three apps is one idea distributed three ways. For a thin recording, aim for fewer pieces. If you cannot name a different reason to save, read, watch or answer the next one, the slate is full enough.",
        ),
      ],
    },
    {
      id: "five-video-pieces",
      title: "1–5: Five video pieces that show different things",
      blocks: [
        list(1, [
          "Before-and-after Short: start on the shadowy side of a white mug and cut to the same shot with a sheet of white card in place. Keep exposure and framing stable so the change shows what the card did.",
          "Wrinkle rescue demo: use the close-up where the maker pulls the cloth away from the pot and out of focus. Show the distance change rather than promising every fabric will work.",
          "Glossy glaze troubleshooting clip: show the reflected window shape, rotate the cup and show the reflection move. End on the practical rule: move the object or light before reaching for an editing filter.",
          "Overhead setup walkthrough: cut a wider, deliberately paced sequence showing the table, phone support and window. Keep enough of the frame to make the placement reproducible.",
          "Comparison recap: stitch together each of the three final photographs. Label which surface was used and explain why the maker would pick different setups for a textured bowl and a glazed mug.",
        ]),
        p([
          "Use the ",
          {
            href: "/blog/repurpose-youtube-video",
            label: "YouTube-to-Shorts production guide",
          },
          " for rights, framing and upload checks. The overhead walkthrough may work better as a wider edit; it still counts because its purpose is showing layout, not because it has a particular aspect ratio. Keep the original master available so a secondary export doesn’t lock you into a bad crop.",
        ]),
      ],
    },
    {
      id: "five-written-pieces",
      title: "6–10: Five written pieces that answer specific questions",
      blocks: [
        list(6, [
          "Searchable setup guide: explain how to choose a background by object shape, shine and texture. Use the three photographs as examples and add a decision a reader can make before arranging a table.",
          "Newsletter field note: open with the studio’s uncertainty about losing the mug’s texture. Set one homework task: photograph the same item twice with the card added only on the second pass.",
          "LinkedIn decision post: explain why testing with one identical item gives a more useful decision than photographing the best piece against every backdrop. Invite makers to share the one setup variable they keep fixed.",
          "Written troubleshooting FAQ: answer what to do if there is no window nearby, then distinguish what the tutorial demonstrated from suggestions you still have to verify under artificial light.",
          "One-page setup checklist: give the order for clearing the table, cleaning the piece, checking the background and shooting two comparable photos. Make it printable and have a maker follow it without watching the video.",
        ]),
        p(
          "Draft these from a corrected transcript and the photograph notes, not from the title alone. The setup guide can explain trade-offs. The newsletter should ask for an experiment, and the checklist should be executable while the reader is standing at the table. Those are different jobs even when they use the same evidence.",
        ),
      ],
    },
    {
      id: "five-visual-pieces",
      title: "11–15: Five visuals with their own information",
      blocks: [
        list(11, [
          "Three-surface decision carousel: put each background on a separate slide with one example and one reason not to choose it. End with a quick selection rule, not a generic follow request.",
          "Annotated setup diagram: redraw the table from above. Label the direction of the window, phone angle and bounce card. Include a text explanation so the diagram is not the only version of the instructions.",
          "Side-by-side detail card: show tight crops of rim texture with and without the white card. Label the actual difference; do not brighten one crop in post-production to make the contrast more dramatic.",
          "Photo-editing reference card: mark the bright glaze spot and the shaded foot on one still. Explain how to inspect both areas before choosing the final photo. This is a selection aid, not a retouching tutorial.",
          "Materials photo with alternatives: lay out paper, cloth and the white card. Name what can be swapped for items around the house and which glossy substitute you would avoid because it creates another reflection.",
        ]),
        p([
          "Use the ",
          {
            href: "/blog/blog-to-linkedin-carousel",
            label: "LinkedIn slide sequencing guide",
          },
          " if the carousel reads like a compressed article. Put the most useful comparison before the end and make every slide legible without zooming. Write descriptive alt or an equivalent text companion where the platform supports it.",
        ]),
      ],
    },
    {
      id: "five-conversation-pieces",
      title: "16–20: Five pieces that ask for a response",
      blocks: [
        list(16, [
          "YouTube text poll: ask ‘Which is hardest to photograph: glossy, speckled, dark matte or translucent?’ Use votes to choose the next demonstration rather than presenting them as a representative survey.",
          "YouTube quiz: show a photo with a window reflected in the glaze. Ask whether to move the cup, soften the shadow in software or swap the background first, then explain why rotation is the first test here.",
          "Community image prompt: show the table, but leave two possible spots for the card visible. Ask which spot a viewer would try, and answer with the light-direction diagram once responses come in.",
          "Audience photo challenge: invite readers to make a pair of images and report the single change they tested. Ask permission before publishing submissions, and do not request personal details in a public reply.",
          "Follow-up Q&A response: answer one real question from the slate once it arrives, such as why a dark pot disappears into a dark cloth. Draw a new comparison if the original did not answer it. Don’t invent a viewer question.",
        ]),
        p([
          "YouTube’s ",
          {
            href: "https://support.google.com/youtube/answer/7124474?hl=en",
            label: "Posts instructions",
          },
          " cover text, images, polls, quizzes and scheduling. Use a question only if you have a use for the answer. If no one replies to the challenge, leave the Q&A slot unfilled or publish a clearly labeled editor’s experiment instead.",
        ]),
      ],
    },
    {
      id: "publish-and-review",
      title: "Sequence the slate and measure the right thing",
      blocks: [
        {
          kind: "table",
          caption:
            "Suggested production order, not a mandatory posting frequency",
          headers: ["Stage", "Ship first", "Decide next"],
          rows: [
            [
              "Establish the idea",
              "Setup guide, before-and-after clip and diagram",
              "Do viewers understand what the card changes?",
            ],
            [
              "Explain exceptions",
              "Glaze clip, surface comparison and FAQ",
              "Which problem deserves its own demonstration?",
            ],
            [
              "Ask and follow up",
              "Poll, challenge and a real Q&A response",
              "What did viewers actually try or ask about?",
            ],
          ],
        },
        p([
          "Record publish dates, working links and the source photo versions. In ",
          {
            href: "https://support.google.com/youtube/answer/12220281?hl=en",
            label: "YouTube’s Content analytics",
          },
          " use Shorts’ stayed-to-watch and engaged views to inspect attention within the video format. For a checklist, downloads or user replies may tell you more than views. Read quiz answers for misconceptions. A strong poll does not prove that a video with the same topic will perform, but it can justify investigating the question.",
        ]),
        p(
          "What if you have one afternoon? Start with the example clip, diagram, setup guide and poll. They give the audience something to watch, use, look up and answer. Four finished assets are more useful than twenty unreviewed drafts. Keep the remaining ideas in the slate, then work on them when they support what the audience actually needs.",
        ),
      ],
    },
  ],
  takeaway:
    "A full slate comes from changing the job each piece does, not multiplying exports. Extract questions, keep a source trail, then choose the format that best preserves the evidence. Start with four different jobs and treat the remaining ideas as options to earn, not slots to fill.",
  cta: {
    title: "Start with the pieces that need video",
    text: "Use Zybble to find candidate highlights and download captioned portrait MP4s. Review the clips against your source map before you schedule them.",
    href: "/how-it-works",
    label: "See the clip workflow",
  },
} satisfies ArticleEdition;
