# Zybble editorial rebuild — staging and resume record

**Both thumbnail-generation sessions are finished.** Session 1 generated 10 plates; after the user's exact `continue`, Session 2 generated nine more. All 19 final WebPs are staged at their original paths on `arena/20b78b99-zybblecom`. The first ten were not modified during Session 2. Three researched rewrites use the shared article frame; the other 16 are still baseline articles. Nothing has been pushed, merged or deployed.

## Recovery checkpoint and ownership

- Local annotated tag: `blog-rebuild-checkpoint-20b78b99`, at `d2e76ba770f4b74a6b30e79a51968acdfe952641`. The same SHA is the branch base and is recoverable from Git even if the local tag is not carried across sandboxes.
- Catalog: `src/config/editorial.ts` imports `src/config/articles/{comparisons,creator-guides,video,workflows}.ts`. `src/config/articles/shared.ts` builds the public image URL from the slug. Repo reference scan identified the blog detail, listing cards, metadata/BlogPosting, QA and a historical image generator. No non-blog consumer of the specific cover filenames was found. All 25 tracked public media files outside `public/images/blog/` matched their original SHA-256 hashes.
- Do not rerun `scripts/editorial/first-pass-covers.mjs`; it is the previous redesign's illustrator and writes to live filenames.

## Baseline article and media inventory

| No. | Slug | Baseline title | Category | Cover path |
| --- | --- | --- | --- | --- |
| 01 | `opusclip-vs-descript` | OpusClip vs Descript: Which Fits Your Editing Workflow? | Video repurposing | `public/images/blog/opusclip-vs-descript.webp` |
| 02 | `repurpose-io-alternatives` | Best Repurpose.io Alternatives for Creators Who Want AI Tools | Creator workflows | `public/images/blog/repurpose-io-alternatives.webp` |
| 03 | `jasper-vs-copy-ai` | Does Jasper or Copy.ai Repurpose Your Blog Content Better? | Creator workflows | `public/images/blog/jasper-vs-copy-ai.webp` |
| 04 | `castmagic-vs-podsqueeze` | Turn Podcasts Into Blog Posts Using Castmagic or Podsqueeze | Creator workflows | `public/images/blog/castmagic-vs-podsqueeze.webp` |
| 05 | `opusclip-munch-vizard-pricing` | Opus Clip, Munch and Vizard Pricing Compared for Creators | Video repurposing | `public/images/blog/opusclip-munch-vizard-pricing.webp` |
| 06 | `youtube-video-twenty-posts` | How to turn one YouTube video into 20 distinct posts | Creator workflows | `public/images/blog/youtube-video-twenty-posts.webp` |
| 07 | `zapier-buffer-repurposing-workflow` | Build an AI Repurposing Workflow With Zapier and Buffer | Creator workflows | `public/images/blog/zapier-buffer-repurposing-workflow.webp` |
| 08 | `canva-ai-linkedin-carousels` | Turn Blog Posts Into LinkedIn Carousels Using Canva AI | Creator workflows | `public/images/blog/canva-ai-linkedin-carousels.webp` |
| 09 | `hootsuite-ai-repurposing-tools` | Why Some Hootsuite Users Consider AI Repurposing Tools | Creator workflows | `public/images/blog/hootsuite-ai-repurposing-tools.webp` |
| 10 | `what-is-ai-content-repurposing` | What Is AI Content Repurposing and Why Does It Matter? | Video repurposing | `public/images/blog/what-is-ai-content-repurposing.webp` |
| 11 | `repurpose-youtube-video` | How to repurpose a YouTube video: Source files, edits, and exports | Video repurposing | `public/images/blog/repurpose-youtube-video.webp` |
| 12 | `podcast-clips` | How to make podcast clips that work without the full episode | Video repurposing | `public/images/blog/podcast-clips.webp` |
| 13 | `short-video-captions` | Short video captions: Fix timing, wording, and placement | Video repurposing | `public/images/blog/short-video-captions.webp` |
| 14 | `vertical-video-framing` | Vertical video framing: Crop, track, or keep the full frame? | Video repurposing | `public/images/blog/vertical-video-framing.webp` |
| 15 | `content-repurposing-workflow` | Build a content repurposing workflow that won’t publish the wrong version | Creator workflows | `public/images/blog/content-repurposing-workflow.webp` |
| 16 | `podcast-to-blog-post` | Podcast to blog post: turn a conversation into a useful article | Creator workflows | `public/images/blog/podcast-to-blog-post.webp` |
| 17 | `blog-to-linkedin-carousel` | How to turn a blog post into a LinkedIn carousel without copying paragraphs | Creator workflows | `public/images/blog/blog-to-linkedin-carousel.webp` |
| 18 | `agency-video-repurposing` | Video repurposing for agencies: scope, client approvals, and delivery | Creator workflows | `public/images/blog/agency-video-repurposing.webp` |
| 19 | `video-repurposing-cost` | Video repurposing costs: compare tools by cost per approved clip | Creator workflows | `public/images/blog/video-repurposing-cost.webp` |

