import { ArticleFrame } from "@/components/marketing/articles/article-frame";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/config/editorial";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo/metadata";
import { publisher } from "@/lib/seo/structured-data";
import { publicationDate, readingTime } from "@/lib/utils/editorial";
import { PageIntro } from "@/components/shared/page";
import { JsonLd } from "@/components/shared/structured-data";
import { ArticleCard } from "@/components/marketing/article-card";
import { editorialViews } from "@/components/marketing/articles/registry";
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
    keywords: article.keywords,
    article: {
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authorUrl: article.author.url,
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
  const CustomView = Object.hasOwn(editorialViews, slug)
    ? editorialViews[slug as keyof typeof editorialViews]
    : undefined;
  const sections = article.sections ?? [];
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
          keywords: article.keywords,
          description: article.description,
          url,
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          datePublished: article.publishedAt,
          ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
          author: {
            "@type": "Organization",
            name: article.author.name,
            ...(article.author.url ? { url: article.author.url } : {}),
          },
          publisher,
          image: {
            "@type": "ImageObject",
            url: `${site.url}${article.thumbnail.src}`,
            width: 1200,
            height: 675,
          },
        }}
      />
      {article.edition ? (
        <ArticleFrame
          article={article}
          edition={article.edition}
          path={path}
          url={url}
        />
      ) : CustomView ? (
        <>
          <JsonLd
            value={{
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: `${site.url}/`,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Blog",
                  item: `${site.url}/blog`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: article.title,
                  item: url,
                },
              ],
            }}
          />
          <CustomView article={article} />
        </>
      ) : (
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
                sizes="(min-width: 842px) 770px, (min-width: 760px) calc(100vw - 72px), calc(100vw - 40px)"
              />
              {sections.length > 2 && (
                <nav
                  className="section-index article-toc"
                  aria-label="Table of contents"
                >
                  <strong>On this page</strong>
                  {sections.map((item) => (
                    <Link key={item.id} href={`#${item.id}`}>
                      {item.title}
                    </Link>
                  ))}
                </nav>
              )}
              <div className="article-body">
                {sections.map((item) => (
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
      )}
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
