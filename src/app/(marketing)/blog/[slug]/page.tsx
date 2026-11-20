import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/config/editorial";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo/metadata";
import { publicationDate, readingTime } from "@/lib/utils/editorial";
import { PageIntro } from "@/components/shared/page";
import { JsonLd } from "@/components/shared/structured-data";
import { ArticleCard } from "@/components/marketing/article-card";
import { Action } from "@/components/ui/primitives";
type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return articles.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);
  if (!article) return {};
  return pageMetadata(`/blog/${slug}`, article.title, article.description, {
    article: {
      publishedTime: article.publishedAt,
      author: article.author.name,
      thumbnail: article.thumbnail,
    },
  });
}
export default async function BlogArticle({ params }: Props) {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);
  if (!article) notFound();
  const path = `/blog/${slug}`;
  const url = `${site.url}${path}`;
  const related = articles
    .filter((item) => item.slug !== slug && item.category === article.category)
    .slice(0, 3);
  return (
    <>
      <JsonLd
        value={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: article.title,
          description: article.description,
          mainEntityOfPage: url,
          datePublished: article.publishedAt,
          author: {
            "@type": "Organization",
            name: article.author.name,
            ...(article.author.url ? { url: article.author.url } : {}),
          },
          publisher: { "@type": "Organization", name: site.name },
          image: `${site.url}${article.thumbnail.src}`,
        }}
      />
      <article>
        <PageIntro
          path={path}
          label={article.category}
          breadcrumb={{
            parent: { name: "Blog", path: "/blog" },
            current: article.title,
          }}
          title={article.title}
          description={article.description}
        />
        <div className="section compact">
          <div className="narrow">
            <div className="article-meta">
              <span>{article.author.name}</span>
              <time dateTime={article.publishedAt}>
                {publicationDate(article.publishedAt)}
              </time>
              <span>{readingTime(article)} min read</span>
            </div>
            <Image
              className="article-thumbnail article-cover"
              src={article.thumbnail.src}
              alt={article.thumbnail.alt}
              width={1200}
              height={675}
              sizes="(max-width: 768px) 95vw, 760px"
            />
            {article.sections.length > 2 && (
              <nav
                className="section-index article-toc"
                aria-label="Table of contents"
              >
                <strong>On this page</strong>
                {article.sections.map((item) => (
                  <Link key={item.id} href={`#${item.id}`}>
                    {item.title}
                  </Link>
                ))}
              </nav>
            )}
            <div className="article-body">
              {article.sections.map((item) => (
                <section key={item.id} id={item.id}>
                  <h2>{item.title}</h2>
                  {item.paragraphs.map((text, index) => (
                    <p key={index}>{text}</p>
                  ))}
                </section>
              ))}
            </div>
            <section
              className="article-sources"
              aria-label="References and further reading"
            >
              <h2>References and further reading</h2>
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
            <nav className="filter-row" aria-label="Share this article">
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
            <Action href="/blog" variant="text">
              Back to the journal
            </Action>
          </div>
        </div>
      </article>
      {related.length > 0 && (
        <section className="section tinted">
          <div className="container">
            <h2 className="listing-title">Related articles</h2>
            <div className="grid-three">
              {related.map((item) => (
                <ArticleCard article={item} key={item.slug} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
