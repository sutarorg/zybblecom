import Link from "next/link";
import { ArrowUpRight, BookOpenText } from "lucide-react";
import { IconTile } from "@/components/ui/primitives";
import type { Article } from "@/types/content";
import { publicationDate, readingTime } from "@/lib/utils/editorial";

export function ArticleCard({
  article,
  featured = false,
}: {
  article: Article;
  featured?: boolean;
}) {
  return (
    <article
      className={`card resource-card article-card ${featured ? "featured-article" : ""}`}
    >
      <IconTile icon={BookOpenText} />
      <p className="overline">
        {featured ? "Featured · " : ""}
        {article.category}
      </p>
      <h3>
        <Link href={`/blog/${article.slug}`}>
          {article.title}
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </h3>
      <p>{article.description}</p>
      <p className="article-meta">
        <time dateTime={article.publishedAt}>
          {publicationDate(article.publishedAt)}
        </time>
        <span>{readingTime(article)} min read</span>
      </p>
    </article>
  );
}
