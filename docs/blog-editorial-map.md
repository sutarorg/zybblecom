# Zybble journal overhaul

## Editorial standard

Brief before drafting. The research pass uses [Google's people-first guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [Search Essentials](https://developers.google.com/search/docs/essentials), and the [AI search guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide). Interpret result patterns as intent, not keyword volume or evidence for product claims. Prefer primary documents and reviewable examples to generic listicles. Keep titles descriptive, links crawlable, and alternatives honest. Do not claim product testing unless it was performed, or change the publication date to simulate freshness.

## Content map

The map assigns different jobs to related URLs. Planned rows are hypotheses, not completed research or copy.

| Slug | Primary keyword | Intent, reader, differentiation | Intended links | Status |
| --- | --- | --- | --- | --- |
| `opusclip-vs-descript` | OpusClip vs Descript | Buyer deciding where to edit the master; compare two meters and the approval loop | Podcast clips, framing, captions, credit pricing | Rewritten |
| `repurpose-io-alternatives` | Repurpose.io alternatives | Distribution operator replacing a channel-to-channel workflow, not simply finding clips | Hootsuite, Zapier/Buffer, workflow | Planned |
| `jasper-vs-copy-ai` | Jasper vs Copy.ai | Marketing operations lead assessing campaign writing versus workflow orchestration | AI repurposing, workflow | Planned |
| `castmagic-vs-podsqueeze` | Castmagic vs Podsqueeze | Podcast producer shopping for transcript-driven deliverables, not learning article craft | Podcast-to-blog, podcast clips | Planned |
| `opusclip-munch-vizard-pricing` | OpusClip vs Munch vs Vizard pricing | Buyer normalizing specific vendor plans and caps | Approved clip costs, OpusClip vs Descript | Planned |
| `youtube-video-twenty-posts` | 20 posts from one YouTube video | Creator looking for distinct ideas and a distribution slate | Technical YouTube export workflow, Canva tutorial | Rewritten |
| `zapier-buffer-repurposing-workflow` | Zapier Buffer repurposing workflow | Operator wiring an approval-to-queue automation with retries | Hootsuite, editorial workflow | Planned |
| `canva-ai-linkedin-carousels` | Canva AI LinkedIn carousel | Designer needing practical Canva steps and file validation | Carousel editorial guide, captions | Planned |
| `hootsuite-ai-repurposing-tools` | Hootsuite AI repurposing tools | Social lead deciding when publishing software is enough | Repurpose.io alternatives, workflow | Planned |
| `what-is-ai-content-repurposing` | what is AI content repurposing | Newcomer needing mental models, evidence boundaries, and risk examples | Workflow, YouTube formats, features | Planned |
| `repurpose-youtube-video` | how to repurpose a YouTube video | Editor preserving source rights, clean masters, and per-format production; not idea enumeration | Twenty posts, framing, captions | Rewritten |
| `podcast-clips` | how to make podcast clips | Producer selecting truthful excerpts from multi-speaker material | Captions, framing, podcast-to-blog | Planned |
| `short-video-captions` | short video captions | Short-form editor debugging accessibility, timing and delivery on phones | Framing, podcast clips, caption feature | Rewritten |
| `vertical-video-framing` | vertical video framing | Editor choosing what evidence must stay visible in a 9:16 composition | Captions, clip selection, framing feature | Rewritten |
| `content-repurposing-workflow` | content repurposing workflow | Editorial lead designing asset IDs, revision gates and ownership | Agency guide, automation, repurposing definition | Planned |
| `podcast-to-blog-post` | turn a podcast into a blog post | Writer building a standalone argument and verifying quotes; not tool selection | Castmagic vs Podsqueeze, podcast clips | Planned |
| `blog-to-linkedin-carousel` | turn a blog post into a LinkedIn carousel | Editor translating an argument into a visual sequence; platform/tool UI left to Canva tutorial | Canva guide, workflow | Planned |
| `agency-video-repurposing` | agency video repurposing | Agency owner scoping permissions, reviews, margins and client handoff | Workflow, costs, use cases | Planned |
| `video-repurposing-cost` | video repurposing cost | Owner comparing commercial models and total cost rather than just vendor tiers | Specific pricing comparison, agency guide | Planned |

## Individual briefs for this pass

Research checked **20 November 2026**. Search results informed framing; primary pages underpin article facts. No product trials or third-party approval metrics were collected.

### OpusClip vs Descript

- Secondary queries: transcript video editor, Descript Create Clips, OpusClip pricing and media credits. Podcasters and in-house editors need to know whether to replace or add a tool.
- Five comparison results reviewed for intent (Rend, AI Hustle Guy, AI Stack Picks, Kineo, ToolColumn). Several emphasize editor versus clipper; results disagree about automatic Descript selection and plan prices. Do not reuse their numbers or implied benchmarks.
- Primary sources: [OpusClip pricing](https://www.opus.pro/pricing), [OpusClip credit meter](https://help.opus.pro/docs/article/how-are-credits-consumed), [Descript pricing](https://www.descript.com/pricing), [Descript Create Clips](https://help.descript.com/repurpose/create-clips-from-your-content). Zybble checked in `src/config/{product,credit-packs,site}.ts`.
- Opportunity and structure: two lanes from the same recording, mobile-readable evidence matrix, actual U.S. entry price and workload arithmetic, qualification and version control, matched-sample acceptance test, one-tool/two-tool decision. Worked inputs are hypothetical, not performance measurements.

### Short video captions

- Secondary queries: caption timing, burned-in vs closed captions, subtitle placement, SRT and WebVTT. Viewers who need text and editors checking final renders are the audience, not caption-app buyers.
- Five results reviewed for intent (OneCraft, FastClips, CaptionCraft, CapCut, University of Minnesota). Common advice covers colors and line counts; fewer guides carry one misconception through timing, final-master syncing, and platform playback. Do not promote a single fixed pixel safe zone or universal caption speed.
- Primary sources: [W3C WAI](https://www.w3.org/WAI/media/av/captions/), [BBC Subtitle Guidelines](https://www.bbc.co.uk/accessibility/forproducts/guides/subtitles/), [YouTube Studio caption workflow](https://support.google.com/youtube/answer/2734796?hl=en), [CapCut auto-caption guide](https://www.capcut.com/resource/video-caption-generator).
- Worked example: timing strip with 0.00–3.00 s, a meaning-changing negation/number error, paired deliverables and a two-pass phone check. Layout begins with the example; long-form clinic follows.

### Vertical video framing

- Secondary queries: 16:9 to 9:16, center crop versus speaker tracking, full-frame fit, vertical interview layout. Editors need to keep the proof visible, not just fill the screen.
- Five results reviewed for intent (Recapo, Loopdesk, Klap, OpusClip, ClipSpeedAI), plus the separate Adobe search. Existing pages often treat tracking as the universal answer; one result confuses scale with retained image width. Derive the width and pixel budget from the ratios directly.
- Primary sources: [Adobe Auto Reframe](https://helpx.adobe.com/premiere/desktop/add-video-effects/commonly-used-effects/add-auto-reframe-effect-to-a-sequence.html), [OpusClip reframing](https://www.opus.pro/tools/vertical-video-maker), [YouTube Shorts eligibility](https://support.google.com/youtube/answer/15424877?hl=en).
- Structure: diagrams with matched geometries, four distinct shot breakdowns (interview, two-up podcast, screen tutorial, slide presentation), then crop verification at three critical moments. Original calculation: full-height portrait crop retains 81/256 of landscape width. No platform overlay coordinates assumed universal.

### Repurpose a YouTube video

- Primary query: how to repurpose a YouTube video; secondary: YouTube source file, YouTube to Shorts and landscape edits, clean video export. Intent: technical instruction for an editor with an existing long upload and at least two delivery shapes. The problem is loss of quality, evidence and rights when a published upload becomes the production master.
- Five results reviewed: [Sechno](https://sechno.com/posts/how-to-use-youtube-ai-tools-2026-to-repurpose-and-localize-videos-practical-shortcuts-for-us-creators/3125886), [CheckTheWorth](https://checktheworth.com/blog/repurpose-youtube-videos-to-shorts), [FaceStabilizer](https://facestabilizer.com/blog/repurpose-youtube-for-tiktok-reels-shorts), [BH Tech Review](https://www.bh-tech-review.com/one-long-youtube-video-everywhere-a-practical-workflow-for-vertical-shorts/) and [The Skill Journey](https://www.theskilljourney.com/how-to-repurpose-youtube-videos-across-all-platforms/). Common pattern is a vertical preset and shorter edit; some sources misstate the allowed format or duration. Opportunity: compare a clean file package with the platform remix route, use a per-deliverable edit/QA matrix, and show why the crop should be built from a clean master.
- Evidence: [download your uploads](https://support.google.com/youtube/answer/56100?hl=en), [Shorts eligibility and claims](https://support.google.com/youtube/answer/15424877?hl=en), [YouTube encoding recommendations](https://support.google.com/youtube/answer/1722171?hl=en), [YouTube captions](https://support.google.com/youtube/answer/2734796?hl=en). Structure: source inspection, worked source-to-derivatives example, render recipes, issue diagnosis and delivery. Original visual: one source frame branching into three canvas shapes. No promise of a post count.

### Twenty posts from one YouTube video

- Primary query: turn one YouTube video into 20 posts; secondary: repurposing examples, 20 content ideas, creator distribution plan. Intent: planning, for a solo educator or lean content team with one fact-rich recording and an established audience. Problem: duplicate talking points and joining too many channels at once.
- Five results reviewed: [OverseerOS](https://www.overseeros.com/blog/youtube-content-repurposing-workflow), [New Zenler](https://www.newzenler.com/blog/content-repurposing-system-creators-2026), [AIWorkflowPro](https://aiworkflowpro.com/modal-transformation-new-trend-in-content-creation/), [Repurpose Your Content](https://www.repurposeyourcontent.com/blog/repurpose-you-tube-videos-for-social-media), [Eliro](https://eliro.pro/blog/top-10-ways-repurpose-video-20-pieces). Frequent gaps: counting one file across channels, treating a thumbnail or subject line as a standalone post, and assuming time or reach multipliers. Exclude those shortcuts.
- Evidence: [YouTube Posts formats and scheduling](https://support.google.com/youtube/answer/7124474?hl=en), [related video from a Short](https://support.google.com/youtube/answer/14075157?hl=en), [YouTube Insights](https://support.google.com/youtube/answer/9002587?hl=en). Structure: fictional small-studio tutorial, evidence bins, four sets of five numbered standalone ideas, first-week priorities and multiweek slate, measurement and kill rules. Original visual: studio-plan reference feeding four rows of editorial cards. Refer technical editing to the companion guide; no ranking or output guarantees.

## Pass-one delivery and verification

| Slug | Published title | Rendered words¹ | Original composition |
| --- | --- | ---: | --- |
| `opusclip-vs-descript` | OpusClip vs Descript: Which Fits Your Editing Workflow? | 1,887 | Split verdict, accessible comparison matrix, pilot, plan-meter sidebar and approved-clip calculation |
| `short-video-captions` | Short video captions: Fix timing, wording, and placement | 1,605 | Dark timing clinic with corrected cues, anchored sidebar and two-pass release check |
| `vertical-video-framing` | Vertical video framing: Crop, track, or keep the full frame? | 1,505 | Three crop diagrams, retained-width calculation, shotbook and a frame-review audit |
| `repurpose-youtube-video` | How to repurpose a YouTube video: Source files, edits, and exports | 1,504 | Production step rail, three delivery recipes and a timecoded handoff log |
| `youtube-video-twenty-posts` | How to turn one YouTube video into 20 distinct posts | 1,632 | Source log, four numbered editorial collections and a four-week distribution slate |

¹ Counts include rendered editorial headings, examples and UI labels, excluding the references list. Illustrations are original SVG compositions rendered to optimized 1200 × 675 WebP with `scripts/editorial/first-pass-covers.mjs`, not product screenshots. No URLs or original publication dates were changed. Modified dates are only recorded for rewritten entries. The other 14 original articles remain in the publication inventory and use the existing article layout.

Server views: `src/components/marketing/articles/`. Route, metadata and sitemap implementation: `src/app/(marketing)/blog/[slug]/page.tsx`, `src/lib/seo/metadata.ts` and `src/app/sitemap.ts`. Per-article metadata stays in the existing catalog under `src/config/articles/`.

Passed: lint, typecheck, all 46 contract tests, DB tests, production build, `git diff --check`, and homepage HTTP SEO smoke. Local Chromium `scripts/qa/journal.mjs` checked all 19 server responses, sitemap entries, unique titles/descriptions, self-canonicals, schema, original cover dimensions, 18 internal destinations and listing pagination, categories, and search. It also checked the five rebuilt article structures at 320, 390, 768 and 1440 pixels, decoded their rendered images, confirmed the comparison table scrolls with the keyboard, and observed no console errors on those journeys. Primary references were checked for the five rewrites. The remaining 14 still need independent source review, briefs, original layouts, and full editorial QA. No live vendor trial or production deployment was performed.
