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

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    const key = selector.includes("property")
      ? selector.match(/\[(?:property|name)="(.+?)"\]/)?.[1]
      : selector.match(/\[(?:name|property)="(.+?)"\]/)?.[1];
    if (!key) return;
    if (selector.startsWith("meta[name=")) el.setAttribute("name", key);
    else el.setAttribute("property", key);
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "content") el.setAttribute("content", v);
  });
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
  upsertMeta("meta[name=description]", { content: props.description });
  upsertMeta("meta[name=robots]", {
    content: props.robots ?? "index, follow, max-image-preview:large, max-snippet:-1",
  });
  upsertLink("canonical", canonical);

  upsertMeta("meta[property=og:title]", { content: ogTitle });
  upsertMeta("meta[property=og:description]", { content: ogDescription });
  upsertMeta("meta[property=og:url]", { content: canonical });
  upsertMeta("meta[property=og:type]", { content: props.ogType ?? "website" });
  upsertMeta("meta[property=og:image]", { content: ogImage });
  upsertMeta("meta[name=twitter:title]", { content: ogTitle });
  upsertMeta("meta[name=twitter:description]", { content: ogDescription });
  upsertMeta("meta[name=twitter:image]", { content: ogImage });

  // Page-level JSON-LD (previous injection removed first).
  document
    .head
    .querySelectorAll("script[data-seo-jsonld]")
    .forEach((n) => n.remove());
  if (props.jsonld) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-jsonld", "true");
    script.textContent = JSON.stringify(props.jsonld);
    document.head.appendChild(script);
  }
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
  upsertMeta("meta[name=robots]", { content: "noindex, nofollow" });
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
