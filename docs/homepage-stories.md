# Homepage sample clips and testimonials

Sample Clips and Testimonials sit immediately after Use Cases and before Pricing. Only publish approved review wording in `src/config/homepage-testimonials.ts`. The portraits in `public/images/testimonials` are fictional AI illustrations, not likenesses.

The five supplied clips are served from `public/media/samples/` with neutral file names, browser-compatible H.264/AAC streams, and fast-start MP4 containers. Lightweight WebP posters are extracted from each clip; video bytes are requested only on interaction. Replacements go in the same directory and are registered in order in `src/config/homepage-samples.ts`. If available, add WebVTT captions for spoken audio. Publish only media you have permission to use. The page does not depend on Drive embeds or links.

Every clip plays with sound and without a native player HUD. If the browser blocks audible hover playback, click or tap the clip itself to start it; clicking or tapping again pauses it. Keyboard users can activate the focused clip with Enter. The loop stops on hover, keyboard focus, touch drag, player selection, or reduced motion. When the list is focused, arrows move through the loop, Space pauses or resumes it, and Escape stops in-card playback.

For local Chromium QA, run `ORIGIN=http://localhost:3000 node scripts/qa/homepage-stories.mjs` using the browser tooling from `scripts/qa/browser.mjs`. The test verifies the five shipped assets and carousel behavior. `EXPECT_SAMPLE_MEDIA=0` instead exercises the no-media fallback in an intentionally unconfigured build.
