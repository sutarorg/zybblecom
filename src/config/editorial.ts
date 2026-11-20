import type { Article, VerifiedClip } from "@/types/content";
export const categories = [
  "Video repurposing",
  "Creator workflows",
  "Product updates",
] as const;
/** Add only owner-approved articles and permission-cleared Zybble exports. */
export const articles: readonly Article[] = [];
export const verifiedClips: readonly VerifiedClip[] = [];
