import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import {
  Badge,
  DataList,
  Heading,
  Notice,
  Panel,
  RecordRef,
} from "@/components/admin/ui";
import { hooks } from "@/components/admin/columns";
import { filter, Listing } from "@/components/admin/listing";
import { ActionDialog } from "@/components/admin/action-dialog";
import { adminRead } from "@/services/admin/server";
import {
  choice,
  cursor,
  hookSignatures,
  hookSources,
  hookStates,
  jobPath,
  listingHref,
  one,
  type Query,
} from "@/services/admin/query";
import { label, num, time } from "@/services/admin/format";
export const metadata = { title: "Webhooks · Admin" };
export default async function Webhooks({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const q = await searchParams;
  const path = "/admin/webhooks";
  const query = {
    source: choice(q, "source", hookSources),
    signature: choice(q, "signature", hookSignatures),
    status: choice(q, "status", hookStates),
    jobId: one(q, "jobId", 128) || undefined,
    cursor: cursor(q),
  };
  const inspect = one(q, "inspect", 128);
  const [r, detail] = await Promise.all([
    adminRead("webhooks", query),
    inspect ? adminRead("webhook", inspect) : null,
  ]);
  const d = detail?.ok ? detail.value : null;
  return (
    <>
      <Heading
        eyebrow="OPERATIONS"
        title="Webhooks"
        description="Inspect ClipSDK and Dodo Payments deliveries, verification, and reconciliation."
        action={
          <span className="ad-environment">
            <ShieldCheck size={15} aria-hidden="true" />
            Sanitized details
          </span>
        }
      />
      {detail && (
        <div id="record-detail">
          <Panel
            title="Event details"
            description="Only allowlisted delivery metadata is shown. Raw payloads and secrets stay server-side."
            extra={
              <Link href={listingHref(path, query)} className="ad-button">
                Close details
              </Link>
            }
          >
            {d ? (
              <>
                <DataList
                  items={[
                    ["Event ID", d.id],
                    ["Provider", label(d.source)],
                    ["Type", d.type],
                    ["Received (UTC)", time(d.receivedAt)],
                    [
                      "Signature",
                      <Badge value={d.signature} key="signature" />,
                    ],
                    ["Processing", <Badge value={d.status} key="status" />],
                    [
                      "Related record",
                      d.related && (
                        <RecordRef
                          key="related"
                          href={
                            d.related.kind === "job"
                              ? jobPath(d.related.id)
                              : listingHref("/admin/payments", {
                                  inspect: d.related.id,
                                }) + "#record-detail"
                          }
                        >
                          {d.related.id}
                        </RecordRef>
                      ),
                    ],
                    ["Delivery attempt", num(d.delivery?.attempt)],
                    ["Provider status", d.delivery?.providerStatus],
                    ["Provider code", d.delivery?.code],
                    ["Output count", num(d.delivery?.outputCount)],
                    ["Error summary", d.errorSummary],
                  ]}
                />
                {d.canRetry &&
                  d.signature === "verified" &&
                  ["failed", "pending_reconciliation"].includes(d.status) && (
                    <ActionDialog
                      title="Retry verified delivery"
                      description="Reconcile this existing event without reissuing a payment or starting a new job."
                      target={{ kind: "retry_webhook", id: d.id }}
                    />
                  )}
              </>
            ) : (
              !detail.ok && <Notice error={detail.error} />
            )}
          </Panel>
        </div>
      )}
      <Listing
        path={path}
        title="Webhook delivery records"
        plural="Webhook deliveries"
        result={r}
        columns={hooks(
          (row) =>
            listingHref(path, { ...query, inspect: row.id }) + "#record-detail",
        )}
        query={query}
        fields={[
          filter("source", "Source", query.source, hookSources, "All sources"),
          filter(
            "signature",
            "Signature",
            query.signature,
            hookSignatures,
            "All signatures",
          ),
          filter(
            "status",
            "Processing status",
            query.status,
            hookStates,
            "All statuses",
          ),
          {
            ...filter("jobId", "Related job ID", query.jobId),
            placeholder: "Optional job ID",
          },
        ]}
      />
    </>
  );
}
