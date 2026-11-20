import { UserRound, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
  Badge,
  DataList,
  Heading,
  Notice,
  Pager,
  Panel,
  Records,
  State,
} from "@/components/admin/ui";
import { ActionDialog } from "@/components/admin/action-dialog";
import { ledger, payments, projects } from "@/components/admin/columns";
import { adminRead } from "@/services/admin/server";
import {
  cursor,
  listingHref,
  userPath,
  type Query,
} from "@/services/admin/query";
import { label, num, time } from "@/services/admin/format";
import type { UserOperation } from "@/services/admin/contracts";
export const metadata = { title: "User details · Admin" };
const descriptions: Record<UserOperation, string> = {
  add_credits: "Record a credit addition as a new ledger entry.",
  deduct_credits:
    "Verify this deduction against available credits before continuing.",
  suspend:
    "Confirm the account and the operational reason for restricting access.",
  reactivate: "Confirm the account and why access should be restored.",
  internal_note:
    "The note is visible to authorized administrators only. Do not enter passwords, payment credentials, or private media links.",
};
export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Query>;
}) {
  const { userId } = await params;
  const q = await searchParams;
  const path = userPath(userId);
  const u = await adminRead("user", userId);
  if (!u.ok)
    return (
      <>
        <Heading
          eyebrow="CUSTOMERS"
          title="User details"
          description="Review a verified customer profile, projects, purchases, and credit history."
          action={
            <Link href="/admin/users" className="ad-button">
              Back to users
            </Link>
          }
        />
        <Panel
          title="Customer record"
          extra={<UserRound size={21} aria-hidden="true" />}
        >
          <Notice error={u.error} empty="Customer record not connected" />
        </Panel>
      </>
    );
  const user = u.value;
  const state = {
    projectCursor: cursor(q, "projectCursor"),
    ledgerCursor: cursor(q, "ledgerCursor"),
    paymentCursor: cursor(q, "paymentCursor"),
  };
  const [p, l, b] = await Promise.all([
    adminRead("projects", { userId, cursor: state.projectCursor }),
    adminRead("ledger", { userId, cursor: state.ledgerCursor }),
    adminRead("payments", { userId, cursor: state.paymentCursor }),
  ]);
  return (
    <>
      <Heading
        eyebrow="CUSTOMERS"
        title={user.name ?? "User details"}
        description={`Registered ${time(user.createdAt)} UTC`}
        action={
          <Link href="/admin/users" className="ad-button">
            Back to users
          </Link>
        }
      />
      <div className="ad-detail-grid">
        <Panel title="Profile">
          <DataList
            items={[
              ["User ID", user.id],
              ["Name", user.name],
              ["Email", user.email],
              ["Registered (UTC)", time(user.createdAt)],
              ["Country", user.country],
              ["Account status", <Badge key="status" value={user.status} />],
            ]}
          />
        </Panel>
        <Panel title="Financial information">
          <DataList
            items={[
              ["Available credits", num(user.available)],
              ["Credit purchases", num(user.purchases)],
              ["Total credits purchased", num(user.credits?.purchased)],
              ["Credits consumed", num(user.credits?.consumed)],
              ["Credits reserved", num(user.credits?.reserved)],
            ]}
          />
        </Panel>
      </div>
      <div className="ad-detail-grid">
        <Panel
          title="Administrative actions"
          description="Each operation requires a reason and a separate confirmation."
          extra={<ShieldCheck size={19} aria-hidden="true" />}
        >
          {user.actions.length ? (
            <div className="ad-inline">
              {user.actions.map((kind) => (
                <ActionDialog
                  key={kind}
                  title={label(kind)}
                  description={descriptions[kind]}
                  target={{ kind, id: user.id }}
                />
              ))}
            </div>
          ) : (
            <p>No administrative actions are available for this account.</p>
          )}
        </Panel>
        {user.notes && (
          <Panel title="Internal notes">
            {user.notes.length ? (
              <ul className="ad-results">
                {user.notes.map((n) => (
                  <li key={n.id}>
                    <span>
                      <strong>
                        {n.author} · {time(n.time)} UTC
                      </strong>
                      <p>{n.text}</p>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <State
                title="No notes yet"
                text="Confirmed internal notes will appear here."
              />
            )}
          </Panel>
        )}
      </div>
      <div className="ad-section-title">
        <h2>Projects</h2>
      </div>
      <Records
        title="Customer projects"
        plural="Projects"
        record="Projects"
        result={p}
        columns={projects(
          (r) =>
            listingHref("/admin/projects", { inspect: r.id, userId }) +
            "#record-detail",
        )}
        pager={
          p.ok && (
            <Pager
              path={path}
              params={state}
              page={p.value}
              cursorKey="projectCursor"
            />
          )
        }
      />
      <div className="ad-section-title">
        <h2>Purchases and refunds</h2>
      </div>
      <Records
        title="Customer payments"
        plural="Payments"
        record="Payments"
        result={b}
        columns={payments(
          (r) =>
            listingHref("/admin/payments", { inspect: r.id, userId }) +
            "#record-detail",
        )}
        pager={
          b.ok && (
            <Pager
              path={path}
              params={state}
              page={b.value}
              cursorKey="paymentCursor"
            />
          )
        }
      />
      <div className="ad-section-title">
        <h2>Credit transactions</h2>
      </div>
      <Records
        title="Customer credit ledger"
        plural="Ledger entries"
        record="Ledger"
        result={l}
        columns={ledger}
        pager={
          l.ok && (
            <Pager
              path={path}
              params={state}
              page={l.value}
              cursorKey="ledgerCursor"
            />
          )
        }
      />
    </>
  );
}
