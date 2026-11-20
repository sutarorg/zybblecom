import type { Metadata } from "next";
import { site } from "@/config/site";

export function pageMetadata(
  path: string,
  title: string,
  description: string,
  options: {
    noindex?: boolean;
    article?: { publishedTime: string; author: string };
  } = {},
): Metadata {
  const url = `${site.url}${path}`;
  const socialTitle = `${title} | Zybble`;
  const images = [
    {
      url: "/social-card.png",
      width: 1200,
      height: 630,
      alt: "Zybble — AI video repurposing",
    },
  ];
  return {
    title,
    description,
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
          authors: [options.article.author],
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
