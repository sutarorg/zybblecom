import { editorialArticle, helpfulContent } from "./shared";

export const creatorGuides = [
  editorialArticle({
    slug: "youtube-video-twenty-posts",
    title: "How to turn one YouTube video into 20 distinct posts",
    description:
      "Plan twenty posts from a single YouTube tutorial. See a worked studio example, a four-week slate, and how to avoid repeating one idea across channels.",
    category: "Creator workflows",
    alt:
      "A long studio video fans out into a short, an audio clip, an article, a carousel, a photo, and a poll",
    updatedAt: "2026-11-20",
    wordCount: 1632,
    keywords: [
      "turn one YouTube video into twenty posts",
      "20 content repurposing ideas",
      "YouTube content calendar",
      "video to social posts",
    ],
    links: [
      {
        href: "https://support.google.com/youtube/answer/7124474?hl=en",
        label: "YouTube Help: create and schedule Posts",
      },
      {
        href: "https://support.google.com/youtube/answer/14075157?hl=en",
        label: "YouTube Help: related videos in Shorts",
      },
      {
        href: "https://support.google.com/youtube/answer/9002587?hl=en",
        label: "YouTube Insights reports",
      },
    ],
  }),
  editorialArticle({
    slug: "zapier-buffer-repurposing-workflow",
    title: "Build an AI Repurposing Workflow With Zapier and Buffer",
    description:
      "Connect approved AI-assisted drafts to a Buffer queue with Zapier, including channel mapping, duplicate prevention, and a safe publishing test.",
    keywords: [
      "Zapier Buffer repurposing workflow",
      "automate social scheduling",
      "AI content approval",
      "Buffer Add to Queue",
    ],
    category: "Creator workflows",
    alt:
      "A connected workflow from media on the Zapier side through an approval check to a Buffer publishing queue",
    sections: [
      {
        id: "architecture",
        title: "Use the workflow to move approved work",
        paragraphs: [
          "The first goal is not to generate and publish a whole campaign in one trigger. Set up a simple path: one source record, one or more drafts, a human approval, and a queue destination. Let an AI tool produce candidate text separately. Zapier can route the approved record; Buffer can hold the scheduled post. With those boundaries, an unsupported claim in a draft cannot become a public post simply because a transcript arrived.",
          "Start with a record in a sheet or a database you already use. Give each planned post fields for draft ID, version, source URL, reviewed copy, asset reference, approved channel, desired time, reviewer and status. Include a field for the returned queue reference if the action provides one, and another for the time of the last attempted handoff. Do not use the row title as the only ID.",
        ],
      },
      {
        id: "build",
        title: "Build the Zap on one channel first",
        paragraphs: [
          "Choose a trigger your source tool exposes for a newly approved or updated record. Filter to approved entries with the required copy and one permitted destination. In Zapier, select Buffer’s Add to Queue action and map the approved text and channel; use the queue, not any immediate-publish setting. Read the integration’s current fields for the exact channel and media types it accepts. For an unsupported video or document format, route the record to a manual publishing task rather than silently dropping the attachment.",
          "Use a test-only account or a destination you control, schedule well ahead, and inspect the result before opening the workflow to real content. Check links, line breaks, mention behavior, time zone, asset previews, and the account name. For a private asset, do not create a publicly reachable link just to make an integration accept it. Use an approved transfer path or a manual handoff instead.",
        ],
      },
      {
        id: "retries",
        title: "Handle duplicates and ambiguous retries",
        paragraphs: [
          "Save a queue key based on the draft ID, version and destination before the handoff, and record success only when the queue confirms it. A repeat trigger should not silently schedule a second copy. If the connector times out after sending the action, mark the record ‘check queue’ and reconcile it manually before retrying. A plain spreadsheet check is not an atomic lock; if you expect concurrent triggers, serialize the dispatch or move uniqueness into a durable store.",
          "Test an approved record, a missing asset, a repeated update, an unapproved record, and a disconnected Buffer account. Confirm unapproved content does not move and that an error tells an operator what to do next. If approval is revoked after scheduling, the operator must also remove the queued post; changing the source row does not automatically cancel the copy unless you explicitly build and test that action.",
        ],
      },
      {
        id: "scale",
        title: "Expand only after the queue is predictable",
        paragraphs: [
          "Add the second channel with its own copy and acceptance test. Keep approval, recurrence rules, and tone consistent, but do not force the same caption across platforms. Track how many eligible posts reach the queue, how many are rejected by a destination, and minutes lost to exceptions. If routine failures dominate, reduce automation scope until its handoffs are dependable.",
          "Document a kill switch: pause the Zap, locate items sent since the last successful review, remove unintended queue entries, and tell the owner. A workflow you can stop and audit is much easier to trust than one that promises complete automation but never records the intermediate state.",
        ],
      },
    ],
    links: [
      {
        href: "https://zapier.com/apps/buffer/integrations/contentstudio/295956/add-new-contentstudio-posts-to-buffer",
        label: "Zapier reference: Buffer Add to Queue",
      },
      {
        href: "https://buffer.com/publish",
        label: "Buffer publishing overview",
      },
      {
        href: "/blog/content-repurposing-workflow",
        label: "Content review and handoff standards",
      },
    ],
  }),
  editorialArticle({
    slug: "canva-ai-linkedin-carousels",
    title: "Turn Blog Posts Into LinkedIn Carousels Using Canva AI",
    description:
      "Use Canva’s Magic Write to outline a LinkedIn document carousel, design readable slides, export a PDF, and check it before posting.",
    keywords: [
      "Canva AI LinkedIn carousel",
      "blog post to LinkedIn carousel",
      "Canva Magic Write",
      "LinkedIn document PDF",
    ],
    category: "Creator workflows",
    alt:
      "A long article on one side and a sequence of five illustrated LinkedIn carousel pages on the other",
    sections: [
      {
        id: "extract",
        title: "Give the carousel one useful job",
        paragraphs: [
          "A carousel works best when readers can learn one thing by advancing a few pages. Take a blog post about choosing podcast excerpts, for example. Instead of compressing the full article, pick one decision: ‘How do I know if a clip makes sense without the episode?’ Extract the four checks that support that decision and set the other sections aside. You can use them in a separate post later.",
          "Copy only the approved paragraphs into Canva. Magic Write can generate an outline or rewrite selected text, but use a constrained brief: ‘Draft six square slides, one idea each. Keep the four source checks in order. Use sentence case. Don’t invent numbers, quotes, or examples. Label the last slide as a practice prompt.’ Check the output against your source before laying it out.",
        ],
      },
      {
        id: "design",
        title: "Design a sequence, not six unrelated posters",
        paragraphs: [
          "Build one readable page layout in Canva and duplicate it. Use a regular heading position, generous margins, and a consistent page marker. Make the first slide promise a concrete outcome; use the four middle slides to explain what to check; end with a next action the reader can use without leaving the post. A tight series is easier to follow than a gorgeous cover followed by small paragraphs.",
          "For the example, use slides titled ‘Can this clip stand alone?’, ‘Name the subject’, ‘Keep the setup’, ‘Preserve the caveat’, ‘Land on a complete thought’, and ‘Try it with the audio off’. On each middle slide add one sample mistake and its repair. Use an accent color to signal a change in meaning, not to distinguish labels that cannot be understood without color. Read the copy at phone size before deciding the type is large enough.",
        ],
      },
      {
        id: "publish",
        title: "Proof the PDF and attach it as a document",
        paragraphs: [
          "Export a PDF from Canva and open the exported file separately. Check page order, edge spacing, legibility, and whether text can be selected where intended. Copy the essential takeaway into the accompanying post so the idea is not locked inside an image. If an example includes a customer screenshot, verify permission and redact unnecessary identifiers before exporting.",
          "LinkedIn documents can be uploaded through the document option in the post composer; the platform’s help page lists supported files and limits. Add a descriptive document title, preview the first and last pages, and confirm you are posting as the right account. LinkedIn says the document itself cannot be changed after upload, so use the approved file rather than a nearly identical draft. Do not assume every scheduler supports document attachments.",
        ],
      },
      {
        id: "review",
        title: "Make the next carousel easier to build",
        paragraphs: [
          "Save the template and record what you reused: the grid, the type scale, the caption structure, and the approval checklist. Keep the source article link in the production record and in the caption when it helps readers go deeper. Separate actual reader feedback from headline hypotheses; a post that generated useful questions may be more valuable than a broad design that earned passive impressions.",
          "If the workflow produced cramped pages, shorten the argument instead of shrinking the font. If the slide order confused readers, fold any prerequisites into the first instructional slide. Keep the human editor responsible for claims, accessibility, and final export, even when Canva helps create the first draft.",
        ],
      },
    ],
    links: [
      {
        href: "https://www.canva.com/help/about-magic-write/",
        label: "Canva Help: Magic Write",
      },
      {
        href: "https://www.linkedin.com/help/linkedin/answer/a518909",
        label: "LinkedIn Help: upload and share documents",
      },
      {
        href: "/blog/blog-to-linkedin-carousel",
        label: "Plan your carousel before opening the design editor",
      },
    ],
  }),
  editorialArticle({
    slug: "hootsuite-ai-repurposing-tools",
    title: "Why Some Hootsuite Users Consider AI Repurposing Tools",
    description:
      "Decide whether to keep Hootsuite, add a specialist AI repurposing tool, or switch by comparing creation, approvals, scheduling, and reporting.",
    keywords: [
      "Hootsuite alternatives",
      "AI repurposing tools",
      "Hootsuite content workflow",
      "social media scheduling vs clipping",
    ],
    category: "Creator workflows",
    alt:
      "A Hootsuite scheduling calendar beside Zybble’s lightning mark and two portrait video clips",
    sections: [
      {
        id: "separate",
        title: "Publishing and producing content are different jobs",
        paragraphs: [
          "A social media team may have a reliable calendar and still spend half a day turning a webinar into usable assets. That gap—not evidence of an industry-wide exodus—is a good reason to compare a specialist AI repurposing tool. A scheduler manages dates, accounts and coordination; a production workflow helps you find the extract, shape it, correct the caption, and prepare a version ready to schedule.",
          "Hootsuite describes built-in writing and repurposing assistance for social copy, including rewriting high-performing posts. Do not assume moving away from it is necessary for basic text adaptation. Instead, identify the exact asset Hootsuite users in your team are producing manually. A raw interview in need of three clean video excerpts is a different requirement from rewriting a caption for a second channel.",
        ],
      },
      {
        id: "keep",
        title: "Keep the scheduler if it still solves coordination",
        paragraphs: [
          "If staff rely on shared account permissions, approvals, trend or listening workflows, reporting, or a single calendar, treat those as requirements before looking at replacements. Map who needs publish permission, who owns each account, and who signs off on claims. A less expensive production tool with no equivalent review process can move costs to managers and operators instead of removing them.",
          "Try a sidecar workflow: run one event recording through a clipper or transcript tool, store the reviewed result, and enqueue it through the scheduler you already use. If production becomes faster without sacrificing approvals, you have a viable improvement without migrating every channel. If the team still cannot tell which draft was approved, solve versioning before you automate anything else.",
        ],
      },
      {
        id: "replace",
        title: "Consider replacing only what you can test",
        paragraphs: [
          "A small team that needs a single publishing queue may find a lighter scheduler is enough. Compare the exact media types you use, exportable history, required channels, time zones and failed-post recovery. For LinkedIn document posts or media requiring platform-specific controls, test the native workflow separately; the presence of a platform in a vendor’s list does not guarantee every post type works.",
          "Use a two-week pilot on a representative campaign. Keep the existing workflow running as the baseline. Measure time to approved assets, errors caught before publishing, failed handoffs, and ability to rebuild the schedule after an account disconnects. Do not count generated drafts that would never have been published. Compare price plus operating time, including what it takes to restore a missed post.",
        ],
      },
      {
        id: "decision",
        title: "A decision rule for creators and teams",
        paragraphs: [
          "Keep Hootsuite if coordination and reporting are valuable and creation is already manageable. Add a specialist if the choke point is clip or long-form asset creation. Replace the scheduler only after the trial shows the new stack preserves account ownership, approval rules and visibility. Each decision answers a different question; there is no need to make one product solve three unrelated jobs.",
          "Document your fallback before disconnecting an account. Export materials you are allowed to keep, clear pending queues, confirm credentials remain with the right administrator, and tell the team who handles failures. A measured rollback plan is a stronger signal of readiness than a demo with a perfectly clean source file.",
        ],
      },
    ],
    links: [
      {
        href: "https://blog.hootsuite.com/ai-copywriting/",
        label: "Hootsuite’s description of its built-in AI writing tools",
      },
      {
        href: "/blog/repurpose-io-alternatives",
        label: "Alternatives for different repurposing tasks",
      },
      {
        href: "/blog/zapier-buffer-repurposing-workflow",
        label: "Build a reviewed handoff to a Buffer queue",
      },
    ],
  }),
  editorialArticle({
    slug: "what-is-ai-content-repurposing",
    title: "What Is AI Content Repurposing and Why Does It Matter?",
    description:
      "Learn what AI content repurposing does, where it helps, what humans must review, and how to get three useful assets from one approved source.",
    keywords: [
      "what is AI content repurposing",
      "AI repurposing examples",
      "content adaptation workflow",
      "repurpose long-form content",
    ],
    category: "Video repurposing",
    alt:
      "Video, audio, and a written page pass through a lavender prism and emerge as new publishing formats",
    sections: [
      {
        id: "definition",
        title: "Repurposing means adapting a source, not just reposting it",
        paragraphs: [
          "AI content repurposing uses software to help turn an approved source into a different format for a distinct job. It might propose three excerpts from a recorded panel, turn a clear segment into a practical checklist, or help draft a newsletter from an interview. The source stays the evidence, but the format changes. Posting the same undifferentiated asset everywhere is distribution, not adaptation.",
          "An easy test: if a new asset has no distinct reader action, it probably does not need to exist. A Short can demonstrate a technique, a note can explain why it works, and a carousel can show the order of decisions. All three may share a source, but each has its own beginning, ending, and reason to be published.",
        ],
      },
      {
        id: "benefits",
        title: "Why it matters to a small team",
        paragraphs: [
          "The most expensive part of many content projects is capturing permissioned expertise. A thoughtful interview might take days to organize and only an afternoon to record. Repurposing lets more of that useful material reach people who prefer to read, watch, or listen. AI helps by scanning transcripts and drafting first passes. It does not magically create new expertise or guarantee a new audience.",
          "Look for useful gains: fewer minutes locating a quote, more accessible versions, and consistent publication without asking your guest to repeat themselves. Measure the percentage you approve, not the number of generated variations. If editors spend longer verifying the output than writing from scratch, improve the source and instructions before increasing volume.",
        ],
      },
      {
        id: "starter",
        title: "Start with a three-asset experiment",
        paragraphs: [
          "Take one approved ten-minute tutorial. Write the lesson in one sentence and mark the timestamp that demonstrates it. Create one short video that shows the action, one text post that explains the reasoning, and one checklist that helps someone try it. Ask an AI assistant for draft titles and possible cuts, providing only material you have permission to share with that service.",
          "Before publishing, play the clip with sound off and verify captions against the original audio. Compare the text post with the source for any removed caveats. Give the checklist to someone who has not seen the video; if they cannot use it, change the instructions rather than adding more assets. Add the final publish links to your source record so you can update or remove them if the underlying advice changes.",
        ],
      },
      {
        id: "limits",
        title: "Keep the editorial decisions with people",
        paragraphs: [
          "Treat model-suggested statements as candidates. Check numbers, guest names, dates, rights, and whether the quoted speaker meant what the new edit suggests. A confident generated sentence can contradict the source. Similarly, auto-reframing may hide a visual detail, and auto-captioning can turn a minor mistake into a very different recommendation. Preserve context even when it costs a few seconds.",
          "The useful version of repurposing ends in a human decision: publish, revise, or discard. Google’s people-first guidance and W3C’s caption guidance are good starting points for the final review. A smaller set of clear, traceable assets is a better outcome than a big batch that nobody can verify or maintain.",
        ],
      },
    ],
    links: [
      helpfulContent,
      {
        href: "https://www.w3.org/WAI/media/av/captions/",
        label: "W3C: captions and subtitles",
      },
      {
        href: "/blog/youtube-video-twenty-posts",
        label: "See a numbered twenty-post plan",
      },
      {
        href: "/blog/content-repurposing-workflow",
        label: "Build a repeatable approval workflow",
      },
    ],
  }),
];
