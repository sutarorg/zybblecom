import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/types/content";
import { publicationDate, readingTime } from "@/lib/utils/editorial";
import styles from "./editorial.module.css";

export function JournalLink() {
  return (
    <nav className={styles.journalLink} aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      <span aria-hidden="true"> / </span>
      <Link href="/blog">Zybble Journal</Link>
    </nav>
  );
}

export function Byline({ article }: { article: Article }) {
  return (
    <p className="article-meta">
      <span>{article.author.name}</span>
      <time dateTime={article.publishedAt}>
        {publicationDate(article.publishedAt)}
      </time>
      {article.updatedAt && article.updatedAt !== article.publishedAt && (
        <span>
          Updated{" "}
          <time dateTime={article.updatedAt}>
            {publicationDate(article.updatedAt)}
          </time>
        </span>
      )}
      <span>{readingTime(article)} min read</span>
    </p>
  );
}

export function Cover({ article, sizes }: { article: Article; sizes: string }) {
  return (
    <Image
      className={`article-cover ${styles.cover}`}
      src={article.thumbnail.src}
      alt={article.thumbnail.alt}
      width={1200}
      height={675}
      sizes={sizes}
    />
  );
}

export function References({ article }: { article: Article }) {
  return (
    <section className={styles.references} aria-labelledby="references">
      <h2 id="references">References and further reading</h2>
      <ul>
        {article.links.map(({ href, label }) => (
          <li key={href}>
            {href.startsWith("/") ? (
              <Link href={href}>{label}</Link>
            ) : (
              <a href={href}>{label}</a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
