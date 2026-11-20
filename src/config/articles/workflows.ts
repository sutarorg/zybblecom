import {
  captionGuide,
  editorialArticle,
  helpfulContent,
  youtubeShorts,
} from "./shared";

export const workflowArticles = [
  editorialArticle({
    slug: "content-repurposing-workflow",
    keywords: [
      "content repurposing workflow",
      "creator content pipeline",
      "content review process",
      "batch repurposing",
    ],
    title:
      "Build a content repurposing workflow that won’t publish the wrong version",
    description:
      "A practical source-to-publish workflow for small teams, including an asset record, human approvals, and safe automation between a tracker and a scheduler.",
    category: "Creator workflows",
    alt: "Two colleagues organizing headphones, a notebook, and production cards on a pale desk",
    links: [
      helpfulContent,
      {
        href: "/blog/repurpose-youtube-video",
        label: "Plan a mixed batch from a single recording",
      },
      {
        href: "/blog/agency-video-repurposing",
        label: "Set up the client approval boundary",
      },
      {
        href: "/resources",
        label: "Open Zybble’s practical creator resources",
      },
    ],
    sections: [
      {
        id: "record",
        title: "Start with the asset record, not the automation tool",
        paragraphs: [
          "A content repurposing workflow has to answer a simple question reliably: which version should go out next? The hardest problems rarely happen when an editor writes a caption. They happen when an approved asset is revised, a guest asks to remove a detail, or a scheduled post points at a link only your team can open. Before joining transcription, a database and a scheduler, give each derivative one record that owns its state from first idea to publication.",
          "Use a tracker your team already trusts. Give each record a durable asset ID, the parent recording, timestamps, the destination, a short outcome statement, a versioned link, the assigned editor, the approver, and a publication status. Add a place for context that must travel with the cut. For a webinar story, record any qualifications about the customer’s setup in the same note as the claim. A standalone approvals spreadsheet that can’t tell you which cut was signed off is not a source of truth.",
        ],
      },
      {
        id: "states",
        title: "Name the stages by decisions, not by teams",
        paragraphs: [
          "A small workflow can use ‘candidate,’ ‘editing,’ ‘needs review,’ ‘approved,’ ‘scheduled,’ and ‘published.’ Add ‘hold’ for a rights issue or unresolved detail. The rule for each step should be observable: ‘approved’ means the exact video, copy and destination have been signed off, not that the editor is finished. Add the approved version identifier explicitly. If the edit changes, move it back to review rather than swapping a file underneath an approved link. That prevents a late crop or incorrect quote from inheriting the wrong decision.",
          "Assign responsibility for transitions between stages. An editor can mark the first export ready. An approver signs off captions and factual claims. A publisher tests the exact destination and schedules the approved version. On a tiny team one person may handle all three roles, but the statuses still help. Writing the requirement down is especially valuable when the person who normally posts is away and someone else must ship the queue without interpreting a chain of chat messages.",
        ],
      },
      {
        id: "automation",
        title: "Automate delivery steps that can safely run twice",
        paragraphs: [
          "A workflow service can create a review task when a record reaches ‘needs review’, send a reminder to the assigned owner, or create a draft in a scheduler. Start with one of those before trying automatic publishing. Use the asset ID and version as the reference in both tools. On retry, look for an existing item for that pair instead of blindly making another. Make the prompt or transformation input a field you can inspect. If different reviewers disagree on an edit, the automation should not generate a new alternate version on its own.",
          "Choose credentials that can do the minimum required job. If a connector only needs to write draft posts, don’t give it broad permissions to a shared production workspace. Use a separate test workspace for experiments and avoid placing customer transcripts or raw recordings in logging fields. If a destination only reports that it accepted a task, don’t treat that as proof the post is live. Save the returned destination reference and reconcile ambiguous results before trying again. A duplicate draft is inconvenient; a duplicate published post is a customer-facing mistake.",
        ],
      },
      {
        id: "example",
        title: "Test the workflow with a deliberately awkward example",
        paragraphs: [
          "Take a practice webinar where the first candidate is a speaker quote over a graph. During review, have a colleague ask that a customer name be removed and request a narrower crop. The correct behavior is to make a new version, repeat the claims and visual checks, and prevent the old draft from leaving the queue. Then pretend the scheduler returned a timeout after accepting the request. Verify that your workflow locates the scheduled draft or exits for manual inspection; it should not enqueue another copy just because the response failed to arrive.",
          "Use an actual phone for the final check. Confirm captions, safe placement, thumbnail, and playback; open any link as a viewer outside the team. For written derivatives, read them independently of the source and look for unsupported claims introduced in the rewrite. Leave time in the handoff for the exact person responsible to resolve each issue. Who should correct a staging link? Who pauses the queue if a verbal approval is withdrawn? This turns a stack of widgets into an operating process someone can follow under pressure.",
        ],
      },
      {
        id: "measure",
        title: "Measure the bottleneck before adding another integration",
        paragraphs: [
          "After two batches, count time spent finding source material, editing, waiting for approval, and repairing already approved versions. A reminder won’t help if reviewers open the ticket but can’t tell what to check. A faster rough cut doesn’t help if everyone waits on one decision maker who sees every post at once. Separate time spent doing creative work from waiting. See whether a clearer brief, smaller batch, or a documented cutoff resolves the delay before paying for another subscription or arranging a more elaborate automation.",
          "The workflow is ready to scale when someone who didn’t build it can trace a published post back to the recording and reproduce the approval decision. Keep author and destination checks manual when their cost is small and a mistake would be public. Automate the mechanical handoff, not the judgment. Your first success metric is boring on purpose: the right version arrives in the right place once, and the team knows what to do if the confirmation is missing.",
        ],
      },
      {
        id: "handoff-sample",
        title: "Use one durable record to hand off a real asset",
        paragraphs: [
          "Here’s a practical example field set for a batch named ‘studio-setup’: asset ID studio-setup/03, parent source 00:06:14–00:07:07, destination video feed, promise ‘test room noise at constant gain,’ media draft v2, caption track v2, reviewer directory entry, and status ‘needs review.’ Add exactly one blocking note: ‘confirm both microphone gain values match.’ An editor who receives the task can act without starting a group chat. A reviewer knows which file to open and how to tell whether a new export invalidated the old decision.",
          "After release, leave the video file and caption file intact and append a publication event with the final URL and date. Don’t replace the link to v2 with a generic latest-file link; doing so makes historical approvals unverifiable. If a correction is required, create v3 and record what changed and who reviewed it. Reusing IDs for entirely unrelated derivatives can make a scheduler accidentally attach a previous post to a new task. Keep the stable work identifier separate from the version, and make the pair your mechanical matching key.",
          "When testing integration behavior, remove real names and never feed personal customer details into a shared sandbox. Use a small mock brief with synthetic test material, label it clearly and keep it outside the live queue. Test both a completed handoff and a held one. The hold is the more important test: if the workflow can tell you when it must not act, moving a clean approved file is much less risky.",
        ],
      },
    ],
  }),
  editorialArticle({
    slug: "podcast-to-blog-post",
    keywords: [
      "podcast to blog post",
      "podcast transcript editing",
      "podcast content repurposing",
      "episode sources",
    ],
    title: "Podcast to blog post: turn a conversation into a useful article",
    description:
      "Turn a podcast transcript into a self-contained article with a query-driven outline, attributed examples, and a repeatable fact-checking pass.",
    category: "Creator workflows",
    alt: "A writer reviewing a printout next to a recorder and headphones",
    links: [
      helpfulContent,
      captionGuide,
      {
        href: "/blog/podcast-clips",
        label: "Reuse the same episode for video without losing context",
      },
      {
        href: "/blog/blog-to-linkedin-carousel",
        label: "Adapt the finished article into a carousel",
      },
      { href: "/blog", label: "Browse Zybble’s editorial guides" },
    ],
    sections: [
      {
        id: "question",
        title: "Choose the reader’s question before outlining the episode",
        paragraphs: [
          "A podcast transcript is ordered by the conversation. A useful article is ordered by the reader’s problem. When someone searches for ‘how to plan a two-camera podcast on a budget,’ they generally want choices, a setup, or a checklist. They don’t want to scroll through the guest’s biography to discover that the only equipment tip is near the end. Choose one problem the recording directly addresses, then test whether you can summarize the answer in two sentences without promising anything the recording doesn’t support.",
          "An episode about building a small podcast studio may discuss sound treatment, lighting, camera layout, and bookkeeping. Start with the part containing the strongest actionable example. For a camera-layout guide, the rest can become supporting links rather than mandatory sections. List the intended reader, their constraints, and what they should be able to do after reading. A simple brief might say ‘solo host, one room, borrowed camera, plan two usable angles without buying another tripod.’ Now the editor can reject tangents without rejecting the guest’s larger story.",
        ],
      },
      {
        id: "source",
        title: "Extract evidence, caveats, and examples into separate notes",
        paragraphs: [
          "Make a small table with the exact timestamp, the claim, the source type, and the caveat. Mark which claims are guest experience, which depend on external facts, and which you can demonstrate in the article. Give any quote you intend to use its own row. Listen again around the timestamp: auto-transcription can misstate an equipment model or omit a negative. If the speaker never said something in exactly those words, paraphrase it with attribution instead of adding quote marks to a tidy reconstruction.",
          "A useful note might read: ‘At 24:10 the guest suggests using one wide safety shot while testing the close angle; they were filming with a static host under controlled lighting.’ That limitation belongs in the published example. If a draft says the same approach is right for every live panel, it has already gone beyond its source. Verify rights to any photos or slide screenshots independently of the audio recording. An embedded audio player is useful context, but the article should still function for a reader who never presses play.",
        ],
      },
      {
        id: "draft",
        title: "Rewrite in the order someone would do the work",
        paragraphs: [
          "Draft an opening that gives the short answer. Then use the sections to make the choices in the right order: pick a primary angle, set a fallback, check sync, run a rehearsal, and review the export. Each section can use a piece of evidence from a different timestamp. Include a version of the advice for the reader with fewer resources. Don’t write an equipment list that quietly assumes a second operator if the brief is for a solo host. If an essential step wasn’t discussed, research it or say that the example doesn’t cover it.",
          "AI writing tools can help group notes or suggest headings. Give them the claim table and ask for a draft based on those statements, with unknown facts clearly flagged. Keep sensitive guest material out of a tool you aren’t authorized to use. The generated outline isn’t evidence; the timestamps and official references are. Compare every number, named recommendation and quote with the recorded or independently verified material. Move your own commentary into clearly labeled paragraphs rather than letting a model write in the guest’s voice.",
        ],
      },
      {
        id: "checks",
        title: "Do an editorial review in three passes",
        paragraphs: [
          "First read for independent usefulness. If the opening makes sense only because a show title appears above it, rewrite the promise. Second read for fidelity: trace the important claims to the moment or reference that supports them, check organizations and people, and make sure examples keep their conditions. Third read for navigation. Use descriptive headings and links that tell the reader what they will find. Ask someone unfamiliar with the episode to follow the checklist and point out the first missing input. Those notes are better than a generic request to ‘make the blog more engaging.’",
          "Use a descriptive title and description rather than trying to fit every episode topic into one headline. Link to the recording as a source and to a related article if it helps with a clear next action. Google Search Central’s people-first guidance is a useful editorial reference, not a recipe for rankings. Leave out sections that exist only to repeat a keyword. Add screenshots or diagrams when they resolve confusion the text can’t. Name what the image shows and avoid adding important instructions only as text inside an image.",
        ],
      },
      {
        id: "publish",
        title:
          "Keep the article current without pretending the episode changed",
        paragraphs: [
          "After publication, keep the article version, recording URL and claim notes together. If a tool or platform changes, update the guidance and distinguish that update from what the guest originally said. If the article relies on a contested claim, fix the article and review any video or carousel that used the same excerpt. Update derivatives from the source notes rather than copying an older published summary back into the workflow. That gives the next editor a clean history of decisions and prevents a correction from being lost across formats.",
          "Start with one episode and one query. A successful article answers a real question, shows evidence, and lets readers apply something without needing to play the source. It can be shorter than the complete transcript or even longer than a short segment: length is not the measure. The reader should leave with a better decision, the guest should recognize their argument, and your team should be able to explain where each important claim came from.",
        ],
      },
      {
        id: "example",
        title: "Show the difference between a show note and a standalone guide",
        paragraphs: [
          "A show note might say ‘Our guest talks about the two-camera trick and why it helped on a recent podcast.’ It’s useful to a listener scanning the episode, but it doesn’t answer a search query. A guide can start with ‘Use the wide camera as a safety angle; rehearse before you rely on a close-up.’ Follow with where the cameras point, how the host checks both images, and when a wide shot isn’t enough. Attribute the example and then discuss limitations in your own voice. Don’t claim the guest endorses equipment they didn’t recommend.",
          "Try a first draft that intentionally leaves the episode name out of headings. Ask whether the headings still carry meaning. ‘Check both cameras on the same clap’ is useful even if the viewer doesn’t know the guest. ‘The thing that changed everything’ makes sense only to someone already interested. In the paragraph following an example, add a small exercise: capture ten seconds of movement, review both files, and decide which take stays useful if the other is unavailable. Instructions are more valuable when they name what passing the check looks like.",
          "The show note and guide can coexist. Link the reader to the episode when they want to hear the original discussion and link listeners back to the guide when they want a checklist. Keep the full transcript available separately when you can provide it responsibly. That gives people a way to search the recording or read it for accessibility, without asking the article to serve as both an exact transcript and an edited answer.",
        ],
      },
    ],
  }),
  editorialArticle({
    slug: "blog-to-linkedin-carousel",
    keywords: [
      "blog to LinkedIn carousel",
      "document post",
      "social carousel layout",
      "repurpose blog content",
    ],
    title:
      "How to turn a blog post into a LinkedIn carousel without copying paragraphs",
    description:
      "A slide-by-slide workflow for rewriting an article as a readable visual sequence, with an example, design checks, and a publishing handoff.",
    category: "Creator workflows",
    alt: "A designer arranging violet and ivory cards in a sequence",
    links: [
      helpfulContent,
      {
        href: "/blog/podcast-to-blog-post",
        label: "Prepare a source article from a recording",
      },
      {
        href: "/blog/content-repurposing-workflow",
        label: "Add the carousel to a versioned content workflow",
      },
      {
        href: "/resources",
        label: "More practical creator guidance from Zybble",
      },
    ],
    sections: [
      {
        id: "pick",
        title: "Decide which part of the article is worth swiping through",
        paragraphs: [
          "A carousel is useful when an idea benefits from sequence. It could be a before-and-after, a decision tree, or a short process where someone needs to make one choice before seeing the next. An article may have several of those, but a document post has room for only one clear promise. Before opening a design tool, write the sentence you want a stranger to remember after the final slide. If it can’t fit on one line of a brief, the subject is probably too broad.",
          "For example, take an article about repurposing a webinar and focus the carousel on a single question: ‘Which three excerpts can stand alone?’ The original article might also cover transcription and scheduling. Those belong in the article or a separate post. Close the blog tab after noting its facts and caveats, then try to explain this smaller idea without reading from it. The words you naturally reach for are usually easier to read in a swipeable document than a pasted introduction.",
        ],
      },
      {
        id: "sequence",
        title: "Write the slide sequence as a decision, one card at a time",
        paragraphs: [
          "Slide one can be ‘Find three clips before opening the editor.’ Slide two describes the input: one recording you’re allowed to reuse and a watch-through at normal speed. Slide three asks the viewer to pick a claim that gives a complete answer. Slide four asks for a demonstration where the evidence remains visible. Slide five asks for a useful exception to a common rule. Slide six offers a fast rejection test: remove the welcome and check whether a stranger still understands the segment. A final slide points to the longer workflow or asks for a real example from the viewer’s work.",
          "Each slide needs a different job, not just a different background. Check the transitions by writing the slide titles in a column. If two titles could swap without changing the flow, that may be fine for a list; if the second assumes a decision not yet introduced, reorder it. Add an example on the slide where it proves the point. In the webinar example, ‘pick a contrast’ is weaker than ‘compare both microphones at the same settings, or leave the effect unexplained.’ Specific examples help the reader spot why a rule matters.",
        ],
      },
      {
        id: "assist",
        title: "Use AI for first drafts and variants, not for final claims",
        paragraphs: [
          "Give a writing assistant the approved paragraph, the audience, the desired sequence length, and facts the draft must retain. Ask it for a short slide title and one useful supporting line per card. Then compare the output to the source. A common failure is turning ‘up to’ into an unconditional promise or adding steps that require a tool the reader doesn’t have. Have the assistant flag assumptions separately so you can resolve them instead of discovering them after design.",
          "Use the assistant differently when the problem is visual. Ask for two explanations of a complicated example, not two packs of identical bullet points. One version may use an annotated still; another may explain it with a three-step diagram. Pick the one that offers the simplest evidence. Check your rights to all screenshots, fonts, and illustrations, and avoid uploading confidential material into an unapproved tool. For brand accounts, record which source article version informed the document, so a later edit can trace the exact claim and not just a similar-sounding sentence.",
        ],
      },
      {
        id: "layout",
        title: "Design for a phone and test the exported document",
        paragraphs: [
          "Build the smallest useful set of layouts: a cover, a step card, and an example card. Keep a stable title position across similar cards so a reader can skim and know where to look. Use generous margins and text that remains legible when the document sits inside a smaller feed card. Preview it on your phone without pinch-zoom. If two data labels are too small, keep the comparison but move its details back into the article. Add a plain-language summary in the accompanying post for readers who can’t access details inside the document.",
          "Export, reopen, and check the file rather than assuming an editor preview proves anything. Look for missing glyphs, awkward line breaks, transparency changing the background, lost links, and image crops. Confirm the current document and file requirements in the destination’s publisher before scheduling; review behavior can vary with device and workflow. Don’t make clickable text the only way to locate the resource. A clear project name or article title gives people another path if a preview strips links.",
        ],
      },
      {
        id: "release",
        title: "Make the caption and the review step carry their own weight",
        paragraphs: [
          "Write the post caption after the slides are fixed. It should explain who the sequence helps and give a meaningful reason to open it, not repeat the cover with a second layer of adjectives. Share the exact file and proposed caption with the approver. Review that claims match the article and a disclaimer hasn’t been moved somewhere a reader can’t see it. A review date is useful only when it identifies the version that was checked. Replace and reapprove any card that changes a material fact.",
          "Publish the carousel as one useful derivative, not as a guarantee that visual posts outperform others. Read the replies for gaps in the explanation. If several readers ask what counts as a complete answer, that may be the next article or demonstration. Try a smaller sequence before investing in a complicated template; the first goal is an idea a reader can explain back. Automation can handle export requests or scheduling drafts, but the clarity of the sequence still comes from making editorial choices one slide at a time.",
        ],
      },
      {
        id: "redline",
        title: "Redline two weak slides before you test a template",
        paragraphs: [
          "Instead of ‘Unlock the power of content repurposing,’ try ‘Choose three clips before editing the webinar.’ The first cover makes no testable promise. The second tells a producer what the sequence will help them do. A weak second slide might say ‘Find compelling moments.’ Replace that with ‘Ask a colleague to watch the cut with no introduction. If they can’t explain the premise, keep more context or choose a different moment.’ Now a reader who closes the document early still leaves with a concrete test.",
          "At the example slide, don’t substitute generic illustrations for evidence. A simple diagram can show ‘context → example → result’ for a short clip with a clear ending; an overloaded diagram can force labels too small to read. Try the smallest screen you can reasonably support and ask another person to read the image at normal distance. A document that works only when pinched and scrolled is better as an article or a simpler sequence. Keep text and background contrast strong even on the least colorful cards.",
          "Finally, keep a small version record: the source article revision, the document filename, who checked the final file, and the associated caption. A shared template can make different topics look coherent, but a late swap is easy to miss if the export overwrites a path. The workflow is simplest when each reviewed document is immutable after approval and a correction creates a new one. That rule applies to one-person accounts too: give future you something you can audit without opening a design project.",
        ],
      },
    ],
  }),
  editorialArticle({
    slug: "agency-video-repurposing",
    keywords: [
      "agency video repurposing",
      "client approval workflow",
      "video handoff",
      "agency clip production",
    ],
    title:
      "Video repurposing for agencies: scope, client approvals, and delivery",
    description:
      "Set a clear repurposing scope, define which clips need approval, and deliver secure, versioned exports without adding unnecessary project overhead.",
    category: "Creator workflows",
    alt: "Two colleagues reviewing a wall of video stills in a post-production suite",
    links: [
      youtubeShorts,
      captionGuide,
      {
        href: "/blog/content-repurposing-workflow",
        label: "Design your internal review workflow",
      },
      {
        href: "/blog/video-repurposing-cost",
        label: "Estimate the cost per approved clip",
      },
      { href: "/pricing", label: "Zybble’s source-minute credit packs" },
    ],
    sections: [
      {
        id: "scope",
        title: "Price a reviewable batch instead of promising a clip count",
        paragraphs: [
          "Agency video repurposing goes wrong when the scope describes the ideal output but ignores the source. An hour-long panel can contain five concise, permission-cleared moments or pages of claims that require legal review. Before quoting a fixed deliverable, ask to see a representative source. Count source minutes, number of speakers, intended formats, languages, caption needs, and who approves. Decide what happens if there are fewer strong moments than the target. It’s better to revise the mix than pad the batch with repeats.",
          "Document the inputs separately from outputs. ‘Client will provide the original recording, confirmed spelling and roles, licensed music terms, and named approver’ is an input list. ‘Three review candidates and two approved vertical exports’ is an output statement. Specify whether the client can request additional aspect ratios, a clean master, or timed text, and whether they are part of the same review. Clear limits help your team avoid giving a quote for editing and quietly delivering three different publishing packages.",
        ],
      },
      {
        id: "consent",
        title: "Keep rights checks attached to source and destination",
        paragraphs: [
          "A release for a customer webinar may permit the live event and its replay without permitting every cut in a paid campaign. Verify your authority before pulling a quote or visual into another context. Keep a rights note on the source covering the speakers, venue, slides, music, and anything imported from an outside party. Ask which uses or platforms are excluded. If the original includes private information, ensure the proposed edit doesn’t reveal it through a slide in the background, an audible name, or the transcript delivered with the file.",
          "Use the same discipline with sourcing. Have the client provide media through a permissioned method, not a way to make a confidential file public just to test an integration. Label sources by project and avoid cross-client folders with inherited permissions. Confirm what happens to source media after delivery. If the contract allows only temporary retention, schedule deletion in the system that stores it and confirm which derivatives or backups are covered. Don’t promise a retention period you can’t actually enforce across your tools.",
        ],
      },
      {
        id: "approval",
        title: "Give reviewers a version and a precise checklist",
        paragraphs: [
          "Make the review packet small: the clip, the draft post copy and title, context for shortened statements, the destination, and when you need feedback. Ask marketing to confirm voice, a subject expert to confirm facts only when needed, and the client’s approver to confirm release. A reviewer should not have to infer whether they’re checking grammar or signing off a campaign claim. For internal transfer, mark the asset as review-only and use permissions appropriate for sensitive content instead of sending a public link to an unfinished edit.",
          "For example, an agency cuts a customer interview that says it took two days to set up an internal process for one team. The client approves the 40-second clip and headline for an organic post. A later request to use ‘Set up in two days’ in a sponsored ad changes destination and meaning. Send that change back for approval even though the video bytes might be identical. Track the scope of approval in the same record as the version. This prevents a ‘looks good’ message from becoming a blank check downstream.",
        ],
      },
      {
        id: "delivery",
        title: "Deliver a package your client can use without interpretation",
        paragraphs: [
          "For each approved item, name the clip with its project, version and intended destination. Deliver the verified output format, the matching timed caption file if part of scope, the thumbnail, and a final copy sheet. Keep clean and burned-in versions clearly distinguished. Preview on the devices and destinations in scope, including captions and placement. Trust actual export behavior rather than the project file’s settings. A clear delivery note can say which file to upload, what to post with it, and how to get help if an upload check fails.",
          "Add a simple change procedure to the handoff. A correction after publishing needs a named owner who can pause the queue, update or replace the relevant asset and record what happened. Don’t assume every destination supports the same replacement behavior. Confirm before promising a correction without impact to engagement or old links. For the next issue, be able to trace a final post back to the exact source excerpt, release decision, and delivery export. A one-page record can do this without an elaborate client portal.",
        ],
      },
      {
        id: "learn",
        title: "Review where the work took time before you expand the retainer",
        paragraphs: [
          "After a pilot, count the time spent on ingest, finding good moments, editing, caption correction, approvals, and revision. Compare attempted clips with accepted ones. A lower cost per draft can be irrelevant if acceptance drops. If reviewing the entire source is the bottleneck, teach the host to mark moments while recording. If revisions pile up over framing, record a short call about where the source will be seen instead of adding more checklists. Improve the most expensive handoff before promising a bigger batch.",
          "Offer a repeatable package after you know what the client can supply and approve at a steady pace. Include enough flexibility for a weak source without hiding the scope. The goal of a good agency workflow is not the maximum possible volume; it’s a set of useful, accurate posts with predictable turnaround, permissions, and costs. A specific pilot you can measure is worth more than an aggressive volume promise with no agreed definition of an approved clip.",
        ],
      },
      {
        id: "pilot",
        title: "Use a pilot to set an honest client expectation",
        paragraphs: [
          "For a first engagement, request one ordinary source instead of the highlight reel every client naturally wants to send. Give yourself a short discovery window. Return a moment map with reasons to retain two excerpts and reject two others. That document shows what the client’s footage actually supports and gives the people who control releases a chance to identify sensitive material before editors spend time on it. Agree whether rejection of an excerpt changes the output count, replaces the source, or converts the slot into a permitted text asset.",
          "A pilot handoff can include one version with captions burned in and a clean export for testing optional captions, if your scope allows it. Use the named approver’s actual review conditions: a phone on an ordinary connection, the title and caption next to the clip, and accessible text at the intended size. Record the review outcome against the version delivered. If the product shot fails because the camera never showed it clearly, the recovery may be to record a new insert, not another round of trimming the same video.",
          "Close the pilot with a brief written agreement about what improves the next recording. Examples include making claims in short complete sentences, leaving margin around slides, or arranging a consistent voice level. State what is outside the agency’s control, such as content rights the client hasn’t obtained or a destination that changes its posting requirements. This makes the next scope more accurate and gives the production team a small improvement it can verify without promising unrealistic throughput.",
        ],
      },
    ],
  }),
  editorialArticle({
    slug: "video-repurposing-cost",
    keywords: [
      "video repurposing cost",
      "cost per approved clip",
      "content production budget",
      "AI clipping costs",
    ],
    title: "Video repurposing costs: compare tools by cost per approved clip",
    description:
      "Compare subscriptions, source-minute pricing and manual editing using the same pilot, with examples that separate software fees from real delivery costs.",
    category: "Creator workflows",
    alt: "A stopwatch, calculator, memory card and lens on a violet-gray desk",
    links: [
      captionGuide,
      youtubeShorts,
      {
        href: "/blog/agency-video-repurposing",
        label: "Define an agency pilot and approval scope",
      },
      {
        href: "/blog/content-repurposing-workflow",
        label: "Identify bottlenecks before buying more automation",
      },
      {
        href: "/pricing",
        label: "Review Zybble’s actual one-time credit prices",
      },
    ],
    sections: [
      {
        id: "metric",
        title: "Count what you can publish, not what the tool can export",
        paragraphs: [
          "The cheapest video repurposing tool is not always the one with the lowest starting price. A workflow that presents a dozen candidates may still consume more editor time than a workflow that finds four strong clips. Compare both the cash cost and the minutes of work per approved clip. ‘Approved’ should mean the clip meets the same requirements in each trial: premise, rights, framing, caption quality, and final format. Decide whether a written derivative or an alternate aspect ratio counts separately before you start scoring the results.",
          "Track results on a small batch, not on an idealized pricing page. Choose similar recordings with permission to use them: a clean single speaker, a conversation with interruptions, and a presentation whose slides matter. Use the original media you control when possible. Keep the requested clip range and acceptance criteria comparable. If one tool fits a different stage, such as transcription or template design, compare it as part of a workflow rather than expecting it to compete for the same job. The unit of comparison is an approved delivery, not which toolbar has more buttons.",
        ],
      },
      {
        id: "unit",
        title: "Understand the thing each price actually buys",
        paragraphs: [
          "A flat monthly plan may include source or output limits, seats, or features restricted to another tier. A usage-based plan may count source minutes, exports, or paid processing capacity. Ask how fractions round, how revisions are counted, and whether unused capacity carries forward. A one-minute rounding boundary matters if you work with many short sources. A monthly cap matters if you record a few busy weeks and then pause. Read the exact plan and check applicable taxes and currency, rather than comparing a feature grid to an unrelated introductory price.",
          "Zybble’s public pack policy is one credit for one minute of standard processing, rounded up per verified source, with no credit expiration. That gives a different planning unit from a tool that counts every export. Don’t infer what a pack charges for a particular unsupported source or assume a calculator replaces verification. Estimate the expected run length from the source file and confirm the applicable quote when the service is available. Use public price pages for current amounts; record the quote and billing terms you actually used in the comparison sheet.",
        ],
      },
      {
        id: "example",
        title: "Work through one hypothetical comparison",
        paragraphs: [
          "Imagine a practice batch with 80 minutes of source material. A manual workflow takes three hours and delivers five approved clips. At a hypothetical internal labor rate of $40 an hour it costs $120, before storage. A tool-assisted version might spend $18 on processing and take 90 minutes of staff time. If four clips pass, that is $78 in total, or $19.50 per approved clip, compared with $24 per clip for the manual batch. These figures are illustrative, not claims about a specific product, result count, or normal editing speed.",
          "Run a sensitivity check. If the assisted batch needs another hour of caption repair, the $78 becomes $118 and the four approvals cost $29.50 each. That’s a more useful fact than ‘the tool saves time.’ If the manual process produces a second format at little additional effort because an editor already rebuilt the overlays, count it consistently in both trials. If the client expects delivery within a day, record duration as a separate measure; time and cost don’t always point to the same decision.",
        ],
      },
      {
        id: "hidden",
        title: "Include the costs that arrive after the first export",
        paragraphs: [
          "Record who reviews generated work and what they fix. Correcting routine punctuation costs less than verifying whether a speaker’s medical, financial, or legal caveat survived an edit. Consider how frequently someone needs the original timeline, clean files, alternate crops, or separate caption tracks. Review current accessibility guidance for closed versus open captions when that affects what you deliver. Include fees for storage, approved collaboration tools, or an extra editing step when they arise in the workflow. Don’t pad a comparison with unrelated features you’ll never use.",
          "Evaluate switching costs as well. Can you retrieve the final files and caption versions without keeping the subscription active? Can an editor restore a previous version? Can you explain which output was approved when a customer later asks about a statement? A simple archivability test is to ask another teammate to locate a source excerpt and the export using only your delivery records. If it takes ten minutes because the assets are scattered in individual accounts, you’ve found a real cost that won’t appear on a plan’s billing page.",
        ],
      },
      {
        id: "decision",
        title: "Decide with a baseline and one next experiment",
        paragraphs: [
          "Record cost per approved clip along with turnaround, failures, reuse limits, and editing quality. A high-touch client may justify a slower workflow when mistakes are expensive. A solo creator may instead care most about costs during inactive weeks. Create a baseline with the tools you already have before switching everything at once. Try changing only one stage, such as rough-cut selection or caption timing, and hold the rest constant. You’ll learn what changed rather than attributing every difference to a new subscription.",
          "Finish with one decision you can explain: continue, change one bottleneck, or stop. Avoid a vendor ranking based on a single ideal recording and don’t make a virality forecast from a cost spreadsheet. Re-run the comparison when your source quality, approval standard, or posting cadence changes. For most teams the useful question is ‘what is the smallest predictable workflow that delivers acceptable clips?’ A complete answer includes software spend, labor, rights, and evidence that the final exports can actually be used.",
        ],
      },
      {
        id: "worksheet",
        title: "Use the same worksheet for every tool you try",
        paragraphs: [
          "Create one row per source and one row per output review. On the source row, capture start format, runtime, transcription needs, estimated charges, and actual charges from the provider when available. On the output row, record time spent reviewing each proposed cut and the pass or fail reason. A wrong on-screen example, unusable subtitles, or a missing usage right is a concrete rejection. Do not average a five-minute review and a one-hour repair into one number without recording both; the difference changes what you should automate next.",
          "Keep a scenario column for low, normal and high publishing weeks. Suppose an occasional creator publishes once a month, an agency produces a weekly client batch, and a campaign team has a six-week peak. The same invoice can represent three different costs per approved asset because utilization differs. Don’t charge all spare capacity to one clip if it can legitimately roll forward, and don’t count unused capacity as savings if it expires or belongs to a tool you won’t use again. Write your assumption alongside the calculation.",
          "Finally, separate clean automation failures from ambiguous ones. A known rejected upload is a correctable test result. A timeout after generation may leave a processed asset or a provider charge that needs reconciliation. Use real receipts where available and report unknown cases separately rather than assigning them a zero cost. After the first round, show your sheet to the person who handles publishing. Their estimate of the last mile often changes the decision more than another comparison of list prices.",
        ],
      },
    ],
  }),
];
