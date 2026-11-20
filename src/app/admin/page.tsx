import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  Clapperboard,
  Coins,
  Database,
  Film,
  FolderOpen,
  Radio,
  ReceiptText,
  Shield,
  TriangleAlert,
  Users,
  Webhook,
} from "lucide-react";
import { Bolt } from "@/components/ui/primitives";
import {
  Badge,
  Heading,
  Pager,
  Panel,
  Records,
  State,
  type Column,
} from "@/components/admin/ui";
import { adminRead, adminSession } from "@/services/admin/server";
import {
  cursor,
  jobPath,
  listingHref,
  userPath,
  type Query,
} from "@/services/admin/query";
import { label, money, num, time } from "@/services/admin/format";
import type {
  Activity as ActivityRecord,
  Permission,
  Trend,
} from "@/services/admin/contracts";
export const metadata = { title: "Operations overview" };
const targetHref = (target: NonNullable<ActivityRecord["target"]>) =>
  target.kind === "users"
    ? userPath(target.id)
    : target.kind === "jobs"
      ? jobPath(target.id)
      : target.kind === "credits"
        ? listingHref("/admin/credits", { userId: target.id })
        : listingHref(`/admin/${target.kind}`, { inspect: target.id }) +
          "#record-detail";
const activityColumns = (
  canView: (p: Permission) => boolean,
): Column<ActivityRecord>[] => [
  {
    name: "Activity",
    render: (r) =>
      r.target && canView(r.target.kind) ? (
        <Link className="ad-link" href={targetHref(r.target)}>
          {r.summary}
        </Link>
      ) : (
        r.summary
      ),
  },
  { name: "Type", render: (r) => <Badge value={r.kind} /> },
  { name: "Time (UTC)", render: (r) => time(r.at) },
];
function TrendView({ trend }: { trend: Trend }) {
  const rows = trend.points
    .filter((p) => Number.isFinite(p.value) && p.value >= 0)
    .slice(-31);
  if (!rows.length) return null;
  const max = Math.max(1, ...rows.map((x) => x.value));
  return (
    <figure className="ad-trend">
      <figcaption>{label(trend.metric)}</figcaption>
      <div className="ad-bars" aria-hidden="true">
        {rows.map((p, i) => (
          <i
            key={`${p.date}:${i}`}
            style={{ height: `${(p.value / max) * 100}%` }}
          />
        ))}
      </div>
      <div aria-hidden="true" className="ad-range">
        <span>{rows[0].date}</span>
        <span>{rows.at(-1)?.date}</span>
      </div>
      <details>
        <summary>View values</summary>
        <dl>
          {rows.map((p, i) => (
            <div key={`${p.date}:${i}`}>
              <dt>{p.date}</dt>
              <dd>{num(p.value)}</dd>
            </div>
          ))}
        </dl>
      </details>
    </figure>
  );
}
export default async function Overview({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const q = await searchParams;
  const after = cursor(q);
  const [snapshot, activity, session] = await Promise.all([
    adminRead("overview"),
    adminRead("activity", { cursor: after }),
    adminSession(),
  ]);
  const d = snapshot.ok ? snapshot.value : null;
  const canView = (permission: Permission) =>
    session.ok
      ? session.value.permissions.includes(permission)
      : session.error === "unavailable";
  const metrics = [
    {
      title: "Total users",
      icon: Users,
      value: num(d?.users),
      permission: "users" as const,
      href: "/admin/users",
    },
    {
      title: "Total projects",
      icon: FolderOpen,
      value: num(d?.projects),
      permission: "projects" as const,
      href: "/admin/projects",
    },
    {
      title: "Videos processed",
      icon: Film,
      value: num(d?.processed),
      permission: "projects" as const,
      href: "/admin/projects?status=completed",
    },
    {
      title: "Clips generated",
      icon: Clapperboard,
      value: num(d?.clips),
      permission: "projects" as const,
      href: "/admin/projects?status=completed",
    },
    {
      title: "Gross payment volume",
      icon: ReceiptText,
      value: d?.grossByCurrency?.length
        ? d.grossByCurrency.map(money).join(" · ")
        : "—",
      permission: "payments" as const,
      href: "/admin/payments",
    },
    {
      title: "Available / consumed",
      icon: Coins,
      value: d?.credits
        ? `${num(d.credits.available)} / ${num(d.credits.consumed)}`
        : "—",
      permission: "credits" as const,
      href: "/admin/credits",
    },
    {
      title: "Active processing jobs",
      icon: Activity,
      value: num(d?.activeJobs),
      permission: "jobs" as const,
      href: "/admin/jobs?filter=processing",
    },
    {
      title: "Failed processing jobs",
      icon: TriangleAlert,
      value: num(d?.failedJobs),
      permission: "jobs" as const,
      href: "/admin/jobs?filter=failed",
    },
  ];
  return (
    <>
      <div className="ad-hero">
        <Heading
          eyebrow="ZYBBLE OPERATIONS"
          title="Operations overview"
          description="Monitor platform activity, processing, and billing from one place."
        />
        <div className="ad-hero-art" aria-hidden="true">
          <div className="ad-hero-orbit" />
          <div className="ad-hero-orbit second" />
          <span className="ad-hero-node one" />
          <span className="ad-hero-node two" />
          <span className="ad-hero-node three" />
          <span className="ad-hero-bolt">
            <Bolt />
          </span>
        </div>
        <div className="ad-hero-status">
          <span>
            <Shield size={15} aria-hidden="true" />
            {snapshot.ok
              ? "Verified data"
              : snapshot.error === "unavailable"
                ? "No data connected"
                : "Data unavailable"}
          </span>
          <span>
            {d ? `As of ${time(d.asOf)} UTC` : "Private operations console"}
          </span>
        </div>
      </div>
      {!snapshot.ok && snapshot.error !== "unavailable" && (
        <div className="ad-alert" role="alert">
          Metrics couldn’t be loaded. Check your permissions or refresh the
          view.
        </div>
      )}
      <section className="ad-metric-section" aria-labelledby="snapshot-title">
        <div className="ad-section-title">
          <h2 id="snapshot-title">Platform snapshot</h2>
          <span>{d ? "Verified totals" : "Awaiting a connection"}</span>
        </div>
        <div className="ad-metrics">
          {metrics.map(({ title, icon: Icon, value, href, permission }, i) => (
            <article key={title} className="ad-metric" data-accent={i}>
              <div>
                <span>
                  <Icon size={18} aria-hidden="true" />
                </span>
                {canView(permission) && (
                  <Link
                    href={href}
                    prefetch={false}
                    aria-label={`Open ${title.toLowerCase()}`}
                  >
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                )}
              </div>
              <h3>{title}</h3>
              <strong aria-label={value === "—" ? "Not available" : undefined}>
                {value}
              </strong>
              {title === "Available / consumed" && <small>Credits</small>}
            </article>
          ))}
        </div>
      </section>
      <div className="ad-overview-lower">
        <Panel
          title="Activity trends"
          description="Recorded changes over time, not live estimates."
          extra={<ChartNoAxesColumnIncreasing size={20} aria-hidden="true" />}
        >
          {d?.trends?.some((t) => t.points.length > 0) ? (
            <div className="ad-trend-grid">
              {d.trends.map((t) => (
                <TrendView key={t.metric} trend={t} />
              ))}
            </div>
          ) : (
            <State
              icon={ChartNoAxesColumnIncreasing}
              title={d ? "No activity to chart yet" : "Analytics not connected"}
              text="Trends appear after verified platform activity is recorded."
            />
          )}
        </Panel>
        <Panel
          title="Operational checks"
          description="Investigate job and delivery states."
          extra={<Radio size={20} aria-hidden="true" />}
          className="ad-operational"
        >
          {canView("jobs") && (
            <>
              <Link href="/admin/jobs?filter=stuck">
                <span>
                  <Activity size={17} aria-hidden="true" />
                  Stuck jobs
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link href="/admin/jobs?filter=asset_copy_failed">
                <span>
                  <Database size={17} aria-hidden="true" />
                  Asset-copy failures
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </>
          )}
          {canView("webhooks") && (
            <Link href="/admin/webhooks?status=failed">
              <span>
                <Webhook size={17} aria-hidden="true" />
                Webhook failures
              </span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          )}
          {!canView("jobs") && !canView("webhooks") && (
            <p>Your current role does not include job or webhook access.</p>
          )}
        </Panel>
      </div>
      <div className="ad-section-title">
        <h2>Recent activity</h2>
        {canView("audit") && (
          <Link href="/admin/audit-logs" className="ad-link">
            View audit logs <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
      <Records
        title="Recent platform activity"
        result={activity}
        columns={activityColumns(canView)}
        record="Recent activity"
        plural="Activity records"
        pager={
          activity.ok && (
            <Pager
              path="/admin"
              params={{ cursor: after }}
              page={activity.value}
            />
          )
        }
      />
    </>
  );
}