## Session 1 cover manifest

The illustration tool generated exactly 10 distinct art plates without text or logos. `scripts/editorial/compose-blog-cover.mjs` adds the Zybble lightning from `public/icon.svg`, high-contrast typeset headlines and sourced marks on a fixed dark editorial grid. The compositing script takes a plate, exact title lines, mark paths or plain labels, and an output path; use it again for covers 11–19. Every final image is WebP, inspected on a card-size preview and at final resolution. For session 2, keep key artwork clear of the first 600 px.

| No. | Final path | Exact headline | Dimensions | Bytes | SHA-256 |
| --- | --- | --- | --- | ---: | --- |
| 01 | `public/images/blog/opusclip-vs-descript.webp` | OPUSCLIP vs DESCRIPT | 1200 × 675 | 57,490 | `922d18d2784692d0085a69b16aea296d7565bfb91058be66534ba70dfdb47829` |
| 02 | `public/images/blog/repurpose-io-alternatives.webp` | BEST REPURPOSE.IO ALTERNATIVES | 1200 × 675 | 73,970 | `4b1948c4c8db36d2a7fd597794e7572951b5e428086fd8289566dadfd09d3308` |
| 03 | `public/images/blog/jasper-vs-copy-ai.webp` | JASPER vs COPY.AI | 1200 × 675 | 65,020 | `47ee7b668297bfcc3bb8bacc8aa679a448b289260c7f868909c8054f108aadff` |
| 04 | `public/images/blog/castmagic-vs-podsqueeze.webp` | CASTMAGIC vs PODSQUEEZE | 1200 × 675 | 41,400 | `d315fbc625d5c8a75d77a832271e7670bbeacb884d098ffd5eded4ec85b819f0` |
| 05 | `public/images/blog/opusclip-munch-vizard-pricing.webp` | AI CLIPPER PRICING COMPARED | 1200 × 675 | 70,152 | `08a2d27ca7ac4ac776fe3802aa8c362426de45c63215fd8a76cefa0099be9cda` |
| 06 | `public/images/blog/youtube-video-twenty-posts.webp` | 1 VIDEO → 20 CONTENT IDEAS | 1200 × 675 | 84,288 | `d7c7ad62cdd0f0d57e11a9cb3ed81ef43ddd35919da65fa87d2d975978f0275f` |
| 07 | `public/images/blog/zapier-buffer-repurposing-workflow.webp` | AUTOMATE YOUR CONTENT WORKFLOW | 1200 × 675 | 39,762 | `bcfc40b14ea34b0efb240bb5005cfa2d899b9535f19268547484f14d9bd5fb5a` |
| 08 | `public/images/blog/canva-ai-linkedin-carousels.webp` | BLOG → LINKEDIN CAROUSEL | 1200 × 675 | 43,890 | `34bb228884f04706da0dbabb7bbd617c738ba5d8185272ee4d3bbdca023b2771` |
| 09 | `public/images/blog/hootsuite-ai-repurposing-tools.webp` | HOOTSUITE vs AI REPURPOSING | 1200 × 675 | 68,872 | `5e15b8e2b32f958a517c0f14c93acdde347617bf8bf83aa8c4a8cd2a74f446bd` |
| 10 | `public/images/blog/what-is-ai-content-repurposing.webp` | WHAT IS AI CONTENT REPURPOSING? | 1200 × 675 | 53,340 | `a1e01534e93da7d446d73133fc325ee61d19ac85576a4af078117b5359c6a883` |

