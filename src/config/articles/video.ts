import {
  captionGuide,
  editorialArticle,
  youtubeCaptions,
  youtubeShorts,
} from "./shared";

export const videoArticles = [
  editorialArticle({
    slug: "repurpose-youtube-video",
    keywords: [
      "YouTube content repurposing",
      "video to social posts",
      "long video to shorts",
      "YouTube repurposing plan",
    ],
    title:
      "How to turn one YouTube video into 20 posts without repeating yourself",
    description:
      "Build a twenty-post plan from one original YouTube video with standalone edits, written takeaways, audience questions, and a simple publishing schedule.",
    category: "Video repurposing",
    alt: "A creator at a recording desk with video stills on a nearby editing monitor",
    featured: true,
    links: [
      youtubeShorts,
      youtubeCaptions,
      {
        href: "/blog/short-video-captions",
        label: "Make captions easier to read on a phone",
      },
      {
        href: "/blog/content-repurposing-workflow",
        label: "Build a repeatable content repurposing workflow",
      },
      { href: "/resources", label: "Zybble’s creator resources" },
    ],
    sections: [
      {
        id: "source",
        title: "Pick one video that can answer several different questions",
        paragraphs: [
          "If you want to repurpose a YouTube video into twenty posts, don’t start by asking an editor to cut it into twenty pieces. Most recordings have a few strong moments and plenty of connective material. The opening is a welcome, the middle contains explanations and examples, and the closing sends people somewhere else. Reusing all of that equally creates a queue full of introductions. Aim for a mixture of video, text, and visual posts, each with an argument or action worth someone’s attention.",
          "Find the original file for a recording you own or are authorized to reuse. A useful source could be a 34-minute tutorial about setting up a tiny recording room. It contains a noise test, an inexpensive treatment, a microphone-placement demo, an equipment trade-off, and a repeatable checklist. Before committing to a batch, make sure the same permission covers the guest, slides, photos, and music in your proposed derivatives. Being allowed to publish the original episode does not automatically settle every reuse question.",
        ],
      },
      {
        id: "map",
        title: "Build a moment map before editing",
        paragraphs: [
          "Watch the recording at normal speed once. In a sheet, write a start and end timestamp, the question the segment answers, the strongest line, and the caveat that changes its meaning. Add a column called ‘must see’: mark actions, comparison footage, and numbers on a slide that will disappear if the crop is too tight. A transcript is useful for searching a phrase, but the transcript won’t tell you that the speaker is holding the wrong microphone in the first shot.",
          "In the recording-room example, one thought might start at 06:14 where the host says ‘the best noise test costs nothing’ and finish at 07:07 after comparing two positions. Capture the moment where the host mentions that the second take used the same gain. Without that line, a viewer might mistake a settings change for a quieter room. Keep a source reference on every proposed post even when the final edit rearranges sentences or rewrites them for another format.",
        ],
      },
      {
        id: "twenty",
        title: "Make a twenty-post mix with five different jobs",
        paragraphs: [
          "Posts 1–5 are short videos: the noise test, a close-up mic demo, the most common mistake, a surprising constraint, and a small before-and-after. Give each a separate promise instead of writing five versions of ‘watch the full video.’ Posts 6–9 are visual assets: a placement diagram, a troubleshooting checklist, a simple decision tree, and a photograph with an annotated setup. If the video has no good frame for a diagram, draw a new one. Don’t stretch a blurry screenshot until the labels are unreadable.",
          "Posts 10–13 are text-first: a concise how-to, a post on one trade-off, a response to a thoughtful comment, and a transcript quote with your editor’s context. Posts 14–17 are conversation starters: ask people what room constraint they have, invite a choice between two setups, collect a question for the next tutorial, and publish a follow-up based on actual replies. Posts 18–20 are deeper assets: a resource roundup, an email with one exercise, and a short companion guide that links back to the original video. If any slot repeats an existing promise, skip the slot rather than fill it mechanically.",
        ],
      },
      {
        id: "edit",
        title: "Edit each clip for the person who hasn’t seen the source",
        paragraphs: [
          "Start on a complete thought. ‘Move your microphone closer before you buy acoustic panels’ gives a stranger something to evaluate; ‘so that’s why I do it this way’ asks them to solve context you removed. Put a useful demonstration near that opening when the source supports it, and end once the claim is proved. Don’t turn a qualified recommendation into an absolute one just because an absolute headline sounds better. If the clip no longer makes sense with the screen turned away and only the audio playing, review how much visual explanation is required.",
          "Decide on framing after you know what needs to remain visible. A face-first answer can work as a narrow portrait crop. A demonstration involving two microphone positions may need the whole frame and an insert. Review the exported clip at actual phone size, with sound off and again with it on. Correct names, units, and negations in captions before adapting them to another feed. For standard YouTube channels, eligible square or vertical uploads can be Shorts up to three minutes under YouTube’s current rules; that is a ceiling, not a target for every idea.",
        ],
      },
      {
        id: "publish",
        title:
          "Publish in rounds, then use evidence to plan the next recording",
        paragraphs: [
          "Put the clearest standalone tip in the first round. Pair it with a text or visual post that covers a different angle, not a duplicate posted a day later. Leave some slots unscheduled so you can use real questions from the audience. A useful two-week plan might publish six assets in the first week and six in the second, then reserve the rest as evergreen material. Record the destination, version, posting date, and URL. Write a distinct opening line and next step for each destination instead of copying a call to action that refers to a control the destination doesn’t have.",
          "At the end of the cycle, compare like with like. A checklist can be useful because people save it; an interview clip might work because it sends the right people to the episode. Keep notes on mismatches too. If viewers ask the same beginner question under three exports, put the answer into the next source recording. The most valuable output may be that editorial instruction, not an extra post. Start with one source and a mixed batch small enough to review. Twenty is the size of a plan, not a guarantee about how many clips or posts a recording can support.",
        ],
      },
      {
        id: "matrix",
        title: "Keep the twenty ideas distinct with a small production matrix",
        paragraphs: [
          "A good way to see duplication is to put the ideas in a two-column matrix. The left column is the question the audience has; the right is the evidence your post presents. Here are three rows for the recording-room tutorial: ‘What should I test first?’ pairs with a five-second sample of room hum; ‘What if I can’t move my desk?’ pairs with a diagram of two microphone positions; ‘Which fix failed?’ pairs with an honestly labeled before-and-after that changed too many variables. Those ideas can come from the same minute of source and still serve different readers.",
          "When adapting the same moment across formats, change what the audience can do with it. A clip demonstrates where to listen. A newsletter exercise asks the reader to record beside the wall, then compare it with the middle of the room. An image makes both test locations easy to save for later. If changing the format doesn’t improve the action or reach a meaningfully different audience, it may be the same asset published twice, which is a valid distribution choice but not a new idea. Track reuse and unique ideas separately in your planning sheet.",
          "Leave one column for the cost of production. An annotated diagram will take longer than a clean quote, but can be more useful if a visual relationship is the whole explanation. Put the most expensive assets next to candidates you know the source supports. Use lighter posts to answer narrow questions and leave large guides for material with enough depth. When working alone, assign a fixed review pass to the whole group rather than polishing an excellent cover on a batch whose captions still contain factual errors.",
        ],
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
    title:
      "Short video captions: a practical guide to readability and accessibility",
    description:
      "Choose readable caption styles, correct auto-caption errors, and test timed text and burn-ins on the phones your viewers actually use.",
    category: "Video repurposing",
    alt: "An editor reviewing colored caption cues beside an audio waveform",
    links: [
      captionGuide,
      youtubeCaptions,
      {
        href: "/blog/vertical-video-framing",
        label: "Framing checks that keep captions away from important visuals",
      },
      { href: "/blog/podcast-clips", label: "How to prepare interview clips" },
      { href: "/features", label: "Zybble’s clip formatting overview" },
    ],
    sections: [
      {
        id: "purpose",
        title: "Decide what your captions must communicate",
        paragraphs: [
          "Captions on short videos can do two different jobs: make a clip understandable without sound, and make the spoken rhythm visible for people watching in a feed. The same design can serve both, but it isn’t automatic. Word-by-word effects that look energetic in a sample can leave someone unable to finish a sentence. The W3C Web Accessibility Initiative describes captions as synchronized text for speech and meaningful non-speech audio. That definition is a better quality goal than simply making text appear whenever someone talks.",
          "First decide what you need to deliver. Burned-in captions are part of the pixels and can’t be switched off. Closed captions are separate from the picture and can be enabled in a player that supports them. A clean file with a reviewed timed-text track gives viewers control where a platform supports that track. An open-caption export can still make sense for feeds and embedded players where viewers won’t discover an optional track. Store both forms deliberately rather than extracting text from an old burned-in video next time.",
        ],
      },
      {
        id: "style",
        title: "Choose a caption style by reading conditions, not by trends",
        paragraphs: [
          "A bold style can be helpful for a very short phrase over a simple shot, such as a two-word step name or a meaningful number. All caps takes up more room and can be harder to skim, so preview the worst word in the clip, not just the friendly demo phrase. A karaoke treatment can show which word a speaker is on, but keep contrast high for words that aren’t highlighted. If the unhighlighted words disappear against the background, the effect sabotages the sentence it is meant to clarify.",
          "A minimal, steady box works well for a technical explanation where the viewer is also looking at a diagram. Don’t assume ‘minimal’ means tiny. Keep text large enough to be comfortable on a phone. Prefer a solid or sufficiently opaque background over hoping a drop shadow will work in every shot. Open the hardest frame: a white shirt behind white type, a sign under the captions, or a slide where the caption covers an example. If the background and meaning compete, move the caption or change the framing.",
        ],
      },
      {
        id: "scrub",
        title: "Correct errors in the order they affect meaning",
        paragraphs: [
          "Start with words that flip the claim: not, never, unless, before, after, above, below. Then check names, unit abbreviations, numbers, and jargon. Ask the speaker or look at the source if the clip is about a term you don’t recognize. In a budgeting clip, turning ‘fifteen’ into ‘fifty’ is more damaging than missing a filler syllable. Preview the section continuously, not just timestamp by timestamp. A caption can be correct in isolation yet misleading if it appears during another speaker’s response.",
          "Next, break lines at sensible linguistic units. Keep ‘under five minutes’ together when space allows, and avoid leaving ‘not’ hanging at a cue boundary. Give viewers enough time to read before the next cut. Check how overlapping talk is represented; use labels when the source speaker isn’t apparent. Add a sound cue if a change in the audio is the subject of the example. For a microphone test, ‘[background hum stops]’ may be the essential information, not an optional decorative aside.",
        ],
      },
      {
        id: "export",
        title: "Run the two-pass export check",
        paragraphs: [
          "Pass one: watch the exact video with sound off, at typical phone size. Can you follow the argument without rewinding? Is the caption ever hidden by the destination’s interactive controls? Does the editor preview match the uploaded preview? Don’t use one fixed numeric safe zone for every app and device. Test your actual placement in the destination’s preview or an appropriately private draft, since overlays and preview behavior can change. Check the longest lines and the least forgiving backgrounds, not just the opening.",
          "Pass two: turn the sound back on and test synchronization. If you attached a separate track, toggle it independently and ensure you didn’t accidentally serve two caption overlays. Check the correct language, timing from the first visible frame, and line breaks after export. YouTube Studio supports ways to add captions, including timed files; see its current help before choosing a format and test against your intended upload. Keep the corrected edit as a separate asset so a future trim doesn’t silently use caption timestamps from an older version.",
        ],
      },
      {
        id: "handoff",
        title: "Write one caption handoff requirement for the next batch",
        paragraphs: [
          "Make caption review explicit in your delivery notes: ‘reviewed for claims and timing, no important visual covered, and one track checked in destination preview.’ Assign a person to it even if generation is automated. A checked box means the named version was reviewed, not that every future crop or duration will inherit that review. On a tiny team the editor can do both passes, but using a second person occasionally is a useful way to discover the mistakes you’ve learned to read around.",
          "If you have limited time, prioritize meaning and reading conditions over styling. Correct the warnings and units, make the text readable on a real phone, and check it against the final picture. Then decide whether a bold emphasis, a progressive highlight, or a quieter box helps that particular clip. Caption files make revisions and accessibility work easier, but they’re not themselves proof of quality. The goal is a viewer who understands the message whether or not the room is quiet enough to hear it.",
        ],
      },
      {
        id: "example",
        title: "Fix a real reading problem with three versions of one sentence",
        paragraphs: [
          "Take the spoken sentence ‘I wouldn’t increase the gain until I moved the microphone.’ A quick automatic draft might put everything on one line or highlight ‘increase’ as the only strong word. Both can make the wrong impression. Try splitting into ‘I wouldn’t increase the gain’ and ‘until I moved the microphone.’ Keep the negative and the action together. Use the time of the actual clause, not an arbitrary fixed number of frames. The result is clearer even though it uses the same speech and nearly the same text.",
          "In a version intended for a fast feed, keep the first clause steady rather than replacing each word after it is spoken. In a technical review copy, try a solid box that leaves the mic visible, then compare both layouts against the busiest frame. In a closed caption file, check timing and speaker identity first; the player may decide where or how to display the cue. This is why an attractive template isn’t a substitute for checking your delivery. The same corrected words can end up in different presentations without changing their meaning.",
          "Include at least one test on a borrowed or older phone when possible. A bright monitor on a clean desk can make low contrast appear acceptable. A smaller screen in ambient light may show a pale caption vanishing over the subject’s sleeve. If your reviewer pauses to read half the lines, give the captions more space or edit the spoken segment more deliberately. Don’t shorten a sentence by cutting the words that tell the person how to apply the idea safely or correctly.",
        ],
      },
    ],
  }),
  editorialArticle({
    slug: "vertical-video-framing",
    keywords: [
      "vertical video framing",
      "speaker crop",
      "9:16 video",
      "reframe video for shorts",
    ],
    title:
      "Vertical video framing: when to follow the speaker, center crop, or keep the full frame",
    description:
      "Choose between speaker-focused reframing, center crop, and full-frame fit with examples from interviews, cooking videos, and slide presentations.",
    category: "Video repurposing",
    alt: "A phone in a vertical tripod mount recording a cooking demonstration",
    links: [
      youtubeShorts,
      captionGuide,
      {
        href: "/blog/short-video-captions",
        label: "Plan readable captions for the finished crop",
      },
      {
        href: "/blog/podcast-clips",
        label: "Select interview cuts that stand on their own",
      },
      { href: "/features", label: "Explore clip framing on Zybble" },
    ],
    sections: [
      {
        id: "inventory",
        title: "List what the viewer must see before choosing a shape",
        paragraphs: [
          "Converting landscape video to portrait isn’t just a size change. If you crop a horizontal interview to a vertical rectangle, a face can be sharp and nicely positioned while the camera removes the evidence being discussed. Start with three priorities: the active speaker, the thing they are referring to, and any text that carries meaning. Rank these separately for each beat. The center of the widest shot is not necessarily the center of the story.",
          "For a cooking tutorial, write down the parts that must survive: the cook’s face during the explanation, the level in the pan during the demo, and the final color under consistent light. A narrow crop can work beautifully for the face and fail completely on the pan. In a lesson, the critical item could be the exact point a cursor selects or the two prices compared on opposite sides of a slide. Label those beats before applying any automatic reframing so you will notice missing details during review.",
        ],
      },
      {
        id: "follow",
        title: "Follow the speaker when the speaker is the subject",
        paragraphs: [
          "A speaker-focused crop makes sense for an ordinary conversational reply shot in a wide interview. It aims to keep the person speaking visible as the conversation changes. Watch all speaker handoffs, including brief interjections. An emphatic ‘right’ from a host may not deserve a full cut away from the guest who is explaining a key concept. A useful check is to scrub around the time of each handoff and ask whether the visual change clarifies the conversation or merely responds to a sound.",
          "Inspect shots with laughter, off-camera questions, two people talking at once, music, or long undisturbed silences. Those are common situations where automatic cues may not match your intent. Follow-speaker is not a promise that every frame tracks perfectly. If an example needs to show two faces reacting in the same shot, try a wider output or hold the full frame for that example. Protect meaning before making the composition feel busy.",
        ],
      },
      {
        id: "center",
        title: "Use a fixed center crop when the composition already works",
        paragraphs: [
          "A center crop is predictable. It keeps the same geometric slice of every frame, so it can be the right choice for a seated host facing one camera, a centered product demo, or a vertically safe source recorded with reformats in mind. Put a rough overlay over the source in your editor. Watch at least the first, middle and last parts of the relevant edit. Note every time a prop moves into frame, the presenter leans, or the original switches angles. A passing first frame is not evidence that the entire clip passes.",
          "If you record the source yourself, leave space around the presenter and stage any props where a portrait frame can include them. Try a tape mark on the desk so the presenter knows where to put a product without having to watch a monitor. Check microphone sight lines; a crop that looks clean in the center may make a boom arm dominate the foreground. A fixed crop is a reward for intentional composition, not compensation for every rough source.",
        ],
      },
      {
        id: "fit",
        title:
          "Keep the whole frame when losing context costs more than empty space",
        paragraphs: [
          "Fit the full original into the output shape when the whole frame is evidence: a before-and-after with both examples side by side, a slide that must stay intact, or a two-person shot where reaction matters. This often creates unused space above and below on a tall canvas. A softly blurred or neutral fill can make the spacing feel intentional, but it won’t make a distant slide legible. Inspect the content itself separately from the fill. If the text is still too small, consider a tighter insert, a rewritten title card, or a different output ratio.",
          "Full-frame fit does not mean letting the background take over. Use restrained colors and avoid placing high-frequency patterns behind captions. Unless a real edit can change shots independently, choose the one mode that protects the most important beats overall. For some recordings, that means producing a shorter edit of a better-framed example rather than using every useful sentence. Use the landscape version when a portrait version requires viewers to zoom just to understand the claim.",
        ],
      },
      {
        id: "check",
        title: "Check four shapes using the hardest moment in the edit",
        paragraphs: [
          "Preview 9:16, 1:1, 4:5, and 16:9 at the actual display size when those shapes suit your destinations. Begin on the moment that places the greatest visual demand on the crop, such as a two-person reaction or text near the edge. Next, inspect transitions. Finally, check captions with platform controls visible. Do not assume one cover crop predicts feed and player crops. YouTube’s square and vertical Shorts eligibility is documented separately from its landscape uploads; confirm current destination guidance for other feeds before committing to an export preset.",
          "Summarize your decision in a sentence: ‘Use center crop for close explanations, but crop the equipment example separately,’ or ‘Hold full frame so the two panels remain readable.’ That note makes a later review faster and gives the recording team something they can improve. Compare frames based on who or what stays visible, not on whether the background looks more polished. A successful reframe lets the viewer understand the idea without noticing how much of the wide source you removed.",
        ],
      },
      {
        id: "example",
        title: "Walk a three-shot edit through the framing decision",
        paragraphs: [
          "Suppose a sixty-second cooking clip begins on a coach describing a mistake, cuts to two pans with different temperatures, and ends by showing the correct color. The wide opening can become a speaker-focused crop as long as the coach’s eyes and the explanation remain in frame. The two-pan comparison deserves wider treatment because a viewer has to see both pans at once. The final close-up can use a stable crop centered on the relevant detail, not on the host. If the editing workflow only allows one choice for the whole clip, keep the full frame or trim to a moment whose key details share the same crop.",
          "Look for the consequences of the change in the first frame after a cut. If a fast camera adjustment happens around the transition, an automatic crop may chase movement for several frames; the viewer experiences that even if the paused image looks great. If a face disappears briefly during a correction, prefer a stable alternate crop that handles the movement quietly. Remove a transition effect if it makes the caption or example harder to see on a small phone. The goal isn’t to make each shot fill the screen at any cost.",
          "When a clip needs rework, write down whether the problem is spatial or editorial. Spatial: a near-edge gesture leaves the frame. Editorial: the clip relies on comparing two moments too far apart for the current length. Zoom and position can fix the first; a different edit may be the only fix for the second. This distinction makes review notes concrete and avoids assigning a series of minute crop tweaks to a moment with a missing premise.",
        ],
      },
    ],
  }),
];
