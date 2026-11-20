import Link from "next/link";
import { BookOpenText, Search } from "lucide-react";
import { categories, articles } from "@/config/editorial";
import { marketingMetadata } from "@/lib/seo/metadata";
import { EmptyState, PageIntro } from "@/components/shared/page";
import { ArticleCard } from "@/components/marketing/article-card";
import { Action } from "@/components/ui/primitives";
const description =
  "The Zybble blog is home to practical video repurposing advice, creator workflows, and product updates as they are published.";
type Props = {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
    page?: string | string[];
  }>;
};
export async function generateMetadata({ searchParams }: Props) {
  const query = await searchParams;
  return marketingMetadata(
    "/blog",
    !articles.length || Boolean(query.q || query.category || query.page),
  );
}
export default async function Blog({ searchParams }: Props) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const category = categories.find((item) => item === params.category) ?? "";
  const matches = articles.filter(
    (item) =>
      (!category || item.category === category) &&
      `${item.title} ${item.description} ${item.category}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const featured =
    !q && !category ? matches.find((item) => item.featured) : undefined;
  const listing = matches.filter((item) => item !== featured);
  const count = Math.max(1, Math.ceil(listing.length / 6));
  const page = Math.min(
    count,
    Math.max(
      1,
      Number(
        typeof params.page === "string" && /^\d+$/.test(params.page)
          ? params.page
          : 1,
      ),
    ),
  );
  const href = (nextCategory: string, nextPage = 1) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (nextCategory) next.set("category", nextCategory);
    if (nextPage > 1) next.set("page", String(nextPage));
    return next.size ? `/blog?${next}` : "/blog";
  };
  return (
    <>
      <PageIntro
        path="/blog"
        label="Blog"
        title={
          <>
            The <span className="gradient-text">Zybble journal.</span>
          </>
        }
        description={description}
      />
      <section className="section compact">
        <div className="container collection">
          <form action="/blog" className="search-form" role="search">
            <label className="sr-only" htmlFor="article-search">
              Search articles
            </label>
            <div className="search-field">
              <Search size={20} aria-hidden="true" />
              <input
                key={q}
                type="search"
                id="article-search"
                name="q"
                defaultValue={q}
                maxLength={120}
                placeholder="Search articles…"
              />
            </div>
            {category && (
              <input type="hidden" name="category" value={category} />
            )}
            <button className="button button-primary" type="submit">
              Search
            </button>
          </form>
          <nav className="filter-row" aria-label="Article categories">
            {["", ...categories].map((item) => (
              <Link
                href={href(item)}
                aria-current={category === item ? "true" : undefined}
                className="filter"
                key={item}
              >
                {item || "All articles"}
              </Link>
            ))}
          </nav>
          {!matches.length ? (
            <EmptyState
              icon={BookOpenText}
              title={
                q || category
                  ? "No matching articles"
                  : "No articles published yet"
              }
              action={
                <Action
                  href={q || category ? "/blog" : "/resources"}
                  variant="secondary"
                >
                  {q || category ? "Clear filters" : "Browse resources"}
                </Action>
              }
            >
              {q || category
                ? "Try a different search term or choose another category."
                : "While the journal is getting ready, the resource library has a publishing checklist, workflow guidance, and answers about credits."}
            </EmptyState>
          ) : (
            <section aria-labelledby="journal-results">
              <h2 id="journal-results" className="listing-title">
                {q || category ? "Search results" : "From the journal"}
              </h2>
              {featured && page === 1 && (
                <ArticleCard article={featured} featured />
              )}
              <div className="grid-three">
                {listing.slice((page - 1) * 6, page * 6).map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
              {count > 1 && (
                <nav className="filter-row" aria-label="Article pages">
                  {page > 1 && (
                    <Link className="filter" href={href(category, page - 1)}>
                      Previous page
                    </Link>
                  )}
                  <span>
                    Page {page} of {count}
                  </span>
                  {page < count && (
                    <Link className="filter" href={href(category, page + 1)}>
                      Next page
                    </Link>
                  )}
                </nav>
              )}
            </section>
          )}
        </div>
      </section>
    </>
  );
}
