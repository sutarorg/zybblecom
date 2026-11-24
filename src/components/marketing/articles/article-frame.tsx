import Image from "next/image";
import Link from "next/link";
import { PageIntro } from "@/components/shared/page";
import { Action } from "@/components/ui/primitives";
import { publicationDate, readingTime } from "@/lib/utils/editorial";
import type { Article, ArticleBlock, ArticleEdition } from "@/types/content";
import styles from "./article-frame.module.css";

function BodyBlock({ block }: { block: ArticleBlock }) {
  if (block.kind === "paragraph") {
    return (
      <p>
        {typeof block.content === "string"
          ? block.content
          : block.content.map((part, index) =>
              typeof part === "string" ? (
                part
              ) : part.href.startsWith("/") ? (
                <Link key={index} href={part.href}>
                  {part.label}
                </Link>
              ) : (
                <a key={index} href={part.href}>
                  {part.label}
                </a>
              ),
            )}
      </p>
    );
  }
  if (block.kind === "list") {
    const items = block.items.map((item, index) => <li key={index}>{item}</li>);
    return block.ordered ? (
      <ol start={block.start}>{items}</ol>
    ) : (
      <ul>{items}</ul>
    );
  }
  return (
    <div
      className={styles.tableScroll}
      role="region"
      aria-label={`Scrollable table: ${block.caption}`}
      tabIndex={0}
    >
      <table>
        <caption>{block.caption}</caption>
        <thead>
          <tr>
            {block.headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map(([heading, ...cells], index) => (
            <tr key={index}>
              <th scope="row">{heading}</th>
              {cells.map((cell, index) => (
                <td key={index}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ArticleFrame({
  article,
  edition,
  path,
  url,
}: {
  article: Article;
  edition: ArticleEdition;
  path: string;
  url: string;
}) {
  return (
    <article className={styles.frame} data-editorial-view="journal-article">
      <PageIntro
        path={path}
        label={article.category}
        breadcrumb={{
          parent: { name: "Blog", path: "/blog" },
          current: article.title,
        }}
        title={article.title}
        description={edition.intro}
      />
      <div className={`narrow ${styles.container}`}>
        <div className="article-meta">
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
        </div>
        <nav
          className={`filter-row ${styles.share}`}
          aria-label="Share this article"
        >
          <a
            className="filter"
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
          >
            Share on LinkedIn
          </a>
          <a
            className="filter"
            href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(url)}`}
          >
            Share by email
          </a>
        </nav>
        <Image
          className={`article-cover ${styles.cover}`}
          src={article.thumbnail.src}
          alt={article.thumbnail.alt}
          width={1200}
          height={675}
          sizes="(min-width: 842px) 770px, (min-width: 760px) calc(100vw - 72px), calc(100vw - 40px)"
          preload
        />
        <nav
          className={`section-index ${styles.toc}`}
          aria-label="Table of contents"
        >
          <strong>On this page</strong>
          <ul>
            {edition.sections.map(({ id, title }) => (
              <li key={id}>
                <a href={`#${id}`}>{title}</a>
              </li>
            ))}
            <li>
              <a href="#conclusion">Conclusion</a>
            </li>
            <li>
              <a href="#references">References</a>
            </li>
          </ul>
        </nav>
        <div className={`article-body ${styles.body}`} data-article-body>
          {edition.sections.map(({ id, title, blocks }) => (
            <section key={id} id={id}>
              <h2>{title}</h2>
              {blocks.map((block, index) => (
                <BodyBlock key={index} block={block} />
              ))}
            </section>
          ))}
          <section id="conclusion">
            <h2>Conclusion</h2>
            <p>{edition.takeaway}</p>
          </section>
        </div>
        <section
          className="article-sources"
          id="references"
          aria-labelledby="references-heading"
        >
          <h2 id="references-heading">References</h2>
          <ul>
            {article.links.map(({ href, label }) => (
              <li key={href}>
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>
        </section>
        <section className={`card ${styles.cta}`} aria-labelledby="journal-cta">
          <h2 id="journal-cta">{edition.cta.title}</h2>
          <p>{edition.cta.text}</p>
          <Action href={edition.cta.href}>{edition.cta.label}</Action>
        </section>
      </div>
    </article>
  );
}
