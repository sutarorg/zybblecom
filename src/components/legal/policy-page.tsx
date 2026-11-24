import Link from "next/link";
import type { ReactNode } from "react";
import { PageIntro } from "@/components/shared/page";
import { supportEmail, type legalLinks } from "@/config/legal";
import styles from "./policy-page.module.css";

type PolicyPath = (typeof legalLinks)[number]["href"];

export function PolicyPage({
  path,
  title,
  intro,
  updated,
  children,
}: {
  path: PolicyPath;
  title: string;
  intro: string;
  updated: string;
  children: ReactNode;
}) {
  const formatted = new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(updated));
  return (
    <article className={styles.policy}>
      <PageIntro path={path} label="Legal" title={title} description={intro} />
      <div className={`narrow section compact ${styles.content}`}>
        <p className={styles.updated}>
          Last updated: <time dateTime={updated}>{formatted}</time>
        </p>
        {children}
      </div>
    </article>
  );
}

export function PolicySection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>{title}</h2>
      {children}
    </section>
  );
}

export function SupportLinks() {
  return (
    <>
      <Link href="/contact">Contact Zybble</Link> or email{" "}
      <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
    </>
  );
}
