import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { test } from "node:test";
import { articles } from "../../src/config/editorial";
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
    assert(
      (article.sections?.length ?? 0) >= 4 || (article.wordCount ?? 0) > 1000,
    );
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