### Mark provenance and open items

- [OpusClip Media](https://media.opus.pro/), [Descript release notes](https://feedback.descript.com/changelog/release-version-84), [Repurpose.io](https://repurpose.io/), [Jasper brand](https://www.jasper.ai/brand), [Copy.ai](https://copy.ai/), [Castmagic](https://www.castmagic.io/tools/ai-note-taking), [Podsqueeze](https://podsqueeze.com/podcast-topics-ideas/), [Munch Studio](https://www.munchstudio.com/), [Vizard](https://vizard.ai/about), [Zapier newsroom](https://zapier.com/press), [Buffer](https://buffer.com/open-source), [Hootsuite](https://blog.hootsuite.com/social-led-brands-are-the-future/), [YouTube brand resources](https://www.youtube.com/howyoutubeworks/resources/brand-resources/) and [Instagram brand resources](https://about.meta.com/uk/brand/resources/). Marks were handled separately from illustrations and scaled proportionally. Private usage authorization has not been independently verified; review requirements before publication.
- Canva and LinkedIn (covers 06/08) and TikTok (cover 10) use plain text identifiers, not drawn marks. [Canva integration guidelines](https://www.canva.dev/docs/connect/guidelines/brand/) do not establish permission for standalone use; [LinkedIn's brand policy](https://brand.linkedin.com/policies) limits blog logo use; no suitable standalone TikTok asset for this context was verified. These are exceptions to the full logo requirement, not a claim that all marks have been cleared.

## Remaining editorial work

- Google Search Central guidance reviewed: [Helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), and [Search Essentials](https://developers.google.com/search/docs/essentials). Use original analysis, readable crawlable links, and URL stability rather than artificial length or freshness. See `docs/blog-rebuild-research.md` for the first three rewrites and partial research. Do not publish the staged mix of new and old articles.
- The current unified-layout requirement supersedes the older five custom article views. The shared frame and body-only word-count check now serve three rewritten records. After independently researching and rewriting the other 16, remove the obsolete variants and old copy without changing routing, canonical URLs, or unrelated media. Keep the technical YouTube clip workflow distinct from the idea plan; keep design-tool operation distinct from carousel editorial sequencing; keep podcast editorial method distinct from shopping for podcast software.
- Verify all 19 final titles, links, metadata, sitemap, images, layout, test suites, and production build before opening the completed replacement for deployment. No further image generation is needed. Confirm mark permission and the currently documented exceptions before considering the covers publishable.

## Session 1 verification results

- Passed `npm run lint`, `npm run typecheck`, `npm run test:contracts` (46/46), `npm run test:db`, `npm run build`, and `git diff --check`.
- Local Chromium decoded all 10 new card thumbnails and full article covers at 390, 768 and 1440 px. The direct HTTP responses matched the manifest SHA-256 hashes. No page errors, broken image responses or article overflow were observed. The existing `scripts/qa/journal.mjs` also passed for all 19 routes.
- All nine deferred blog images were verified unchanged against the checkpoint. No other public image, icon or media file changed. No article body, layout or URL changed; alt text for covers 01–10 was updated to describe the new artwork.

## Session 2 cover manifest

The second authorized batch generated exactly nine distinct plates. The final composited covers and descriptive alt text replace the prior artwork at the same paths. All 19 hashes are unique; covers 01–10 still match the Session 1 table.

| No. | Final path | Exact headline | Dimensions | Bytes | SHA-256 |
| --- | --- | --- | --- | ---: | --- |
| 11 | `public/images/blog/repurpose-youtube-video.webp` | YOUTUBE VIDEO → SHORTS | 1200 × 675 | 81,668 | `21ea2e83e2f78966acc5e5084c5e5401d20efa5b6b0189efba40f1062498d3cf` |
| 12 | `public/images/blog/podcast-clips.webp` | TURN PODCASTS INTO CLIPS | 1200 × 675 | 42,922 | `ffc57883f1f51dc9c915c87360769b00602f0a9546ac6812536df875c7742a1f` |
| 13 | `public/images/blog/short-video-captions.webp` | AI VIDEO CAPTIONS GUIDE | 1200 × 675 | 42,102 | `78781635ae9b7df79824617b29fc42b68ef0dd7e74cb7d02fbbb62c3fad032c1` |
| 14 | `public/images/blog/vertical-video-framing.webp` | MASTER 9:16 VIDEO FRAMING | 1200 × 675 | 48,226 | `35be5dc23f0ef9b738f9787567b57343b44aef5870877b397c0f1e4235ca07ec` |
| 15 | `public/images/blog/content-repurposing-workflow.webp` | THE COMPLETE CONTENT WORKFLOW | 1200 × 675 | 62,940 | `23266a543b4a149aefc65c1c8c142cff8c925919190c8a8689f7892be7f1f1ce` |
| 16 | `public/images/blog/podcast-to-blog-post.webp` | PODCAST → BLOG POST | 1200 × 675 | 48,318 | `55c44fbb01fa28f25ad6beebce2c2366cdfc04139dbb2e078d69f10d96ed8c5e` |
| 17 | `public/images/blog/blog-to-linkedin-carousel.webp` | BLOG → LINKEDIN SLIDES | 1200 × 675 | 51,864 | `fcfdd1a1f2076efd05a9647612ea9f7f986ef3e436e8cd90ce92e2d564146c30` |
| 18 | `public/images/blog/agency-video-repurposing.webp` | VIDEO REPURPOSING FOR AGENCIES | 1200 × 675 | 52,812 | `fd069304834ab6403b1569cd98f2147dbefdb7fd5237f757257c7b0a341f56fd` |
| 19 | `public/images/blog/video-repurposing-cost.webp` | HOW MUCH DOES VIDEO REPURPOSING COST? | 1200 × 675 | 47,174 | `562c2317bfad0c2ae2945e8d32345797e72d9a5f50c39841e542a186ea79bdd7` |

- Cover 11 uses the Shorts lockup from the [official YouTube announcement](https://blog.youtube/news-and-events/introducing-youtube-shorts-fund/); covers 12, 13 and 15 use [YouTube](https://www.youtube.com/howyoutubeworks/resources/brand-resources/) and [Instagram](https://about.meta.com/uk/brand/resources/) official source assets. Sourcing does not establish publication permission.
- Cover 13 uses a plain TikTok label and cover 17 uses a plain LinkedIn label for the same reasons documented above. No claim is made that these are official marks. Covers 14, 16, 18 and 19 are platform-agnostic and do not introduce a third-party logo.
- Only the 19 blog cover image files changed under `public/`; the replaced bytes remain recoverable in the checkpoint.

### Session 2 verification and handoff

- Inspected the nine new files at 1200 × 675 and at 410 px wide. Revalidated 19 unique manifest hashes, with the ten original Session 1 hashes unchanged. No unrelated public asset changed.
- `npm run lint`, `npm run typecheck`, `npm run test:contracts` (46/46), `npm run test:db`, `npm run build` (77 pages generated), and `git diff --check` passed for this staging milestone.
- The updated `scripts/qa/journal.mjs` passed for all 19 routes, direct image bytes, 18 internal targets, canonical/OG/Twitter metadata and structured data, listing pagination/category/search, all 19 cards and detail covers at 390/768/1440 px, and the three shared-frame articles plus two remaining bespoke layouts at 320/390/768/1440 px. It also verified keyboard scrolling of the comparison table and that the content plan has exactly twenty numbered entries.
- The three new edition bodies use the shared responsive frame, while baseline articles still use their previous layouts. The three replaced bespoke components are recoverable and are not selected for the new editions; remove the old renderer registry, old components and fallback record shape once all articles have migrated and the final regression checks pass. The contracts test deliberately supports both shapes only during staging.
- Next: complete the independent research and 1,000+ genuine body words per outstanding slug; verify all 19 in the shared frame; verify vendor pricing immediately before publication; resolve mark permissions, finish cleanup and rerun final QA. No push, PR, merge or deployment was performed.
