import type { Article } from "@/types/content";
import { editionWordCount } from "./article-edition";

export const readingTime = (article: Article) =>
  Math.max(
    1,
    Math.ceil(
      ((article.edition
        ? editionWordCount(article.edition)
        : article.wordCount) ??
        (article.sections ?? [])
          .flatMap((section) => [section.title, ...section.paragraphs])
          .join(" ")
          .trim()
          .split(/\s+/).length) / 220,
    ),
  );
export const publicationDate = (date: string) =>
  new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(date),
  );
