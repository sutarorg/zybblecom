import {
  captionGuide,
  editorialArticle,
  youtubeCaptions,
  youtubeShorts,
} from "./shared";

export const videoArticles = [
  editorialArticle({
    slug: "repurpose-youtube-video",
    title: "How to repurpose a YouTube video: Source files, edits, and exports",
    description:
      "Repurpose a YouTube video from a clean master. Choose the right edit for portrait, landscape or square, then verify captions, rights and the uploaded file.",
    category: "Video repurposing",
    alt: "A wide spreadsheet recording branching into portrait, landscape and square compositions",
    updatedAt: "2026-11-20",
    wordCount: 1504,
    featured: true,
    keywords: [
      "how to repurpose a YouTube video",
      "export YouTube video clips",
      "YouTube to Shorts editing",
      "clean video master",
    ],
    links: [
      {
        href: "https://support.google.com/youtube/answer/56100?hl=en",
        label: "Download your own uploaded videos",
      },
      {
        href: "https://support.google.com/youtube/answer/1722171?hl=en",
        label: "YouTube recommended upload encoding",
      },
      {
        href: "https://support.google.com/youtube/answer/15424877?hl=en",
        label: "YouTube Shorts eligibility and claim rules",
      },
      {
        href: "https://support.google.com/youtube/answer/2734796?hl=en",
        label: "Add subtitles and captions",
      },
    ],
  }),
  editorialArticle({
    slug: "podcast-clips",
    keywords: [
      "podcast clips",
      "podcast clip selection",
      "podcast highlights",
      "video podcast repurposing",
    ],
    title: "How to make podcast clips that work without the full episode",
    description:
      "Choose self-contained podcast moments, protect guest context, and build a practical clip-editing and review process for your show.",
    category: "Video repurposing",
    alt: "Two broadcast microphones and headphones on a dark walnut podcast desk",
    links: [
      captionGuide,
      youtubeShorts,
      {
        href: "/blog/vertical-video-framing",
        label: "Choose a crop for a two-person interview",
      },
      {
        href: "/blog/podcast-to-blog-post",
        label: "Adapt the same podcast into a written guide",
      },
      {
        href: "/how-it-works",
        label: "How Zybble approaches video repurposing",
      },
    ],
    sections: [
      {
        id: "moment",
        title: "Look for an answer, not the loudest sentence",
        paragraphs: [
          "The best opening for a full podcast episode is often a poor opening for a clip. A familiar intro rewards someone who has already decided to listen, while a stranger needs to know whose problem the next forty seconds will solve. Start with a meaningful claim, a specific decision, or an event with a consequence. A guest saying ‘the third version finally worked’ is interesting to the host but opaque to a stranger. A guest saying ‘we stopped releasing a new version every Friday, because the reviewers always arrived Monday’ already has a subject, tension, and reason to hear more.",
          "Make a shortlist from episodes you have permission to reuse. In your notes, give each candidate a plain-language premise, the source timestamp, and a payoff. A payoff isn’t always a punchline. It can be a before-and-after, a warning, or an example of how someone made a decision. Reject a segment if its payoff only appears in a different part of the episode and you can’t bridge the gap honestly. If you need a teaser, call it a teaser; don’t promise a complete answer and end at the introduction.",
        ],
      },
      {
        id: "sketch",
        title: "Sketch the edit with a three-line clip card",
        paragraphs: [
          "Write three lines for each candidate: what the viewer sees or hears first; what context they must understand; and what they know or can do by the end. For an interview about building a home studio, the opener might be ‘Listen to these two takes.’ The context is that both takes used the same mic. The payoff is a location test the viewer can perform. A clip card also makes a better handoff than ‘pick something punchy,’ because it gives the editor a factual reason to include the second take.",
          "Build rough cuts in that order. Cut dead air or a repeated setup if it doesn’t change meaning. Keep the breath where a guest turns a speculative idea into a correction. If you write a short context card, attribute it to the show rather than putting words in a guest’s mouth. Check the first and last frames for leftover footage from the parent clip. For multi-camera sets, don’t cut to a guest who is reacting to a later line: a borrowed reaction can create an implication the conversation didn’t support.",
        ],
      },
      {
        id: "audio",
        title: "Make the sound and captions part of the edit",
        paragraphs: [
          "A show mix can hide a weak sentence between longer sections. A clip has less room to recover. Listen for a sudden level jump, a music bed that obscures a quiet guest, and a laugh that makes the first word of the next speaker unintelligible. A word cut too abruptly can sound like an error even when the captions are right. If possible, use the separate speaker tracks for repair instead of compressing the whole final mix until background noise becomes prominent.",
          "Use the transcript as a draft and listen back while reading the exact export. Look first at guest names, product names, figures, and negations. Add meaningful non-speech cues when a person who can’t hear them would miss the point. Two speakers with a similar-sounding voice may need labels in the captions or an obvious visual handoff. Pick an overlay style that a viewer can read without pausing, rather than the style with the most animation. Retain a clean master and a timed text file when your delivery workflow supports that choice.",
        ],
      },
      {
        id: "release",
        title: "Create a small approval and publishing handoff",
        paragraphs: [
          "Send the guest or producer a review version when your agreement requires it. Give the reviewer the exact clip version, intended destination, proposed headline, and source context for any compressed story. A short video with the right edit can still mislead viewers if the headline makes a stronger claim than the guest did. Collect approvals against the version, not just the topic. Treat changes to numbers, claims, or context after approval as reasons to repeat the relevant review.",
          "Write a short title that describes the decision or question. Add an episode reference where it helps viewers find the full conversation. On channels that allow related content links, test the destination as the intended audience, and don’t assume a link available in a desktop dashboard behaves the same way in the phone feed. If a clip exists to serve one audience question, use a call to action related to that question. A generic request to ‘follow for more’ is a fallback, not a necessary ending.",
        ],
      },
      {
        id: "batch",
        title: "Run a three-clip batch and keep rejection notes",
        paragraphs: [
          "For the next episode, try one clear explanation, one example with a tangible outcome, and one answer that complicates a common claim. Review each with a person who hasn’t heard the full show. Ask them to explain the premise and identify where they got confused, not whether the clip feels viral. If it needs several lines of extra context to make sense, turn the moment into a written post or leave it in the long episode. An unused cut is cheaper than an avoidable correction once a guest or viewer shares it.",
          "Keep a lightweight log of what didn’t work: noisy excerpt, pan that cuts off the object, consent unclear, and so on. Often the solution is upstream. Ask the guest to restate an answer with the subject named, leave a beat before switching topics, or move a visual demonstration to a cleaner camera angle. A repeatable podcast clipping workflow starts when you record and ends with a small set of useful exports. It doesn’t depend on asking the next episode to produce the same number of clips as the last one.",
        ],
      },
      {
        id: "reframe-example",
        title: "Compare a dialogue cut and a solo answer before committing",
        paragraphs: [
          "Suppose a guest says that the team kept its first studio microphone for four years. The host replies with ‘even after you moved?’ and the guest explains why the room mattered more. You could make a solo-answer cut that briefly states the premise up front, or a dialogue cut that preserves the natural exchange. The solo version can save time and simplify framing. The dialogue version preserves the surprise, but only if viewers can tell where the question comes from. Test both openings with the same audience question: which helps you understand what actually changed?",
          "Treat a good ending as part of the selection, not an afterthought. If the guest ends by saying their lesson came from sound checks and not a universal equipment rule, keep it even if the extra line is less punchy. If the host immediately asks something unrelated, cut before the new question. A ‘to be continued’ ending is appropriate for an explicitly linked sequence, but when the clip promises advice it should deliver an answer. Verify the first frame after a fade too; an unintended glimpse of the next take can look like a video glitch.",
          "Save both rough versions as references even if only one is published. Note why you chose the dialogue cut or the solo cut: ‘kept the qualifier,’ ‘more readable crop,’ or ‘clearly attributable excerpt.’ That reason is much more portable than a timestamp alone. The next editor can look for the same condition in a different episode without copying the form mechanically. After a few batches those choices become an editorial style guide grounded in what your show records well.",
        ],
      },
    ],
  }),
  editorialArticle({
    slug: "short-video-captions",
    keywords: [
      "short video captions",
      "auto caption editing",
      "SRT and VTT",
      "caption accessibility",
    ],
    title: "Short video captions: Fix timing, wording, and placement",
    description:
      "Make short video captions readable and accurate. Work through a timing example, pick the right caption track, and check the finished upload on a phone.",
    category: "Video repurposing",
    alt: "An illustrated portrait video beside two timed subtitle cues and a waveform",
    links: [
      {
        href: "https://www.bbc.co.uk/accessibility/forproducts/guides/subtitles/",
        label: "BBC Subtitle Guidelines: timing and presentation",
      },
      captionGuide,
      youtubeCaptions,
    ],
    updatedAt: "2026-11-20",
    wordCount: 1605,
  }),
  editorialArticle({
    slug: "vertical-video-framing",
    keywords: [
      "vertical video framing",
      "speaker crop",
      "9:16 video",
      "reframe video for shorts",
    ],
    title: "Vertical video framing: Crop, track, or keep the full frame?",
    description:
      "Turn widescreen footage into 9:16 without losing the shot’s point. Compare center crops, speaker tracking, and full-frame fit across four types of footage.",
    category: "Video repurposing",
    alt: "A landscape composition next to three portrait treatments: center crop, speaker crop, and full-frame inset",
    links: [
      {
        href: "https://helpx.adobe.com/premiere/desktop/add-video-effects/commonly-used-effects/add-auto-reframe-effect-to-a-sequence.html",
        label: "Adobe Premiere: Auto Reframe sequences",
      },
      youtubeShorts,
      {
        href: "https://www.opus.pro/tools/vertical-video-maker",
        label: "OpusClip: speaker and object tracking",
      },
    ],
    updatedAt: "2026-11-20",
    wordCount: 1505,
  }),
];
