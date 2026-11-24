import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { test } from "node:test";
import { articles } from "../../src/config/editorial";
import { editionWordCount } from "../../src/lib/utils/article-edition";
import { marketingSeo } from "../../src/config/marketing-seo";
import { marketingMetadata, pageMetadata } from "../../src/lib/seo/metadata";

test("public pages use their exact titles, descriptions and keyword sets", () => {
  assert.equal(Object.keys(marketingSeo).length, 11);
  for (const path of Object.keys(
    marketingSeo,
  ) as (keyof typeof marketingSeo)[]) {
    const [title, description, keywords] = marketingSeo[path];
    const metadata = marketingMetadata(path);
    assert.deepEqual(metadata.title, { absolute: title });
    assert.equal(metadata.description, description);
    assert.deepEqual(metadata.keywords, keywords.split(", "));
    assert.equal(metadata.openGraph?.title, title);
  }
});

test("all 19 articles have distinct metadata, covers, and keyword sets", () => {
  assert.equal(articles.length, 19);
  for (const attr of ["slug", "title", "description"] as const)
    assert.equal(
      new Set(articles.map((article) => article[attr])).size,
      articles.length,
    );
  assert.equal(
    new Set(articles.map((article) => article.thumbnail.src)).size,
    articles.length,
  );
  assert.equal(
    new Set(articles.map((article) => article.keywords.join(" | "))).size,
    articles.length,
  );
  const slugs = new Set(articles.map((article) => article.slug));
  for (const article of articles) {
    assert(article.keywords.length >= 4);
    assert(article.thumbnail.alt.length > 10);
    assert(statSync(`public${article.thumbnail.src}`).size > 1000);
    if (article.edition) {
      const edition = article.edition;
      assert(editionWordCount(edition) >= 1000, article.slug);
      const ids = edition.sections.map(({ id }) => id);
      assert.equal(new Set(ids).size, ids.length, article.slug);
      assert(
        ids.every((id) => !["conclusion", "references"].includes(id)),
        article.slug,
      );
      const internal = new Set<string>();
      for (const { blocks } of edition.sections) {
        for (const block of blocks) {
          if (block.kind === "table") {
            assert(
              block.rows.every((row) => row.length === block.headers.length),
              article.slug,
            );
          }
          if (block.kind !== "paragraph" || typeof block.content === "string")
            continue;
          for (const part of block.content) {
            if (typeof part === "string" || !part.href.startsWith("/"))
              continue;
            internal.add(part.href);
            if (part.href.startsWith("/blog/"))
              assert(slugs.has(part.href.slice(6)), part.href);
          }
        }
      }
      assert(internal.size >= 3 && internal.size <= 6, article.slug);
    } else {
      assert(
        (article.sections?.length ?? 0) >= 4 || (article.wordCount ?? 0) > 1000,
        article.slug,
      );
    }
    for (const link of article.links.filter(({ href }) =>
      href.startsWith("/blog/"),
    ))
      assert(slugs.has(link.href.slice("/blog/".length)), link.href);
    const metadata = pageMetadata(
      `/blog/${article.slug}`,
      article.title,
      article.description,
      {
        keywords: article.keywords,
        article: {
          publishedTime: article.publishedAt,
          authorUrl: article.author.url,
          thumbnail: article.thumbnail,
        },
      },
    );
    assert.deepEqual(metadata.title, { absolute: article.title });
    assert.equal(metadata.openGraph?.title, article.title);
    assert.equal(metadata.twitter?.title, article.title);
  }
});
