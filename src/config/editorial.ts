import type { Article, VerifiedClip } from "@/types/content";
import { videoArticles } from "./articles/video";
import { workflowArticles } from "./articles/workflows";
export const categories = [
  "Video repurposing",
  "Creator workflows",
  "Product updates",
] as const;
/** Publication inventory. Keep unpublished drafts outside this list. */
export const articles: readonly Article[] = [
  ...videoArticles,
  ...workflowArticles,
];
export const verifiedClips: readonly VerifiedClip[] = [];
