import type { Metadata } from "next";
import { marketingSeo } from "@/config/marketing-seo";
import { site } from "@/config/site";

// Keep stable assets and let the homepage advertise the 96px PNG first.
export function faviconMetadata(preferred: "ico" | "png" = "ico") {
  const png = {
    url: "/icons/favicon-96.png",
    sizes: "96x96",
    type: "image/png",
  };
  const ico = {
    url: "/favicon.ico",
    sizes: "16x16 32x32 48x48",
    type: "image/x-icon",
  };
  return {
    icon: [
      ...(preferred === "png" ? [png, ico] : [ico, png]),
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  } satisfies NonNullable<Metadata["icons"]>;
}

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
