import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { courses, purchases, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { initials } from "@/lib/utils";
import { Badge, Card } from "@/components/ui";

export const metadata = { title: "Users" };

export default async function AdminUsersPage() {
  await requireAdmin();

  const rows = await db
    .select({
      user: users,
      courseCount: sql<number>`(select count(*) from ${courses} where ${courses.creatorId} = ${users.id})::int`,
      buys: sql<number>`(select count(*) from ${purchases} where ${purchases.buyerId} = ${users.id} and ${purchases.status} = 'paid')::int`,
      earned: sql<number>`coalesce((select sum(${purchases.creatorPaise}) from ${purchases} where ${purchases.creatorId} = ${users.id} and ${purchases.status} = 'paid'),0)::int`,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(200);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-display text-lg font-bold">All users ({rows.length})</h2>
        <p className="text-xs text-ink-soft">Every user can buy and instantly become a creator.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cream/50 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              <th className="px-5 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-right">Courses</th>
              <th className="px-4 py-3 text-right">Purchases</th>
              <th className="px-4 py-3 text-right">Creator earnings</th>
              <th className="px-5 py-3 text-right">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.user.id}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink font-display text-[10px] font-bold text-paper">
                      {initials(r.user.name)}
                    </span>
                    <div>
                      <p className="font-semibold">{r.user.name}</p>
                      <p className="text-xs text-ink-soft">{r.user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  {r.user.isAdmin ? <Badge tone="brand">Admin</Badge> : <Badge tone="neutral">User</Badge>}
                </td>
                <td className="px-4 py-3.5 text-right">{r.courseCount}</td>
                <td className="px-4 py-3.5 text-right">{r.buys}</td>
                <td className="px-4 py-3.5 text-right font-medium text-emerald-600">{formatINR(r.earned)}</td>
                <td className="px-5 py-3.5 text-right text-xs text-ink-soft">
                  {r.user.createdAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
