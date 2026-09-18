import {
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";

// ————————————————————————————————————————————————————————————
// SEO runtime: per-route <head> management + real, crawlable
// pathname routing for the marketing site. The authenticated app
// continues to use hash routes and is explicitly noindexed.
// ————————————————————————————————————————————————————————————

export const SITE_URL = "https://zybble.com";

export interface SeoProps {
  title: string;
  description: string;
  path: string; // canonical path, e.g. "/pricing"
  ogTitle?: string;
  ogDescription?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  robots?: string; // defaults to index,follow
  jsonld?: Record<string, unknown> | Record<string, unknown>[];
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  // Attribute VALUES containing ":" (og:title, twitter:title) must be quoted
  // or querySelector throws SyntaxError — the value is always quoted here.
  const selector = `meta[${attr}="${CSS.escape(key)}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function applySeo(props: SeoProps) {
  const canonical = `${SITE_URL}${props.path}`;
  const ogTitle = props.ogTitle ?? props.title;
  const ogDescription = props.ogDescription ?? props.description;
  const ogImage = props.ogImage ?? `${SITE_URL}/og.png`;

  document.title = props.title;
  upsertMeta("name", "description", props.description);
  upsertMeta("name", "robots", props.robots ?? "index, follow, max-image-preview:large, max-snippet:-1");
  upsertLink("canonical", canonical);

  upsertMeta("property", "og:site_name", "Zybble");
  upsertMeta("property", "og:locale", "en_US");
  upsertMeta("property", "og:title", ogTitle);
  upsertMeta("property", "og:description", ogDescription);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:type", props.ogType ?? "website");
  upsertMeta("property", "og:image", ogImage);
  upsertMeta("property", "og:image:width", "1200");
  upsertMeta("property", "og:image:height", "630");
  upsertMeta("property", "og:image:alt", "Zybble — AI-powered lead generation and outreach");
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", ogTitle);
  upsertMeta("name", "twitter:description", ogDescription);
  upsertMeta("name", "twitter:image", ogImage);
  upsertMeta("name", "twitter:image:alt", "Zybble — AI-powered lead generation and outreach");

  // Replace build-time JSON-LD after hydration with one canonical graph. This
  // keeps prerendered HTML useful to crawlers without leaving duplicate
  // Organization/Breadcrumb objects in the live document.
  document
    .head
    .querySelectorAll('script[type="application/ld+json"][data-static-jsonld], script[data-seo-jsonld]')
    .forEach((n) => n.remove());
  const baseJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "Zybble",
      url: `${SITE_URL}/`,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.svg`, width: 938, height: 938 },
      email: "hello@zybble.com",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: "Zybble",
      publisher: { "@id": `${SITE_URL}/#org` },
      inLanguage: "en",
    },
  ];
  const pageJsonLd = props.jsonld
    ? Array.isArray(props.jsonld)
      ? props.jsonld
      : [props.jsonld]
    : [];
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-seo-jsonld", "true");
  script.textContent = JSON.stringify([...baseJsonLd, ...pageJsonLd]);
  document.head.appendChild(script);
}

/** Route-aware head manager. Also resets scroll on navigation. */
export function Seo(props: SeoProps) {
  useEffect(() => {
    applySeo(props);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.path]);
  return null;
}

export function noindexApp() {
  upsertMeta("name", "robots", "noindex, nofollow");
}

// ————————————————— Pathname routing —————————————————

export function usePathname(): string {
  const [path, setPath] = useState(() =>
    typeof window === "undefined" ? "/" : window.location.pathname
  );
  useEffect(() => {
    const onNav = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onNav);
    return () => window.removeEventListener("popstate", onNav);
  }, []);
  return path;
}

export function navigate(to: string) {
  const [pathOnly, frag] = to.split("#");
  if (window.location.pathname === to) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  if (frag) {
    // Anchor targets (e.g. /privacy#dpa) — scroll the section into view.
    setTimeout(() => {
      document
        .getElementById(frag)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  } else {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }
  void pathOnly;
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
      item: `${SITE_URL}${it.path}`,
    })),
  };
}
