import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { db } from "@/db";
import { courses, purchases, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { adminSetCourseStatus } from "@/lib/actions/admin";
import { formatINR } from "@/lib/money";
import { thumbnailStyle } from "@/lib/utils";
import { Badge, Card } from "@/components/ui";

export const metadata = { title: "Courses" };

export default async function AdminCoursesPage() {
  await requireAdmin();

  const rows = await db
    .select({
      course: courses,
      creatorName: users.name,
      sales: sql<number>`(select count(*) from ${purchases} where ${purchases.courseId} = ${courses.id} and ${purchases.status} = 'paid')::int`,
      gmv: sql<number>`coalesce((select sum(${purchases.grossPaise}) from ${purchases} where ${purchases.courseId} = ${courses.id} and ${purchases.status} = 'paid'),0)::int`,
    })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.creatorId))
    .orderBy(desc(courses.createdAt))
    .limit(200);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-display text-lg font-bold">All courses ({rows.length})</h2>
        <p className="text-xs text-ink-soft">Admins can unpublish courses that violate policy.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cream/50 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              <th className="px-5 py-3">Course</th>
              <th className="px-4 py-3">Creator</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Sales</th>
              <th className="px-4 py-3 text-right">GMV</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.course.id}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-12 shrink-0 rounded-lg" style={thumbnailStyle(r.course.thumbnail)} />
                    <div className="max-w-56">
                      <p className="truncate font-semibold">{r.course.title}</p>
                      <p className="truncate font-mono text-xs text-ink-soft">/c/{r.course.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">{r.creatorName}</td>
                <td className="px-4 py-3.5 text-right">{formatINR(r.course.pricePaise)}</td>
                <td className="px-4 py-3.5 text-right">{r.sales}</td>
                <td className="px-4 py-3.5 text-right font-medium">{formatINR(r.gmv)}</td>
                <td className="px-4 py-3.5">
                  <Badge tone={r.course.status === "published" ? "green" : "amber"}>{r.course.status}</Badge>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/c/${r.course.slug}`} className="grid size-8 place-items-center rounded-full border border-line text-ink-soft hover:text-ink" title="View">
                      <ExternalLink className="size-3.5" />
                    </Link>
                    <form action={adminSetCourseStatus.bind(null, r.course.id, r.course.status === "published" ? "draft" : "published")}>
                      <button className="text-xs font-semibold text-ink-soft underline-offset-2 hover:text-ink hover:underline">
                        {r.course.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
