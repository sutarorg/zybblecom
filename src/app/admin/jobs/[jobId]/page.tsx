import Link from "next/link";
import { Activity, ShieldCheck } from "lucide-react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { hooks } from "@/components/admin/columns";
import {
  Badge,
  DataList,
  Heading,
  Notice,
  Panel,
  Pager,
  RecordRef,
  Records,
  State,
} from "@/components/admin/ui";
import { adminRead } from "@/services/admin/server";
import { duration, label, num, time } from "@/services/admin/format";
import {
  cursor,
  jobPath,
  listingHref,
  userPath,
  type Query,
} from "@/services/admin/query";
import type { JobOperation } from "@/services/admin/contracts";
export const metadata = { title: "Job details · Admin" };
const descriptions: Record<JobOperation, string> = {
  reconcile:
    "Compare the existing provider job with internal state. This does not submit a new job.",
  retry_assets:
    "Retry eligible copies for already generated files. This does not request new clips.",
  investigate: "Flag the job for an authorized operator to review.",
  release_reservation:
    "The server must verify settlement is eligible before releasing this reservation.",
  reprocess:
    "This may submit a new paid provider job. The server must quote the credit and provider-cost consequences before you can confirm.",
};
export default async function JobPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<Query>;
}) {
  const { jobId } = await params;
  const q = await searchParams;
  const next = cursor(q);
  const path = jobPath(jobId);
  const result = await adminRead("job", jobId);
  if (!result.ok)
    return (
      <>
        <Heading
          eyebrow="OPERATIONS"
          title="Job details"
          description="Review provider stages, asset synchronization, and credit settlement for a verified job."
          action={
            <Link href="/admin/jobs" className="ad-button">
              Back to jobs
            </Link>
          }
        />
        <Panel
          title="Processing record"
          extra={<Activity size={21} aria-hidden="true" />}
        >
          <Notice
            error={result.error}
            empty="Processing record not connected"
          />
        </Panel>
      </>
    );
  const job = result.value;
  const events = await adminRead("webhooks", {
    jobId,
    cursor: next,
  });
  const provider = job.provider;
  const settings = job.settings;
  const reservation = job.reservation;
  return (
    <>
      <Heading
        eyebrow="OPERATIONS"
        title="Job details"
        description={`Generation job ${job.id}`}
        action={
          <Link href="/admin/jobs" className="ad-button">
            Back to jobs
          </Link>
        }
      />
      <div className="ad-detail-grid">
        <Panel title="Processing record">
          <DataList
            items={[
              ["Internal job ID", job.id],
              ["ClipSDK job ID", job.providerId],
              [
                "User",
                <RecordRef key="user" href={userPath(job.owner.id)}>
                  {job.owner.label}
                </RecordRef>,
              ],
              [
                "Project",
                <RecordRef
                  key="project"
                  href={
                    listingHref("/admin/projects", {
                      inspect: job.project.id,
                    }) + "#record-detail"
                  }
                >
                  {job.project.title}
                </RecordRef>,
              ],
              ["Status", <Badge key="status" value={job.status} />],
              ["Provider stage", job.providerStage && label(job.providerStage)],
              ["Source duration", duration(job.sourceSeconds)],
              ["Created (UTC)", time(job.createdAt)],
              ["Completed (UTC)", time(job.completedAt)],
              ["Processing time", duration(job.elapsedSeconds)],
            ]}
          />
        </Panel>
        <Panel
          title="Provider response"
          description="Verified and sanitized metadata only."
        >
          {provider ? (
            <DataList
              items={[
                [
                  "Provider status",
                  <Badge key="provider" value={provider.status} />,
                ],
                ["Error code", provider.errorCode],
                ["Output count", num(provider.outputCount)],
                [
                  "Billing basis",
                  provider.billingBasis && label(provider.billingBasis),
                ],
                ["Source minutes", num(provider.usageSourceMinutes)],
                ["Output duration", duration(provider.outputSeconds)],
                ["Verified (UTC)", time(provider.verifiedAt)],
              ]}
            />
          ) : (
            <p>No provider response metadata is available.</p>
          )}
        </Panel>
        <Panel title="Request settings">
          {settings ? (
            <DataList
              items={[
                ["Requested clips", num(settings.clips)],
                [
                  "Target clip length",
                  `${settings.min_seconds}–${settings.max_seconds} sec`,
                ],
                ["Aspect ratio", settings.aspect],
                ["Reframing", label(settings.reframe)],
                [
                  "Captions",
                  settings.captions === false
                    ? "Off"
                    : label(settings.captions),
                ],
              ]}
            />
          ) : (
            <p>No verified request settings are available.</p>
          )}
        </Panel>
        <Panel title="Credits and asset copy">
          <DataList
            items={[
              ["Credits reserved", num(job.reserved)],
              ["Credits consumed", num(job.consumed)],
              ["Reservation ID", reservation?.id],
              [
                "Reservation state",
                <Badge key="reservation" value={reservation?.status} />,
              ],
              ["Reservation amount", num(reservation?.credits)],
              ["Settled (UTC)", time(reservation?.settledAt)],
              [
                "Asset-copy state",
                <Badge key="asset" value={job.assetState} />,
              ],
            ]}
          />
        </Panel>
      </div>
      <div className="ad-detail-grid">
        <Panel
          title="Job actions"
          description="Reconciliation and asset retries never create a new ClipSDK job."
          extra={<ShieldCheck size={19} aria-hidden="true" />}
        >
          {job.actions.length ? (
            <div className="ad-inline">
              {job.actions.map((kind) => (
                <ActionDialog
                  key={kind}
                  title={label(kind)}
                  description={descriptions[kind]}
                  target={{ kind, id: job.id }}
                />
              ))}
            </div>
          ) : (
            <p>There are no eligible actions for this job.</p>
          )}
        </Panel>
        <Panel title="Retry history">
          {job.retries?.length ? (
            <ul className="ad-results">
              {job.retries.map((r) => (
                <li key={r.id}>
                  <span>
                    <strong>{label(r.kind)}</strong>
                    <small>{time(r.at)} UTC</small>
                  </span>
                  <Badge value={r.status} />
                </li>
              ))}
            </ul>
          ) : (
            <State
              title="No retry records available"
              text="Verified retry attempts will appear here."
            />
          )}
        </Panel>
      </div>
      <div className="ad-section-title">
        <h2>Webhook events</h2>
      </div>
      <Records
        title="Related webhook events"
        plural="Webhook events"
        record="Events"
        result={events}
        columns={hooks(
          (r) =>
            listingHref("/admin/webhooks", { inspect: r.id, jobId }) +
            "#record-detail",
        )}
        pager={
          events.ok && (
            <Pager path={path} params={{ cursor: next }} page={events.value} />
          )
        }
      />
    </>
  );
}
