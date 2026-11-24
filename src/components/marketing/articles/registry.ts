import type { ComponentType } from "react";
import type { Article } from "@/types/content";
import { OpusClipComparison } from "./opusclip-vs-descript";
import { CaptionClinic } from "./short-video-captions";
import { YouTubeProductionGuide } from "./repurpose-youtube-video";
import { YouTubeEditorialSlate } from "./youtube-video-twenty-posts";
import { FramingFieldGuide } from "./vertical-video-framing";

// Keep metadata in the publication catalog; the route owns metadata and schema.
// A registered editorial view owns only its article's visual composition.
export const editorialViews = {
  "opusclip-vs-descript": OpusClipComparison,
  "short-video-captions": CaptionClinic,
  "vertical-video-framing": FramingFieldGuide,
  "repurpose-youtube-video": YouTubeProductionGuide,
  "youtube-video-twenty-posts": YouTubeEditorialSlate,
} satisfies Record<string, ComponentType<{ article: Article }>>;
