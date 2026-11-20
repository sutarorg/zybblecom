import Link from "next/link";
import { Coins, ListChecks, LockKeyhole, Minus, Plus } from "lucide-react";
import {
  Badge,
  DataList,
  Heading,
  Notice,
  Panel,
  RecordRef,
} from "@/components/admin/ui";
import { ActionDialog } from "@/components/admin/action-dialog";
import { ledger } from "@/components/admin/columns";
import { dates, filter, Listing } from "@/components/admin/listing";
import { adminRead } from "@/services/admin/server";
import {
  choice,
  cursor,
  dateRange,
  invalidDateRange,
  ledgerKinds,
  listingHref,
  one,
  userPath,
  type Query,
} from "@/services/admin/query";
import { num } from "@/services/admin/format";
import { FilterBar } from "@/components/admin/filters";
export const metadata = { title: "Credit management · Admin" };
export default async function Credits({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const q = await searchParams;
  const path = "/admin/credits";
  const lookup = one(q, "lookup", 160);
  const userId = one(q, "userId", 128) || undefined;
  const query = {
    userId,
    kind: choice(q, "kind", ledgerKinds),
    ...dateRange(q),
    cursor: cursor(q),
  };
  const [totals, records, matches, selected] = await Promise.all([
    adminRead("creditTotals"),
    invalidDateRange(q)
      ? ({ ok: false, error: "invalid" } as const)
      : adminRead("ledger", query),
    lookup ? adminRead("users", { search: lookup, order: "newest" }) : null,
    userId ? adminRead("user", userId) : null,
  ]);
  const credit = totals.ok ? totals.value : undefined;
  const user = selected?.ok ? selected.value : null;
  return (
    <>
      <Heading
        eyebrow="FINANCE"
        title="Credit management"
        description="Review credit liabilities, reservations, and immutable balance changes."
      />
      <div className="ad-metrics ad-credit-metrics">
        {(
          [
            ["Purchased", credit?.purchased],
            ["Consumed", credit?.consumed],
            ["Outstanding purchased", credit?.outstandingPurchased],
            ["Reserved", credit?.reserved],
            ["Adjusted", credit?.adjusted],
            ["Refunded", credit?.refunded],
          ] as const
        ).map(([title, value], i) => (
          <article className="ad-metric" key={title} data-accent={i}>
            <div>
              <span>
                <Coins size={17} aria-hidden="true" />
              </span>
            </div>
            <h3>{title}</h3>
            <strong>{num(value)}</strong>
            {!totals.ok && <small>Not available</small>}
          </article>
        ))}
      </div>
      {!totals.ok && totals.error !== "unavailable" && (
        <Notice error={totals.error} />
      )}
      <div className="ad-detail-grid">
        <Panel
          title="Customer lookup"
          description="Verify the account before preparing an adjustment."
          extra={<Coins size={20} aria-hidden="true" />}
        >
          <FilterBar
            key={lookup}
            path={path}
            fields={[
              {
                key: "lookup",
                label: "Find a customer",
                placeholder: "Name or email",
                value: lookup,
              },
            ]}
          />
          {matches &&
            (!matches.ok ? (
              <Notice
                error={matches.error}
                empty="Customer lookup not connected"
              />
            ) : matches.value.items.length ? (
              <ul className="ad-results">
                {matches.value.items.map((item) => (
                  <li key={item.id}>
                    <span>
                      <strong>{item.name ?? "Unnamed account"}</strong>
                      <small>{item.email}</small>
                    </span>
                    <Link
                      className="ad-button"
                      href={listingHref(path, { userId: item.id })}
                    >
                      Select
                    </Link>
                  </li>
                ))}
                {matches.value.nextCursor && (
                  <li>
                    <Link
                      className="ad-link"
                      href={listingHref("/admin/users", { search: lookup })}
                    >
                      See all matching users
                    </Link>
                  </li>
                )}
              </ul>
            ) : (
              <p>No customers matched that search.</p>
            ))}
          {selected &&
            (user ? (
              <DataList
                items={[
                  [
                    "Account",
                    <RecordRef key="user" href={userPath(user.id)}>
                      {user.name ?? user.email}
                    </RecordRef>,
                  ],
                  ["Balance", num(user.available)],
                  ["Status", <Badge key="status" value={user.status} />],
                ]}
              />
            ) : (
              !selected.ok && <Notice error={selected.error} />
            ))}
        </Panel>
        <Panel
          title="Manual adjustments"
          description="Append a new entry. Existing credit transactions cannot be edited."
          extra={<ListChecks size={20} aria-hidden="true" />}
        >
          {user?.actions.some(
            (a) => a === "add_credits" || a === "deduct_credits",
          ) ? (
            <div className="ad-inline">
              {user.actions.includes("add_credits") && (
                <ActionDialog
                  title="Add credits"
                  description="Review the verified before and after balances before confirming."
                  target={{ kind: "add_credits", id: user.id }}
                />
              )}
              {user.actions.includes("deduct_credits") && (
                <ActionDialog
                  title="Deduct credits"
                  description="Review the verified deduction and available balance before confirming."
                  target={{ kind: "deduct_credits", id: user.id }}
                />
              )}
            </div>
          ) : (
            <div className="ad-detail-note">
              <LockKeyhole size={17} aria-hidden="true" />
              <p>
                Adjustments require a verified customer, an authorized session,
                and a reason.
              </p>
            </div>
          )}
          <div className="ad-inline ad-adjustment-guide">
            <ActionDialog
              title="Credit adjustment safeguards"
              trigger="Review safeguards"
              description="Only a server-confirmed adjustment changes a balance."
            >
              <ul className="ad-check-list">
                <li>
                  <Plus size={15} aria-hidden="true" />
                  Addition requires an amount and a reason.
                </li>
                <li>
                  <Minus size={15} aria-hidden="true" />
                  Deduction requires a verified available balance.
                </li>
                <li>
                  <ListChecks size={15} aria-hidden="true" />
                  The ledger records the admin ID, customer ID, before and after
                  balances, amount, reason, and timestamp.
                </li>
              </ul>
            </ActionDialog>
          </div>
        </Panel>
      </div>
      <div className="ad-section-title">
        <h2>Credit ledger</h2>
        <span>Append-only</span>
      </div>
      <Listing
        path={path}
        title="Credit ledger"
        plural="Ledger entries"
        result={records}
        columns={ledger}
        query={query}
        fields={[
          {
            ...filter("userId", "Customer ID", query.userId),
            placeholder: "Optional customer ID",
          },
          filter(
            "kind",
            "Transaction type",
            query.kind,
            ledgerKinds,
            "All entries",
          ),
          ...dates(query.from, query.to),
        ]}
      />
    </>
  );
}
