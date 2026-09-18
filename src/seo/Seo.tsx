import {
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import seoRoutes from "./routes.json";

// The repository is a Vite SPA rather than a Next.js app. This module is the
// equivalent route-aware metadata layer: the build also prerenders the same
// metadata into every public HTML document so crawlers do not have to wait for
// client JavaScript.
export const SITE_URL = seoRoutes.siteUrl;
export const DEFAULT_OG_IMAGE = `${SITE_URL}${seoRoutes.defaultImage}`;

export interface SeoProps {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  robots?: string;
  jsonld?: Record<string, unknown> | Record<string, unknown>[];
}

function escapeSelectorValue(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  const selector = `meta[${attr}="${escapeSelectorValue(key)}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMeta(attr: "name" | "property", key: string) {
  document.head
    .querySelector(`meta[${attr}="${escapeSelectorValue(key)}"]`)
    ?.remove();
}

function upsertLink(rel: string, href: string, extra: Record<string, string> = {}) {
  let el = document.head.querySelector(`link[rel="${escapeSelectorValue(rel)}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  Object.entries(extra).forEach(([key, value]) => el!.setAttribute(key, value));
}

function removeCanonical() {
  document.head.querySelector('link[rel="canonical"]')?.remove();
}

function absoluteUrl(pathOrUrl: string): string {
  return pathOrUrl.startsWith("http") ? pathOrUrl : `${SITE_URL}${pathOrUrl}`;
}

function cleanCanonicalPath(path: string): string {
  const withoutQueryOrHash = path.split(/[?#]/, 1)[0] || "/";
  if (withoutQueryOrHash === "/") return "/";
  return `/${withoutQueryOrHash.replace(/^\/+|\/+$/g, "")}`;
}

function baseJsonLd(path: string): Record<string, unknown>[] {
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Zybble",
      url: `${SITE_URL}/`,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/zybble-mark.svg` },
      email: "hello@zybble.com",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: "Zybble",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
  ];
  if (path === "/") {
    graph.push({
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "Zybble",
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "AI-powered lead generation and sales prospecting software for finding, enriching and reaching business leads.",
      creator: { "@id": `${SITE_URL}/#organization` },
    });
  }
  return graph;
}

function refreshJsonLd(path: string, jsonld?: Record<string, unknown> | Record<string, unknown>[]) {
  document
    .head
    .querySelectorAll("script[data-seo-jsonld], script[data-static-seo-jsonld]")
    .forEach((node) => node.remove());

  const pageGraph = jsonld ? (Array.isArray(jsonld) ? jsonld : [jsonld]) : [];
  const payload = [
    { "@context": "https://schema.org", "@graph": baseJsonLd(path) },
    ...pageGraph,
  ];
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-seo-jsonld", "true");
  script.textContent = JSON.stringify(payload);
  document.head.appendChild(script);
}

export function applySeo(props: SeoProps) {
  const path = cleanCanonicalPath(props.path);
  const canonical = absoluteUrl(path);
  const ogTitle = props.ogTitle ?? props.title;
  const ogDescription = props.ogDescription ?? props.description;
  const ogImage = absoluteUrl(props.ogImage ?? seoRoutes.defaultImage);
  const robots = props.robots ?? "index, follow, max-image-preview:large, max-snippet:-1";

  document.title = props.title;
  upsertMeta("name", "description", props.description);
  upsertMeta("name", "robots", robots);
  upsertMeta("name", "googlebot", robots);
  upsertMeta("name", "author", "Zybble, Inc.");
  upsertMeta("property", "og:site_name", "Zybble");
  upsertMeta("property", "og:locale", "en_US");
  upsertMeta("property", "og:title", ogTitle);
  upsertMeta("property", "og:description", ogDescription);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:type", props.ogType ?? "website");
  upsertMeta("property", "og:image", ogImage);
  upsertMeta("property", "og:image:width", "1200");
  upsertMeta("property", "og:image:height", "630");
  upsertMeta("property", "og:image:type", "image/png");
  upsertMeta("property", "og:image:alt", `${ogTitle} — Zybble`);
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", ogTitle);
  upsertMeta("name", "twitter:description", ogDescription);
  upsertMeta("name", "twitter:image", ogImage);
  upsertMeta("name", "twitter:image:alt", `${ogTitle} — Zybble`);
  if (/\bnoindex\b/i.test(robots)) {
    removeCanonical();
    document.head.querySelector('link[rel="alternate"][hreflang="en"]')?.remove();
  } else {
    upsertLink("canonical", canonical);
    upsertLink("alternate", canonical, { hreflang: "en" });
  }

  const verification = (
    import.meta as ImportMeta & { env?: Record<string, string | undefined> }
  ).env?.VITE_GOOGLE_SITE_VERIFICATION;
  if (verification) upsertMeta("name", "google-site-verification", verification);

  refreshJsonLd(path, props.jsonld);
}

/** Route-aware head manager. Also resets scroll on navigation. */
export function Seo(props: SeoProps) {
  useEffect(() => {
    applySeo(props);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [
    props.path,
    props.title,
    props.description,
    props.robots,
    props.ogType,
    props.ogImage,
    props.ogTitle,
    props.ogDescription,
  ]);
  return null;
}

/** Private/authenticated routes must never inherit public-page metadata. */
export function noindexApp() {
  const robots = "noindex, nofollow, noarchive, nosnippet";
  upsertMeta("name", "robots", robots);
  upsertMeta("name", "googlebot", robots);
  removeCanonical();
  removeMeta("property", "og:url");
  removeMeta("property", "og:type");
  document
    .head
    .querySelectorAll("script[data-seo-jsonld], script[data-static-seo-jsonld]")
    .forEach((node) => node.remove());
}

// ————————————————— Pathname routing —————————————————

export function usePathname(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onNav = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onNav);
    return () => window.removeEventListener("popstate", onNav);
  }, []);
  return path;
}

export function navigate(to: string) {
  const [pathOnly, frag] = to.split("#");
  if (window.location.pathname === pathOnly && !frag) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  if (frag) {
    setTimeout(() => {
      document
        .getElementById(frag)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  } else {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string;
  children: ReactNode;
};

/** Crawl-friendly internal link (real href + client-side nav). */
export function MLink({ to, children, onClick, ...rest }: LinkProps) {
  return (
    <a
      href={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${cleanCanonicalPath(it.path)}`,
    })),
  };
}
