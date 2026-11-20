import { Heading } from "@/components/admin/ui";
import { jobs } from "@/components/admin/columns";
import { filter, Listing } from "@/components/admin/listing";
import { adminRead } from "@/services/admin/server";
import {
  choice,
  cursor,
  jobFilters,
  one,
  type Query,
} from "@/services/admin/query";
export const metadata = { title: "Processing jobs · Admin" };
export default async function Jobs({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const q = await searchParams;
  const query = {
    search: one(q, "search", 160) || undefined,
    filter: choice(q, "filter", jobFilters),
    cursor: cursor(q),
  };
  const result = await adminRead("jobs", query);
  return (
    <>
      <Heading
        eyebrow="OPERATIONS"
        title="Processing jobs"
        description="Track generation, ClipSDK stages, credit settlement, and delivery of finished assets."
      />
      <Listing
        path="/admin/jobs"
        title="Generation job records"
        plural="Job records"
        result={result}
        columns={jobs}
        query={query}
        fields={[
          {
            ...filter("search", "Search", query.search),
            placeholder: "Internal or ClipSDK job ID",
          },
          filter("filter", "Job state", query.filter, jobFilters, "All jobs"),
        ]}
      />
    </>
  );
}
