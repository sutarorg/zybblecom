import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
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
      <Image
        className="article-thumbnail"
        src={article.thumbnail.src}
        alt={article.thumbnail.alt}
        width={1200}
        height={675}
        sizes={
          featured
            ? "(min-width: 1288px) 1216px, (min-width: 760px) calc(100vw - 72px), calc(100vw - 40px)"
            : "(min-width: 1288px) 390px, (min-width: 1000px) 30vw, (min-width: 650px) 47vw, calc(100vw - 40px)"
        }
      />
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
      <Link
        className="article-read"
        href={`/blog/${article.slug}`}
        aria-label={`Read article: ${article.title}`}
      >
        Read article <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </article>
  );
}
