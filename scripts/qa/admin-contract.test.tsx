import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createAdminReadGuard } from "../../src/services/admin/access";
import {
  adminService,
  canConfirm,
  validAmount,
  validReason,
} from "../../src/services/admin/service";
import type {
  AdminCommands,
  AdminIntent,
  AdminReads,
  AdminSession,
  PreparedAction,
  Result,
} from "../../src/services/admin/contracts";
import { Badge, Notice, Records } from "../../src/components/admin/ui";
import {
  country,
  date,
  choice,
  paymentStates,
} from "../../src/services/admin/query";
import { money } from "../../src/services/admin/format";

test("admin reads do not reach the adapter without verified permission", async () => {
  let called = 0;
  const fixturelessAdapter = adminService<AdminReads>({
    users: async () => {
      called++;
      return { ok: true, value: { items: [], nextCursor: null } };
    },
  });
  for (const error of [
    "unavailable",
    "unauthenticated",
    "expired",
    "forbidden",
  ] as const) {
    const session = async (): Promise<Result<AdminSession>> => ({
      ok: false,
      error,
    });
    assert.deepEqual(
      await createAdminReadGuard(fixturelessAdapter, session)("users", {
        order: "newest",
      }),
      { ok: false, error },
    );
  }
  const session =
    (permissions: AdminSession["permissions"]) =>
    async (): Promise<Result<AdminSession>> => ({
      ok: true,
      value: {
        id: "test-principal",
        name: "Test principal",
        roleLabel: "Test role",
        permissions,
      },
    });
  assert.deepEqual(
    await createAdminReadGuard(fixturelessAdapter, session(["overview"]))(
      "users",
      { order: "newest" },
    ),
    { ok: false, error: "forbidden" },
  );
  assert.equal(called, 0);
  assert.equal(
    (
      await createAdminReadGuard(fixturelessAdapter, session(["users"]))(
        "users",
        { order: "newest" },
      )
    ).ok,
    true,
  );
  assert.equal(called, 1);
});
test("command adapter fails closed and sanitizes thrown details", async () => {
  const commands = adminService<AdminCommands>();
  assert.deepEqual(
    await commands("prepare", {
      intent: { kind: "reconcile", id: "reference" },
      reason: "Check current state",
    }),
    { ok: false, error: "unavailable" },
  );
  assert.deepEqual(
    await commands("execute", {
      preparedId: "confirmation",
      requestKey: "idempotency",
    }),
    { ok: false, error: "unavailable" },
  );
  assert.deepEqual(
    await adminService<AdminCommands>({
      logout: async () => {
        throw Error("private internals");
      },
    })("logout"),
    { ok: false, error: "network" },
  );
});
test("adjustments and reprocessing fail closed without recent, complete server consequences", () => {
  const now = Date.parse("2026-11-20T12:00:00Z");
  const intent: AdminIntent = {
    kind: "deduct_credits",
    id: "reference",
    amount: 4,
  };
  const p: PreparedAction = {
    id: "quote",
    expiresAt: "2026-11-20T12:01:00Z",
    targetLabel: "Protected target",
    summary: "Operational summary",
    balance: { previous: 10, delta: -4, next: 6 },
  };
  assert(canConfirm(intent, p, now));
  assert(
    !canConfirm(
      intent,
      { ...p, balance: { previous: 10, delta: -4, next: 14 } },
      now,
    ),
  );
  assert(!canConfirm(intent, { ...p, expiresAt: "invalid" }, now));
  assert(!canConfirm(intent, p, now + 60000));
  const retry: AdminIntent = { kind: "reprocess", id: "reference" };
  assert(!canConfirm(retry, p, now));
  assert(
    canConfirm(
      retry,
      {
        ...p,
        reprocessing: {
          creditImpact: "Verified impact",
          providerCost: { amountMinor: 1, minorUnit: 2, currency: "USD" },
        },
      },
      now,
    ),
  );
  assert(validReason("  Operational reason  "));
  assert(!validReason("  short "));
  assert(!validAmount(1.1));
});
test("filters are allowlisted and financial amounts are displayed per currency", () => {
  assert.equal(date({ from: "2026-02-30" }, "from"), undefined);
  assert.equal(date({ from: "2026-02-28" }, "from"), "2026-02-28");
  assert.equal(country({ country: "in" }), "IN");
  assert.equal(
    choice({ status: "fabricated" }, "status", paymentStates),
    undefined,
  );
  assert.match(
    money({ amountMinor: 123, minorUnit: 0, currency: "JPY" }),
    /JPY.*123/,
  );
  assert.match(
    money({ amountMinor: 123, minorUnit: 2, currency: "USD" }),
    /USD.*1\.23/,
  );
});
test("read-only states distinguish true empty, unavailable, expired, and denied; badges retain text", () => {
  const empty = renderToStaticMarkup(
    <Records
      title="Credit ledger"
      result={{ ok: true, value: { items: [], nextCursor: null } }}
      columns={[{ name: "Reference", render: (r: { id: string }) => r.id }]}
      record="Ledger"
      plural="Ledger entries"
    />,
  );
  assert.match(empty, /No ledger entries yet/);
  assert.match(empty, /scope="col"/);
  assert.match(
    renderToStaticMarkup(<Notice error="unavailable" />),
    /Data connection required/,
  );
  assert.match(
    renderToStaticMarkup(<Notice error="expired" />),
    /Session expired/,
  );
  assert.match(
    renderToStaticMarkup(<Notice error="forbidden" />),
    /Permission denied/,
  );
  assert.match(
    renderToStaticMarkup(<Badge value="invalid" />),
    /data-tone="bad"[^>]*>.*Invalid signature/,
  );
});
