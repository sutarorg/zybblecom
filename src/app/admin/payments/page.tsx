import Link from "next/link";
import {
  Badge,
  DataList,
  Heading,
  Notice,
  Panel,
  RecordRef,
} from "@/components/admin/ui";
import { payments } from "@/components/admin/columns";
import { dates, filter, Listing } from "@/components/admin/listing";
import { adminRead } from "@/services/admin/server";
import {
  choice,
  cursor,
  dateRange,
  invalidDateRange,
  listingHref,
  one,
  paymentStates,
  userPath,
  type Query,
} from "@/services/admin/query";
import { label, money, num, time } from "@/services/admin/format";
export const metadata = { title: "Payments · Admin" };
export default async function Payments({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const q = await searchParams;
  const path = "/admin/payments";
  const query = {
    search: one(q, "search", 160) || undefined,
    status: choice(q, "status", paymentStates),
    userId: one(q, "userId", 128) || undefined,
    ...dateRange(q),
    cursor: cursor(q),
  };
  const inspect = one(q, "inspect", 128);
  const [r, detail] = await Promise.all([
    invalidDateRange(q)
      ? ({ ok: false, error: "invalid" } as const)
      : adminRead("payments", query),
    inspect ? adminRead("payment", inspect) : null,
  ]);
  const d = detail?.ok ? detail.value : null;
  return (
    <>
      <Heading
        eyebrow="FINANCE"
        title="Payments"
        description="Review synchronized Dodo Payments transactions and their credit fulfillment status."
      />
      {detail && (
        <div id="record-detail">
          <Panel
            title="Payment details"
            description="Verified financial metadata. No card details or payment credentials."
            extra={
              <Link href={listingHref(path, query)} className="ad-button">
                Close details
              </Link>
            }
          >
            {d ? (
              <DataList
                items={[
                  ["Transaction ID", d.id],
                  ["Provider payment ID", d.dodoId],
                  [
                    "Customer",
                    <RecordRef href={userPath(d.customer.id)} key="user">
                      {d.customer.label}
                    </RecordRef>,
                  ],
                  ["Pack", d.pack],
                  ["Purchase amount", money(d.money)],
                  ["Purchased (UTC)", time(d.purchasedAt)],
                  ["Status", <Badge value={d.status} key="status" />],
                  [
                    "Credit fulfillment",
                    <Badge value={d.fulfillment} key="fulfillment" />,
                  ],
                  ["Credits granted", num(d.creditsGranted)],
                  ["Refunded amount", money(d.refundedAmount)],
                  ["Refund status", d.refundStatus && label(d.refundStatus)],
                  ["Dispute status", d.disputeStatus],
                  ["Last verified update", time(d.updatedAt)],
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
        title="Payment records"
        plural="Payment records"
        result={r}
        columns={payments(
          (row) =>
            listingHref(path, { ...query, inspect: row.id }) + "#record-detail",
        )}
        query={query}
        fields={[
          {
            ...filter("search", "Search", query.search),
            placeholder: "Payment ID or customer email",
          },
          filter(
            "status",
            "Payment status",
            query.status,
            paymentStates,
            "All statuses",
          ),
          {
            ...filter("userId", "User ID", query.userId),
            placeholder: "Optional user ID",
          },
          ...dates(query.from, query.to),
        ]}
      />
    </>
  );
}
