import type { ArticleEdition } from "@/types/content";

/** Count the actual body, including list/table content but excluding labels, captions and intro. */
export function editionWordCount(edition: ArticleEdition) {
  const body = edition.sections.flatMap(({ blocks }) =>
    blocks.flatMap((block) => {
      if (block.kind === "list") return block.items;
      if (block.kind === "table")
        return [...block.headers, ...block.rows.flat()];
      return typeof block.content === "string"
        ? [block.content]
        : block.content.map((part) =>
            typeof part === "string" ? part : part.label,
          );
    }),
  );
  return (
    [...body, edition.takeaway]
      .join(" ")
      .match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length ?? 0
  );
}
