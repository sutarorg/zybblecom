import Link from "next/link";
import {
  ArrowRight,
  CircleAlert,
  Database,
  Inbox,
  LockKeyhole,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AdminError, Page, Result } from "@/services/admin/contracts";
import { errorCopy } from "@/services/admin/service";
import { label } from "@/services/admin/format";
import { RetryButton } from "@/components/system/errors";
import { listingHref } from "@/services/admin/query";
export function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="ad-heading">
      <div>
        <span className="ad-eyebrow">
          <i />
          {eyebrow}
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Panel({
  title,
  description,
  extra,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ad-panel ${className}`}>
      <div className="ad-panel-head">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}
export function State({
  icon: Icon = Inbox,
  title,
  text,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="ad-state">
      <span className="ad-state-icon">
        <Icon size={21} aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Notice({
  error,
  empty,
}: {
  error: AdminError;
  empty?: string;
}) {
  if (error === "unavailable")
    return (
      <State
        icon={Database}
        title={empty ?? "Data connection required"}
        text="This preview doesn’t read or write administrative records."
      />
    );
  return (
    <div className="ad-alert" role="alert">
      <CircleAlert size={19} aria-hidden="true" />
      <div>
        <strong>
          {error === "not_found"
            ? "Record unavailable"
            : error === "forbidden"
              ? "Permission denied"
              : error === "expired"
                ? "Session expired"
                : "Unable to load this view"}
        </strong>
        <p>{errorCopy[error]}</p>
      </div>
      {["network", "unexpected"].includes(error) && <RetryButton />}
      {["expired", "unauthenticated"].includes(error) && (
        <Link className="ad-button" href="/login">
          Sign in
        </Link>
      )}
    </div>
  );
}
export function AccessState({ error }: { error: AdminError }) {
  return (
    <>
      <Heading
        eyebrow="RESTRICTED AREA"
        title={
          error === "expired"
            ? "Session expired"
            : error === "forbidden"
              ? "Permission denied"
              : error === "unauthenticated"
                ? "Administrator sign-in required"
                : "Unable to verify admin access"
        }
        description={errorCopy[error]}
      />
      <Panel title="Administrator access">
        <State
          icon={error === "forbidden" ? ShieldAlert : LockKeyhole}
          title="Access is verified on the server"
          text="Only an authorized administrator can view or act on internal records."
        >
          {["expired", "unauthenticated"].includes(error) ? (
            <Link href="/login" className="ad-button ad-primary">
              Sign in
            </Link>
          ) : error === "forbidden" ? (
            <Link href="/dashboard" className="ad-button">
              Return to workspace
            </Link>
          ) : (
            <RetryButton />
          )}
        </State>
      </Panel>
    </>
  );
}
const good = new Set([
  "active",
  "completed",
  "succeeded",
  "verified",
  "processed",
  "fulfilled",
  "copied",
  "applied",
  "released",
]);
const bad = new Set([
  "failed",
  "invalid",
  "suspended",
  "disputed",
  "asset_copy_failed",
  "rejected",
]);
const warning = new Set([
  "queued",
  "stuck",
  "pending",
  "processing",
  "uploading",
  "pending_reconciliation",
  "copying",
  "reserved",
  "saving",
]);
export function Badge({ value }: { value?: string }) {
  return value ? (
    <span
      className="ad-badge"
      data-tone={
        good.has(value)
          ? "good"
          : bad.has(value)
            ? "bad"
            : warning.has(value)
              ? "wait"
              : "neutral"
      }
    >
      <i aria-hidden="true" />
      {label(value)}
    </span>
  ) : (
    <span aria-label="Not available">—</span>
  );
}
export function DataList({
  items,
}: {
  items: readonly (readonly [string, ReactNode])[];
}) {
  return (
    <dl className="ad-data-list">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
export function RecordRef({
  href,
  children,
}: {
  href?: string;
  children: ReactNode;
}) {
  return href ? (
    <Link className="ad-link" prefetch={false} href={href}>
      {children}
    </Link>
  ) : (
    <strong>{children}</strong>
  );
}
export function DetailLink({
  href,
  children = "Inspect",
}: {
  href: string;
  children?: ReactNode;
}) {
  return (
    <Link href={href} className="ad-detail-link" prefetch={false}>
      {children}
      <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );
}
export function Pager({
  path,
  params,
  page,
  cursorKey = "cursor",
}: {
  path: string;
  params: Record<string, string | undefined>;
  page: Page<unknown>;
  cursorKey?: string;
}) {
  return page.nextCursor || page.previousCursor || params[cursorKey] ? (
    <nav className="ad-pages" aria-label="Results pages">
      {page.previousCursor ? (
        <Link
          className="ad-button"
          prefetch={false}
          href={listingHref(path, {
            ...params,
            [cursorKey]: page.previousCursor,
          })}
        >
          Previous
        </Link>
      ) : params[cursorKey] ? (
        <Link
          className="ad-button"
          prefetch={false}
          href={listingHref(path, { ...params, [cursorKey]: undefined })}
        >
          First page
        </Link>
      ) : null}
      {page.nextCursor && (
        <Link
          className="ad-button"
          prefetch={false}
          href={listingHref(path, { ...params, [cursorKey]: page.nextCursor })}
        >
          Next page <ArrowRight size={15} aria-hidden="true" />
        </Link>
      )}
    </nav>
  ) : null;
}
export function AdminLoading() {
  return (
    <div className="ad-loading" role="status">
      <span className="sr-only">Loading administrative records…</span>
      <div aria-hidden="true">
        <i />
        <i />
        <section>
          <i />
          <i />
          <i />
          <i />
        </section>
        <article>
          <i />
          <i />
          <i />
          <i />
          <i />
        </article>
      </div>
    </div>
  );
}
export type Column<T> = {
  name: string;
  render: (row: T) => ReactNode;
  mono?: boolean;
};
export function Records<T extends { id: string }>({
  title,
  result,
  columns,
  record,
  plural,
  filters,
  filtered = false,
  pager,
  children,
}: {
  title: string;
  result: Result<Page<T>>;
  columns: readonly Column<T>[];
  record: string;
  plural?: string;
  filters?: ReactNode;
  filtered?: boolean;
  pager?: ReactNode;
  children?: ReactNode;
}) {
  const items = result.ok ? result.value.items : [];
  return (
    <section className="ad-panel ad-records" aria-label={title}>
      {filters}
      {children}
      {!!items.length && (
        <p className="ad-scroll-note">
          Scroll the table sideways to see more columns.
        </p>
      )}
      <div
        className="ad-table-wrap"
        data-empty={items.length === 0}
        tabIndex={0}
        role="region"
        aria-label={`${title}, scrollable table`}
      >
        <table>
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              {columns.map(({ name }) => (
                <th key={name} scope="col">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                {columns.map(({ name, render, mono }, i) =>
                  i === 0 ? (
                    <th
                      scope="row"
                      key={name}
                      className={mono ? "ad-mono" : undefined}
                    >
                      {render(row)}
                    </th>
                  ) : (
                    <td key={name} className={mono ? "ad-mono" : undefined}>
                      {render(row)}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!result.ok ? (
        <Notice
          error={result.error}
          empty={`${plural ?? record} not connected`}
        />
      ) : items.length === 0 ? (
        <State
          title={
            filtered
              ? "No matching records"
              : `No ${plural?.toLowerCase() ?? record.toLowerCase()} yet`
          }
          text={
            filtered
              ? "Try a broader search or clear filters."
              : "Verified records will appear here as activity occurs."
          }
        />
      ) : (
        <div className="ad-table-foot">
          <span>
            {items.length} {items.length === 1 ? "record" : "records"} on this
            page
          </span>
          <span>Times in UTC</span>
        </div>
      )}
      {result.ok && pager}
    </section>
  );
}
