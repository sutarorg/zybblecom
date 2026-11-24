import type { MetadataRoute } from "next";
import { publicPaths, site } from "@/config/site";
import { articles } from "@/config/editorial";
export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.VERCEL_ENV === "preview") return [];
  const paths = [...publicPaths, ...(articles.length ? ["/blog"] : [])];
  return [
    ...paths.map((path) => ({ url: `${site.url}${path}` })),
    ...articles.map((article) => ({
      url: `${site.url}/blog/${article.slug}`,
      lastModified: article.updatedAt ?? article.publishedAt,
    })),
  ];
}
