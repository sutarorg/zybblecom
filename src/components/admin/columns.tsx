import type {
  AuditRecord,
  HookRecord,
  JobRecord,
  LedgerRecord,
  Payment,
  ProjectRecord,
  UserRecord,
} from "@/services/admin/contracts";
import { time, num, money, duration, label } from "@/services/admin/format";
import { jobPath, listingHref, userPath } from "@/services/admin/query";
import { Badge, DetailLink, RecordRef, type Column } from "./ui";
export const users: Column<UserRecord>[] = [
  {
    name: "User",
    render: (r) => (
      <RecordRef href={userPath(r.id)}>{r.name ?? "Unnamed account"}</RecordRef>
    ),
  },
  { name: "Email", render: (r) => r.email },
  { name: "Registered (UTC)", render: (r) => time(r.createdAt) },
  { name: "Country", render: (r) => r.country ?? "—" },
  { name: "Available credits", render: (r) => num(r.available) },
  { name: "Purchases", render: (r) => num(r.purchases) },
  { name: "Projects processed", render: (r) => num(r.projectsProcessed) },
  { name: "Account status", render: (r) => <Badge value={r.status} /> },
  {
    name: "Actions",
    render: (r) => <DetailLink href={userPath(r.id)}>Details</DetailLink>,
  },
];
export const projects = (
  inspect: (r: ProjectRecord) => string,
): Column<ProjectRecord>[] => [
  {
    name: "Project ID",
    mono: true,
    render: (r) => <RecordRef href={inspect(r)}>{r.id}</RecordRef>,
  },
  {
    name: "User",
    render: (r) => (
      <RecordRef href={userPath(r.owner.id)}>{r.owner.label}</RecordRef>
    ),
  },
  { name: "Project name", render: (r) => r.title },
  { name: "Source duration", render: (r) => duration(r.sourceSeconds) },
  { name: "Uploaded (UTC)", render: (r) => time(r.uploadedAt) },
  { name: "Status", render: (r) => <Badge value={r.status} /> },
  { name: "Clips", render: (r) => num(r.clipCount) },
  { name: "Actions", render: (r) => <DetailLink href={inspect(r)} /> },
];
export const jobs: Column<JobRecord>[] = [
  {
    name: "Job ID",
    mono: true,
    render: (r) => <RecordRef href={jobPath(r.id)}>{r.id}</RecordRef>,
  },
  { name: "ClipSDK job ID", mono: true, render: (r) => r.providerId ?? "—" },
  {
    name: "User",
    render: (r) => (
      <RecordRef href={userPath(r.owner.id)}>{r.owner.label}</RecordRef>
    ),
  },
  {
    name: "Project",
    render: (r) => (
      <RecordRef
        href={
          listingHref("/admin/projects", { inspect: r.project.id }) +
          "#record-detail"
        }
      >
        {r.project.title}
      </RecordRef>
    ),
  },
  { name: "Source duration", render: (r) => duration(r.sourceSeconds) },
  { name: "Requested clips", render: (r) => num(r.requestedClips) },
  {
    name: "Status",
    render: (r) => (
      <div className="ad-stack">
        <Badge value={r.status} />
        {r.stuck && <Badge value="stuck" />}
        {r.assetState === "failed" && <Badge value="asset_copy_failed" />}
      </div>
    ),
  },
  {
    name: "Provider stage",
    render: (r) => (r.providerStage ? label(r.providerStage) : "—"),
  },
  { name: "Reserved", render: (r) => num(r.reserved) },
  { name: "Consumed", render: (r) => num(r.consumed) },
  { name: "Created (UTC)", render: (r) => time(r.createdAt) },
  { name: "Completed (UTC)", render: (r) => time(r.completedAt) },
  {
    name: "Actions",
    render: (r) => <DetailLink href={jobPath(r.id)}>Details</DetailLink>,
  },
];
export const payments = (
  inspect: (r: Payment) => string,
): Column<Payment>[] => [
  {
    name: "Transaction ID",
    mono: true,
    render: (r) => <RecordRef href={inspect(r)}>{r.id}</RecordRef>,
  },
  { name: "Dodo payment ID", mono: true, render: (r) => r.dodoId },
  {
    name: "Customer",
    render: (r) => (
      <RecordRef href={userPath(r.customer.id)}>{r.customer.label}</RecordRef>
    ),
  },
  { name: "Pack", render: (r) => r.pack },
  { name: "Currency", render: (r) => r.money.currency },
  { name: "Amount", render: (r) => money(r.money) },
  { name: "Status", render: (r) => <Badge value={r.status} /> },
  { name: "Purchased (UTC)", render: (r) => time(r.purchasedAt) },
  { name: "Fulfillment", render: (r) => <Badge value={r.fulfillment} /> },
  {
    name: "Actions",
    render: (r) => <DetailLink href={inspect(r)}>Details</DetailLink>,
  },
];
export const ledger: Column<LedgerRecord>[] = [
  { name: "Entry ID", mono: true, render: (r) => r.id },
  {
    name: "Customer",
    render: (r) => (
      <RecordRef href={userPath(r.customer.id)}>{r.customer.label}</RecordRef>
    ),
  },
  { name: "Operation", render: (r) => <Badge value={r.kind} /> },
  { name: "Previous", render: (r) => num(r.before) },
  { name: "Change", render: (r) => `${r.delta > 0 ? "+" : ""}${num(r.delta)}` },
  { name: "New balance", render: (r) => num(r.after) },
  { name: "Admin ID", mono: true, render: (r) => r.adminId ?? "—" },
  { name: "Reason", render: (r) => r.reason ?? "—" },
  { name: "Reference", mono: true, render: (r) => r.reference ?? "—" },
  { name: "Recorded (UTC)", render: (r) => time(r.at) },
];
export const hooks = (
  inspect: (r: HookRecord) => string,
): Column<HookRecord>[] => [
  {
    name: "Event ID",
    mono: true,
    render: (r) => <RecordRef href={inspect(r)}>{r.id}</RecordRef>,
  },
  { name: "Source", render: (r) => label(r.source) },
  { name: "Event type", render: (r) => r.type ?? "—" },
  { name: "Received (UTC)", render: (r) => time(r.receivedAt) },
  { name: "Signature", render: (r) => <Badge value={r.signature} /> },
  { name: "Processing", render: (r) => <Badge value={r.status} /> },
  {
    name: "Related record",
    mono: true,
    render: (r) =>
      r.related ? (
        <RecordRef
          href={
            r.related.kind === "job"
              ? jobPath(r.related.id)
              : listingHref("/admin/payments", { inspect: r.related.id }) +
                "#record-detail"
          }
        >
          {r.related.id}
        </RecordRef>
      ) : (
        "—"
      ),
  },
  { name: "Error summary", render: (r) => r.errorSummary ?? "—" },
  {
    name: "Actions",
    render: (r) => <DetailLink href={inspect(r)}>Details</DetailLink>,
  },
];
export const audit: Column<AuditRecord>[] = [
  { name: "Administrator", render: (r) => r.actor.label },
  {
    name: "Action",
    render: (r) => (
      <div className="ad-stack">
        <b>{r.action}</b>
        <small>{label(r.category)}</small>
      </div>
    ),
  },
  { name: "Record ID", mono: true, render: (r) => r.recordId },
  { name: "Timestamp (UTC)", render: (r) => time(r.at) },
  { name: "Reason", render: (r) => r.reason ?? "—" },
  { name: "Result", render: (r) => <Badge value={r.status} /> },
];
