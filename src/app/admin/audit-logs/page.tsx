import { LockKeyhole } from "lucide-react";
import { Heading } from "@/components/admin/ui";
import { audit } from "@/components/admin/columns";
import { dates, filter, Listing } from "@/components/admin/listing";
import { adminRead } from "@/services/admin/server";
import {
  auditCategories,
  choice,
  cursor,
  dateRange,
  invalidDateRange,
  one,
  type Query,
} from "@/services/admin/query";
export const metadata = { title: "Audit logs · Admin" };
export default async function Audit({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const q = await searchParams;
  const query = {
    admin: one(q, "admin", 128) || undefined,
    category: choice(q, "category", auditCategories),
    record: one(q, "record", 128) || undefined,
    ...dateRange(q),
    cursor: cursor(q),
  };
  const r = (await invalidDateRange(q))
    ? ({ ok: false, error: "invalid" } as const)
    : await adminRead("audit", query);
  return (
    <>
      <Heading
        eyebrow="SYSTEM"
        title="Audit logs"
        description="A read-only history of administrative actions, reasons, and outcomes."
        action={
          <span className="ad-environment">
            <LockKeyhole size={15} aria-hidden="true" />
            Read-only
          </span>
        }
      />
      <Listing
        path="/admin/audit-logs"
        title="Audit entries"
        plural="Audit records"
        result={r}
        columns={audit}
        query={query}
        fields={[
          {
            ...filter("admin", "Administrator", query.admin),
            placeholder: "Admin ID or account",
          },
          filter(
            "category",
            "Action category",
            query.category,
            auditCategories,
            "All categories",
          ),
          {
            ...filter("record", "Affected record ID", query.record),
            placeholder: "Record reference",
          },
          ...dates(query.from, query.to),
        ]}
      />
    </>
  );
}
