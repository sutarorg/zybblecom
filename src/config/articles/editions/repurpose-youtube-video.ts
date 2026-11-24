import type { ArticleEdition, ArticleInline } from "@/types/content";

const p = (content: string | readonly ArticleInline[]) =>
  ({ kind: "paragraph", content }) as const;

export const youtubeShortsEdition = {
  intent:
    "How-to: make a technically sound, rights-cleared Short from a YouTube video you own.",
  intro:
    "You can cut a Short in the YouTube app or edit a separate portrait file and upload it. Here’s how to choose the route, keep the useful part of the frame and check what viewers will actually see.",
  sections: [
    {
      id: "choose-a-production-route",
      title: "Choose between a native remix and a separately edited upload",
      blocks: [
        {
          kind: "table",
          caption: "Two ways to make a Short from a longer video",
          headers: ["Route", "Best when", "Watch for"],
          rows: [
            [
              "Remix → Edit into a Short",
              "One continuous passage from your eligible public upload works in the app.",
              "YouTube’s documented selection limit is 60 seconds; the Short links back to the original.",
            ],
            [
              "Edit and upload a new file",
              "You need a deliberate crop, clean audio, graphics or several cuts.",
              "Eligible square or vertical uploads can be up to three minutes; review claims and add a related video if available.",
            ],
          ],
        },
        p([
          "Start in the YouTube app if you only need one continuous excerpt. On your eligible public long-form video, use Remix, then Edit into a Short. The ",
          {
            href: "https://support.google.com/youtube/answer/12836917?hl=en",
            label: "native editing instructions",
          },
          " say you can select up to 60 seconds. The Short links back to the original. An unlisted upload, private video or video with a third-party copyright claim is not eligible for this specific workflow. It is also different from creating a shareable excerpt with the YouTube Clip feature.",
        ]),
        p([
          "Edit outside the app when you need to hold a crop steady during a demonstration or remove a music bed. Under ",
          {
            href: "https://support.google.com/youtube/answer/15424877?hl=en",
            label: "YouTube’s three-minute Shorts rules",
          },
          ", eligible square or vertical uploads up to three minutes are categorized as Shorts. The native 60-second selection rule does not become a three-minute selection rule. Conversely, the new upload is not linked as a native excerpt automatically. If you have advanced feature access, select a public or unlisted related video from your channel in Studio after upload.",
        ]),
      ],
    },
    {
      id: "check-the-source",
      title: "Get a clean source and clear the rights",
      blocks: [
        p([
          "Use the original project master or a clean delivery file if it is available. It should not have a sponsor bug or landscape subtitles that will land halfway off the new crop. If the master is lost, ",
          {
            href: "https://support.google.com/youtube/answer/56100?hl=en",
            label: "YouTube Studio can download eligible uploads you own",
          },
          " as 720p or 360p MP4s depending on the source. Treat that copy as a fallback: enlarging part of a low-resolution frame makes text and detail harder to recover. Never use someone else’s public upload just because you can watch it.",
        ]),
        p(
          "Open the project rights notes before marking a clip. Check music, guest consent, stock clips, sponsor restrictions and any client imagery independently. A song cleared for your long-form upload is not automatically cleared for a new edit or another platform. If the clean track exists, mute or remove music that is not cleared. Do not leave a sample in the background assuming it is too short to matter. YouTube states that Shorts longer than one minute with an active Content ID claim are blocked globally; changing the duration is not a substitute for having rights.",
        ),
        p(
          "For example, suppose a channel has a tutorial on fixing a crooked kitchen cabinet door. Its original master includes a sponsor sting and shows the homeowner’s address on a delivery box. Instead of covering both problems with a decorative title, cut around the sting and crop, blur or replace the shot containing the address. If the address is visible while the crucial adjustment happens, reshoot the hands and hinge rather than using an unsafe frame.",
        ),
      ],
    },
    {
      id: "build-the-portrait-edit",
      title: "Keep the action visible in portrait",
      blocks: [
        p(
          "In that cabinet tutorial, look for the first moment a new viewer can tell which screw is being adjusted. Start with a view of the uneven gap and show the hinge before the tool touches it. End with the door closing, so the viewer can see whether the fix worked. The setup, movement and result can all survive even if you cut the introduction and the second example. Don’t edit out a condition such as loosening a neighboring screw first if the procedure depends on it.",
        ),
        p([
          "Make a portrait sequence at 1080 by 1920 if your source supports it. Read the ",
          { href: "/blog/vertical-video-framing", label: "9:16 framing guide" },
          " if the presenter is at one edge and the action is at the other. Start with a deliberate crop for each shot, not a moving pan across the whole episode. A wide inset may be better for a side-by-side before and after. If labels are still unreadable, crop to the important region or recreate a clean diagram instead of shrinking the entire original into the middle of the frame.",
        ]),
        p([
          "Make caption corrections once the edit is stable. Use the ",
          {
            href: "/blog/short-video-captions",
            label: "caption timing and placement checklist",
          },
          " to catch wrong technical terms, text over the hinge and a cue that falls outside a cut. Keep action and important type away from interface overlays, then preview in the actual app rather than relying on a template for the safe area. Watch the export once with the sound off; the viewer should understand which screw is involved and see the result without guessing.",
        ]),
      ],
    },
    {
      id: "restore-missing-picture",
      title: "Decide what to replace instead of enlarging every shot",
      blocks: [
        p(
          "Suppose the cabinet project only survives as a low-resolution download. Test two moments at final size: the hand turning the screw and the wide view of the door settling into place. If the hinge is muddy after cropping, zooming further will not recover the thread or the tool angle. Record a clean insert that makes the same adjustment. If you cannot recreate it safely, choose a different passage whose essential information is already visible. Never suggest an insert is the exact moment of the earlier repair when it is a reconstruction.",
        ),
        p(
          "Check sound separately. If the original tutorial mixes narration and background music into one track, cutting the original picture will not remove that music. A fresh voice-over can explain the same observation without carrying the old bed, provided it accurately describes what the viewer sees and you still have permission to use the footage. Keep useful sounds, such as the final latch clicking, in the mix if you have them on a cleared track. When the sound confirms the result, include a short cue for it in the captions.",
        ),
      ],
    },
    {
      id: "export-and-verify",
      title: "Export, upload and verify the processed video",
      blocks: [
        {
          kind: "list",
          ordered: true,
          items: [
            "Export from the portrait edit, not from a player recording. MP4 with H.264 video and AAC audio is a practical starting point. Start with the frame rate of your main footage and avoid unnecessary conversions.",
            "Play the actual file through to the end. Check rotation, duration, sound, caption timing, last frame and any remaining copy from the original. An export named portrait can still be a landscape canvas with vertical footage inside it.",
            "Upload and wait for processing. Check copyright notices and channel access settings. On a phone, watch the processed version and look for unreadable words, awkward trims and covered controls. If you add a related video in Studio, verify the link resolves to the intended episode.",
            "Archive the clean export and any caption file with the source version and time range. If you reused footage under a limited license, record the platforms and any expiration rather than sending the same file everywhere by default.",
          ],
        },
        p([
          "Does a square upload count? For eligible uploads under the Shorts rules, square can qualify, but a square file does not use as much of the portrait screen. Does a new Short replace the original video? No. Keep the long video as the place to explain exceptions and link to it if it will help the viewer. If you need to make more than this one clip, use the ",
          {
            href: "/blog/youtube-video-twenty-posts",
            label: "one-video content planning guide",
          },
          " to decide whether the next useful asset is another excerpt or something different.",
        ]),
      ],
    },
  ],
  takeaway:
    "Use the in-app remix for a simple excerpt from an eligible upload. Use a separate edit when the story needs precise reframing, rights fixes or caption control. Keep the source, audio and visual evidence intact, then judge the finished Short on a phone after processing, not just in your editing preview.",
  cta: {
    title: "Make a portrait draft from a cleared source",
    text: "Zybble can locate highlights, apply speaker-focused reframing and generate captions before you download a 9:16 MP4 to check and upload.",
    href: "/how-it-works",
    label: "See how Zybble works",
  },
} satisfies ArticleEdition;
