import type { Article } from "@/types/content";

export const editorialTeam = { name: "Zybble Editorial Team" };
export const publication = "2026-11-20";
export const youtubeShorts = {
  href: "https://support.google.com/youtube/answer/15424877?hl=en",
  label: "YouTube Help: eligibility for three-minute Shorts",
};
export const youtubeCaptions = {
  href: "https://support.google.com/youtube/answer/2734796?hl=en",
  label: "YouTube Help: add subtitles and captions",
};
export const captionGuide = {
  href: "https://www.w3.org/WAI/media/av/captions/",
  label: "W3C Web Accessibility Initiative: captions and subtitles",
};
export const helpfulContent = {
  href: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
  label: "Google Search Central: creating helpful, people-first content",
};

export function editorialArticle(
  data: Omit<Article, "author" | "publishedAt" | "thumbnail"> & { alt: string },
): Article {
  const { alt, ...entry } = data;
  return {
    ...entry,
    author: editorialTeam,
    publishedAt: publication,
    thumbnail: { src: `/images/blog/${entry.slug}.webp`, alt },
  };
}
