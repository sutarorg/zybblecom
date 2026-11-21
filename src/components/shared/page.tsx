import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Action, Eyebrow, IconTile } from "@/components/ui/primitives";
import { site } from "@/config/site";
import { JsonLd } from "@/components/shared/structured-data";

export function PageIntro({
  label,
  title,
  description,
  path,
  actions,
  breadcrumb,
}: {
  label: string;
  title: ReactNode;
  description: string;
  path: string;
  actions?: ReactNode;
  breadcrumb?: { parent: { name: string; path: string }; current: string };
}) {
  return (
    <section className="page-intro">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <ChevronRight size={13} aria-hidden="true" />
          {breadcrumb && (
            <>
              <Link href={breadcrumb.parent.path}>
                {breadcrumb.parent.name}
              </Link>
              <ChevronRight size={13} aria-hidden="true" />
            </>
          )}
          <span aria-current="page">{breadcrumb?.current ?? label}</span>
        </nav>
        <Eyebrow pill>{label}</Eyebrow>
        <h1>{title}</h1>
        <p>{description}</p>
        {actions && <div className="actions justify-center">{actions}</div>}
      </div>
      <JsonLd
        value={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
            ...(breadcrumb
              ? [
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: breadcrumb.parent.name,
                    item: `${site.url}${breadcrumb.parent.path}`,
                  },
                ]
              : []),
            {
              "@type": "ListItem",
              position: breadcrumb ? 3 : 2,
              name: breadcrumb?.current ?? label,
              item: `${site.url}${path}`,
            },
          ],
        }}
      />
    </section>
  );
}
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <IconTile icon={icon} />
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function ResourceCard({
  href,
  title,
  text,
  icon,
}: {
  href: string;
  title: string;
  text: string;
  icon: LucideIcon;
}) {
  return (
    <article className="card resource-card">
      <IconTile icon={icon} />
      <h3>{title}</h3>
      <p>{text}</p>
      <Action href={href} variant="text">
        {title}
      </Action>
    </article>
  );
}
