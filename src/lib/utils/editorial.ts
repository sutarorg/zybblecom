import type { Article } from "@/types/content";
export const readingTime = (article: Article) =>
  Math.max(
    1,
    Math.ceil(
      article.sections
        .flatMap((section) => [section.title, ...section.paragraphs])
        .join(" ")
        .trim()
        .split(/\s+/).length / 220,
    ),
  );
export const publicationDate = (date: string) =>
  new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(date),
  );
