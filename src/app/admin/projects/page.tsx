import Link from "next/link";
import {
  Badge,
  DataList,
  Heading,
  Notice,
  Panel,
  RecordRef,
} from "@/components/admin/ui";
import { projects } from "@/components/admin/columns";
import { filter, Listing } from "@/components/admin/listing";
import { adminRead } from "@/services/admin/server";
import {
  choice,
  cursor,
  jobPath,
  listingHref,
  one,
  projectStates,
  userPath,
  type Query,
} from "@/services/admin/query";
import { duration, num, time } from "@/services/admin/format";
import { bytesText } from "@/services/workspace-format";
export const metadata = { title: "Projects · Admin" };
export default async function Projects({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const q = await searchParams;
  const path = "/admin/projects";
  const query = {
    search: one(q, "search", 160) || undefined,
    status: choice(q, "status", projectStates),
    userId: one(q, "userId", 128) || undefined,
    cursor: cursor(q),
  };
  const inspect = one(q, "inspect", 128);
  const [r, detail] = await Promise.all([
    adminRead("projects", query),
    inspect ? adminRead("project", inspect) : null,
  ]);
  const d = detail?.ok ? detail.value : null;
  return (
    <>
      <Heading
        eyebrow="CUSTOMERS"
        title="Projects"
        description="Inspect project metadata and processing outcomes without exposing customer media."
      />
      {detail && (
        <div id="record-detail">
          <Panel
            title={d?.title ?? "Project details"}
            description="Operational metadata only. Customer video playback is not available here."
            extra={
              <Link href={listingHref(path, query)} className="ad-button">
                Close details
              </Link>
            }
          >
            {d ? (
              <DataList
                items={[
                  ["Project ID", d.id],
                  [
                    "Customer",
                    <RecordRef href={userPath(d.owner.id)} key="owner">
                      {d.owner.label}
                    </RecordRef>,
                  ],
                  ["Status", <Badge value={d.status} key="status" />],
                  ["Uploaded (UTC)", time(d.uploadedAt)],
                  ["Source duration", duration(d.sourceSeconds)],
                  ["Original filename", d.source?.filename],
                  ["Source size", d.source && bytesText(d.source.bytes)],
                  [
                    "Resolution",
                    d.source?.width && d.source.height
                      ? `${d.source.width} × ${d.source.height}`
                      : undefined,
                  ],
                  ["Clips", num(d.clipCount)],
                  [
                    "Processing job",
                    d.jobId && (
                      <RecordRef key="job" href={jobPath(d.jobId)}>
                        {d.jobId}
                      </RecordRef>
                    ),
                  ],
                ]}
              />
            ) : (
              !detail.ok && <Notice error={detail.error} />
            )}
          </Panel>
        </div>
      )}
      <Listing
        path={path}
        title="Project records"
        plural="Project records"
        result={r}
        columns={projects(
          (row) =>
            listingHref(path, { ...query, inspect: row.id }) + "#record-detail",
        )}
        query={query}
        fields={[
          {
            ...filter("search", "Search", query.search),
            placeholder: "Project name or ID",
          },
          filter(
            "status",
            "Project status",
            query.status,
            projectStates,
            "All projects",
          ),
          {
            ...filter("userId", "User ID", query.userId),
            placeholder: "Optional user ID",
          },
        ]}
      />
    </>
  );
}
