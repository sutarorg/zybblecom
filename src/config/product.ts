import {
  BriefcaseBusiness,
  Captions,
  Clapperboard,
  Focus,
  GraduationCap,
  Link2,
  Mic2,
  Play,
  Scissors,
  Smartphone,
  Zap,
  Users,
} from "lucide-react";

export const features = [
  {
    id: "ai-clips",
    title: "AI-powered clips",
    icon: Scissors,
    tone: "purple",
    text: "Find the standout moments without scrubbing through the entire recording.",
    detail:
      "Zybble looks through your source video for segments that can stand on their own. Creator and Studio include AI-ranked highlights to help decide what to review first. Use your own editorial judgment: a strong clip should make sense even if someone hasn’t seen the full video.",
  },
  {
    id: "framing",
    title: "Speaker-focused framing",
    icon: Focus,
    tone: "blue",
    text: "Keep the speaker in view when you turn wide footage into a vertical clip.",
    detail:
      "Smart reframing follows the speaker as it crops widescreen footage. Review the framing before export, especially if speakers overlap, switch quickly, or share the frame with important on-screen material.",
  },
  {
    id: "captions",
    title: "Bold captions",
    icon: Captions,
    tone: "pink",
    text: "Make your words easy to follow, even when viewers are watching on mute.",
    detail:
      "AI captions turn speech into on-screen text. Creator and Studio include all available caption styles. Always review proper names, specialist terms, and captions from recordings with background noise before publishing.",
  },
  {
    id: "vertical-format",
    title: "Perfect vertical format",
    icon: Smartphone,
    tone: "mint",
    text: "Download 9:16 MP4 clips made for short-form feeds.",
    detail:
      "Export a portrait-oriented MP4 that fills a mobile screen. Upload the file yourself to your chosen platform and check its current length and upload requirements. Zybble’s export format is not a direct publishing integration.",
  },
  {
    id: "fast-generation",
    title: "Fast generation",
    icon: Zap,
    tone: "orange",
    text: "Move from a long recording to clips worth reviewing, with fewer manual steps.",
    detail:
      "AI handles the first pass on clip discovery, framing, and captions so you can focus on reviewing the results. Processing time varies with the source video and current availability.",
  },
  {
    id: "video-sources",
    title: "Multiple video sources",
    icon: Link2,
    tone: "purple",
    text: "Repurpose podcasts, tutorials, webinars, and interviews you already own.",
    detail:
      "Start with a long-form recording you have permission to repurpose. Clear dialogue and a visible speaker are a useful starting point. No third-party source integration is advertised until its availability is confirmed.",
  },
] as const;

export const workflow = [
  {
    title: "Add your long video",
    text: "Start with a podcast, interview, webinar, or any long-form video you have permission to use.",
    detail:
      "Choose a recording with clear speech and note its length. One credit covers one minute of standard video processing. Start with the strongest conversation or lesson, not necessarily the longest recording.",
  },
  {
    title: "AI finds the best moments",
    text: "Zybble surfaces standout segments, reframes around the speaker, and adds captions.",
    detail:
      "Review the suggested moments for a clear beginning and payoff. Check that the framing includes any visual context the story needs, and confirm the captions match what was said.",
  },
  {
    title: "Get viral-ready clips",
    text: "Review your vertical clips, download them as MP4s, and publish on your own terms.",
    detail:
      "Pick the clips that work without the original introduction. Download your chosen clips and upload them to your publishing destination. Virality depends on the content and audience; it isn’t guaranteed.",
  },
] as const;

export const useCases = [
  {
    id: "podcasters",
    name: "Podcasters",
    icon: Mic2,
    tone: "purple",
    image: "/images/two-person-podcast-studio.webp",
    alt: "Two people talking into microphones in a podcast studio",
    text: "Turn full episodes into moments worth sharing.",
    detail:
      "Look for a guest’s counterintuitive opinion, a personal story, or a concise answer to a big question. Choose clips that introduce the idea quickly and use the post to point viewers back to the full episode.",
    format: "Guest insights · Episode teasers",
  },
  {
    id: "youtubers",
    name: "YouTubers",
    icon: Play,
    tone: "pink",
    image: "/images/educator-recording-tutorial.webp",
    alt: "An educator recording a tutorial at a desk",
    text: "Give existing long-form uploads a second life as vertical clips.",
    detail:
      "Pull a single technique, surprising result, or before-and-after from a long video. Before uploading to Shorts, check that the vertical crop still shows the action that makes the clip useful.",
    format: "Tutorial takeaways · Behind the scenes",
  },
  {
    id: "coaches",
    name: "Coaches",
    icon: GraduationCap,
    tone: "blue",
    text: "Make useful lessons easy to watch and share.",
    detail:
      "Find a complete tip in a workshop or teaching session. Preserve any qualifiers around the advice and pick clips that viewers can act on without watching the rest of the lesson.",
    format: "Workshop takeaways · Quick lessons",
  },
  {
    id: "consultants",
    name: "Consultants",
    icon: BriefcaseBusiness,
    tone: "orange",
    text: "Share expertise beyond the original event.",
    detail:
      "Turn a recorded talk or interview into a short explanation of a common problem. Swap client material for approved public recordings unless you have explicit permission to share it.",
    format: "Expert answers · Framework breakdowns",
  },
  {
    id: "agencies",
    name: "Content agencies",
    icon: Users,
    tone: "mint",
    text: "Build a repeatable first pass for client videos.",
    detail:
      "Use AI to shortlist promising moments, then have your team check the hook, framing, and captions against the client’s brief. Confirm approvals before publishing any cut.",
    format: "Client campaigns · Interview clips",
  },
  {
    id: "businesses",
    name: "Businesses",
    icon: Clapperboard,
    tone: "purple",
    image: "/images/business-interview-studio.webp",
    alt: "A speaker in a professionally lit interview studio",
    text: "Get more mileage out of webinars and interviews.",
    detail:
      "Start with a useful audience question or a self-contained product explanation. Review for accuracy and make sure nothing confidential is visible or mentioned before you distribute the clip.",
    format: "Webinar Q&A · Product education",
  },
] as const;
