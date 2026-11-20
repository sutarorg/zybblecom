import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { Action } from "@/components/ui/primitives";
import {
  WorkspaceEmpty,
  WorkspaceHeading,
  WorkspaceIssue,
} from "@/components/workspace/ui";
import { creditPacks } from "@/config/credit-packs";
import { workspace } from "@/services/workspace-server";
import { creditsText, dateText } from "@/services/workspace-format";
import { listingHref, one, type Query } from "@/services/workspace-query";
export const metadata = { title: "Credit history" };
const kindLabel = {
  reserved: "Reservation",
  consumed: "Usage",
  released: "Release",
  refund: "Refund",
  adjustment: "Adjustment",
};
export default async function History({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const q = await searchParams;
  const raw = one(q, "filter");
  const filter = raw === "purchases" || raw === "usage" ? raw : "all";
  const cursor = one(q, "cursor", 2048) || undefined;
  const result = await workspace.run("listLedger", { filter, cursor });
  return (
    <>
      <WorkspaceHeading
        label="BILLING"
        title="Credit history"
        description="Track your one-time purchases and changes to your credit balance."
        action={
          <Action href="/credits#credit-packs" variant="secondary">
            View credit packs
          </Action>
        }
      />
      <section className="ws-panel ws-library">
        <nav className="ws-tabs" aria-label="Filter credit history">
          {(
            [
              ["all", "All activity"],
              ["purchases", "Purchases"],
              ["usage", "Credit activity"],
            ] as const
          ).map(([id, label]) => (
            <Link
              key={id}
              href={listingHref("/credits/history", {
                filter: id === "all" ? undefined : id,
              })}
              aria-current={id === filter ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <WorkspaceIssue result={result} />
        {result.ok && result.value.items.length ? (
          <>
            <ul className="ws-ledger">
              {result.value.items.map((item) => {
                const purchase = item.kind === "purchase" ? item : null;
                return (
                  <li key={item.id}>
                    <div>
                      <h3>
                        {item.kind === "purchase"
                          ? (creditPacks.find((pack) => pack.id === item.packId)
                              ?.name ?? "Credit pack")
                          : kindLabel[item.kind]}
                      </h3>
                      <p>
                        {dateText(item.createdAt)}
                        {item.reference && (
                          <>
                            {" "}
                            · Ref. <span>{item.reference}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div>
                      <strong>
                        {purchase
                          ? `${new Intl.NumberFormat("en", { style: "currency", currency: purchase.currency }).format(purchase.amountMinor / 100)} ${purchase.currency}`
                          : item.kind !== "purchase"
                            ? `${item.creditDelta > 0 ? "+" : ""}${creditsText(item.creditDelta)} credits`
                            : null}
                      </strong>
                      {purchase && (
                        <p>
                          {purchase.paymentState}
                          {purchase.grantedCredits !== undefined
                            ? ` · ${creditsText(purchase.grantedCredits)} credits granted`
                            : ""}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {result.value.nextCursor && (
              <Action
                href={listingHref("/credits/history", {
                  filter,
                  cursor: result.value.nextCursor,
                })}
                variant="secondary"
              >
                Next page
              </Action>
            )}
          </>
        ) : (
          <WorkspaceEmpty
            className="ws-library-empty"
            icon={ReceiptText}
            title={
              result.ok
                ? "No activity here yet"
                : "Credit history isn’t available yet"
            }
            text={
              result.ok
                ? "Verified transactions will appear in this history."
                : "Purchases and credit activity will appear here once billing is connected."
            }
            action={
              <Action href="/credits" variant="secondary">
                Back to credits
              </Action>
            }
          />
        )}
      </section>
    </>
  );
}
