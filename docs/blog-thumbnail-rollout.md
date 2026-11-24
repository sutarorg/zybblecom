# Blog thumbnail rollout

**Complete: 19 of 19.** Session 1 generated 10 images. Session 2 generated exactly nine more after the explicit user message `continue`. The first ten were preserved and verified against the session 1 hashes. The collage was not accessible in the workspace during session 1; the supplied art direction, individual concepts, and Zybble palette guided the work.

## Session 1: completed and verified

Each file is a separate AI-generated illustration, inspected individually before replacement and optimized to **1200 × 675 WebP (16:9)**. Names are small typographic identifiers applied after generation, not generated wordmarks. The Zapier wordmark was composited from [Zapier’s official newsroom press assets](https://zapier.com/press). Zybble’s official mark was composited from `public/icon.svg`. Other competitor names use neutral type where a suitable mark was not verified. The illustrations are conceptual and contain no product screenshots or price claims.

| No. | Existing canonical image path (replaced in place) | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| 01 | `public/images/blog/opusclip-vs-descript.webp` | 35,064 | `08f67697ddb4d8756ebe3ae6703a7a029de593028ccfc838b5d669e958c4c260` |
| 02 | `public/images/blog/repurpose-io-alternatives.webp` | 50,640 | `04abeb83e9f4bc8e4febf7e9780f8c0a6a9f41998537090bddfa582fe3a9ed4a` |
| 03 | `public/images/blog/jasper-vs-copy-ai.webp` | 57,486 | `046d7850eb5a1f37a3a64d789664b17dcba0d165e87322873b638cdf2a39b8d6` |
| 04 | `public/images/blog/castmagic-vs-podsqueeze.webp` | 60,572 | `8e2fd080df323bf1a0adec8e7b25a5d435f6ecaa7dabb0b6e997857f1a4360ae` |
| 05 | `public/images/blog/opusclip-munch-vizard-pricing.webp` | 56,796 | `da42f75b14ae5a0d9adf68f0163719fd8f3855051e317efc6cc7435cd3f9ca3d` |
| 06 | `public/images/blog/youtube-video-twenty-posts.webp` | 67,632 | `5d417a1c6072c721f440c120cedfa9460393e0aa55b3129cee7ac27b37c0098d` |
| 07 | `public/images/blog/zapier-buffer-repurposing-workflow.webp` | 63,024 | `4956cc421ac27309b66125fbc0de45c4586f527a3d8fc9750c9c6f9349f8f3a1` |
| 08 | `public/images/blog/canva-ai-linkedin-carousels.webp` | 67,496 | `3e1418aaad3d4ea68ab8e1b70092e3395912b4714f36ab40b9427b0ae925622c` |
| 09 | `public/images/blog/hootsuite-ai-repurposing-tools.webp` | 59,776 | `b8007c9851b885ab8a1ace24942adb85efcb39347071071c458cf8226f8f2c0e` |
| 10 | `public/images/blog/what-is-ai-content-repurposing.webp` | 95,056 | `15439918396bb8e4a7934fb381f6383eb985c680708b63654fa38f4e41e18892` |

Verification: all 19 full-size image URLs returned the repository WebP bytes; local Chromium decoded every journal card and article cover at 390, 768, and 1440 px with no broken image responses or page overflow. The technical YouTube article retains its existing wide cover crop. `scripts/qa/journal.mjs` also passed for the 19 article responses, metadata, schema, internal links, and journal pagination, filtering, and search. Lint, typecheck, all 46 contract tests, production build, and `git diff --check` passed. Only alt text changed in the article definitions. The nine deferred assets are byte-for-byte unchanged from the branch base (`7ee5703`). No obsolete separate public assets were left behind: the same-path replacements were installed only after staging and decoding, and temporary old copies were removed after browser verification.

## Session 2: completed and verified

The nine illustrations were generated individually and visually reviewed. An incidental logo-like symbol on the cost thumbnail was removed during optimization without generating another image. All files are **1200 × 675 WebP (16:9)**.

| No. | Existing canonical image path (replaced in place) | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| 11 | `public/images/blog/repurpose-youtube-video.webp` | 105,188 | `711ea0ae136fc0fd800b825c75f56349e2121805c49a1f99512591d4473dc917` |
| 12 | `public/images/blog/podcast-clips.webp` | 56,444 | `b8fb9113b81a27fd9418e12cff808d5895e2df0f0f6df43127115f46d8af4b1b` |
| 13 | `public/images/blog/short-video-captions.webp` | 41,014 | `e6bc1f3aa5c2ef02f23a5a5cf6aa1e83a75cc4282f7f7306537a8a5e3bfc5d7e` |
| 14 | `public/images/blog/vertical-video-framing.webp` | 71,372 | `9478ef3b4b622b1e57c03f7ebfffc4a1b0d9d118d88c80a39581924e55c17fa7` |
| 15 | `public/images/blog/content-repurposing-workflow.webp` | 76,056 | `ba3e6acf0daa1af9825d5d654d4fef1a04552c6ae054e178b83bdc989cf2b5d8` |
| 16 | `public/images/blog/podcast-to-blog-post.webp` | 109,018 | `0ac583324f7fda510a9293f3fe5e3e7098eb5ba8d18aacedec49b2635ebc9b8d` |
| 17 | `public/images/blog/blog-to-linkedin-carousel.webp` | 59,586 | `a6d7f009dd9af5450415b6321ed75b501d0057616b0396400deb3fe9fcfcebd7` |
| 18 | `public/images/blog/agency-video-repurposing.webp` | 90,174 | `c8f90f7ead6762bc2a9be9b94420349cb495362f032ef032a7fb58a3ce367792` |
| 19 | `public/images/blog/video-repurposing-cost.webp` | 57,170 | `30c4e746fe9c7ee83ad3f718f226a00753e8aa850ff129c5cf9069de3b9afa21` |

## Final verification

- The first 10 hashes match the session 1 record, all 19 final hashes are distinct, and all 19 original files differ from the new assets. Every full-size image URL returned the exact WebP bytes on disk. No unrelated assets were removed.
- Local Chromium decoded all 19 article covers and listing cards at 390, 768 and 1440 px. All 54 tested responsive image variants matched the new artwork. No broken image responses, page errors, or horizontal overflow were observed. The technical YouTube article retains its existing desktop crop.
- `scripts/qa/journal.mjs` passed on all 19 routes, including sitemap, titles, descriptions, canonicals, schema, 18 internal destinations, and journal pagination, filtering and search.
- `npm run lint`, `npm run typecheck`, `npm run test:contracts` (46/46), `npm run build`, and `git diff --check` passed. The article configurations changed only in image alt text. No article content, URLs, metadata structure, categories, or layouts changed.
- The old `scripts/editorial/first-pass-covers.mjs` script belongs to the previous editorial redesign. Do not rerun it against these replacements. No production deployment was performed.
