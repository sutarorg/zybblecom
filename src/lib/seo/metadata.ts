import type { Metadata } from "next";
import { marketingSeo } from "@/config/marketing-seo";
import { site } from "@/config/site";

export function pageMetadata(
  path: string,
  title: string,
  description: string,
  options: {
    noindex?: boolean;
    keywords?: readonly string[];
    exactTitle?: boolean;
    article?: {
      publishedTime: string;
      authorUrl?: string;
      thumbnail?: { src: string; alt: string };
    };
  } = {},
): Metadata {
  const url = `${site.url}${path}`;
  const exactTitle = options.exactTitle || Boolean(options.article);
  const socialTitle = exactTitle ? title : `${title} | Zybble`;
  const images = options.article?.thumbnail
    ? [
        {
          url: options.article.thumbnail.src,
          width: 1200,
          height: 675,
          alt: options.article.thumbnail.alt,
        },
      ]
    : [
        {
          url: "/social-card.png",
          width: 1200,
          height: 630,
          alt: "Zybble — AI video repurposing",
        },
      ];
  return {
    title: exactTitle ? { absolute: title } : title,
    description,
    keywords: options.keywords ? [...options.keywords] : undefined,
    alternates: { canonical: url },
    openGraph: options.article
      ? {
          type: "article",
          url,
          title: socialTitle,
          description,
          siteName: site.name,
          images,
          publishedTime: options.article.publishedTime,
          authors: options.article.authorUrl
            ? [options.article.authorUrl]
            : undefined,
        }
      : {
          type: "website",
          url,
          title: socialTitle,
          description,
          siteName: site.name,
          images,
        },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images,
    },
    robots:
      process.env.VERCEL_ENV === "preview"
        ? { index: false, follow: false }
        : options.noindex
          ? { index: false, follow: true }
          : undefined,
  };
}

export function marketingMetadata(
  path: keyof typeof marketingSeo,
  noindex?: boolean,
  canonicalPath: string = path,
) {
  const [title, description, keywords] = marketingSeo[path];
  return pageMetadata(canonicalPath, title, description, {
    exactTitle: true,
    keywords: keywords.split(", "),
    noindex,
  });
}
