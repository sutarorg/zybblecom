import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  chapters,
  coupons,
  courses,
  enrollments,
  lessonProgress,
  lessons,
  orders,
  settlements,
  users,
  type Chapter,
  type Course,
  type Coupon,
  type Enrollment,
  type Lesson,
  type Order,
  type Settlement,
  type User,
} from "@/db/schema";
import { COMMISSION_RATE } from "./utils";

const num = (v: unknown) => Number(v ?? 0);

export type CourseWithCurriculum = Course & {
  chapters: (Chapter & { lessons: Lesson[] })[];
};

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const [row] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  return row ?? null;
}

export async function getCurriculum(courseId: string) {
  const chs = await db
    .select()
    .from(chapters)
    .where(eq(chapters.courseId, courseId))
    .orderBy(asc(chapters.position), asc(chapters.createdAt));
  if (chs.length === 0) return [] as (Chapter & { lessons: Lesson[] })[];
  const lss = await db
    .select()
    .from(lessons)
    .where(inArray(lessons.chapterId, chs.map((c) => c.id)))
    .orderBy(asc(lessons.position), asc(lessons.createdAt));
  return chs.map((ch) => ({
    ...ch,
    lessons: lss.filter((l) => l.chapterId === ch.id),
  }));
}

export async function getEnrollment(
  courseId: string,
  studentId: string,
): Promise<Enrollment | null> {
  const [row] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.studentId, studentId)))
    .limit(1);
  return row ?? null;
}

export async function getCompletedLessonIds(courseId: string, studentId: string) {
  const rows = await db
    .select({ lessonId: lessonProgress.lessonId })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.courseId, courseId),
        eq(lessonProgress.studentId, studentId),
      ),
    );
  return rows.map((r) => r.lessonId);
}

export type PriceResult =
  | { ok: true; gross: number; discount: number; net: number; coupon: Coupon | null }
  | { ok: false; error: string };

export async function computeCoursePrice(
  course: Course,
  couponCode?: string | null,
): Promise<PriceResult> {
  const gross = course.pricePaise;
  if (!couponCode || !couponCode.trim()) {
    return { ok: true, gross, discount: 0, net: gross, coupon: null };
  }
  const code = couponCode.trim().toUpperCase();
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.courseId, course.id), eq(coupons.code, code)))
    .limit(1);
  if (!coupon) return { ok: false, error: "That coupon code doesn't exist." };
  if (!coupon.active) return { ok: false, error: "This coupon is no longer active." };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now())
    return { ok: false, error: "This coupon has expired." };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
    return { ok: false, error: "This coupon has been fully redeemed." };
  const discount =
    coupon.type === "percent"
      ? Math.floor((gross * coupon.value) / 100)
      : Math.min(coupon.value, gross);
  return { ok: true, gross, discount, net: Math.max(0, gross - discount), coupon };
}

export async function grantEnrollment(
  courseId: string,
  studentId: string,
  orderId: string,
) {
  await db
    .insert(enrollments)
    .values({ courseId, studentId, orderId })
    .onConflictDoNothing({ target: [enrollments.courseId, enrollments.studentId] });
}

export async function creatorEarningSplit(netPaise: number) {
  const fee = Math.round(netPaise * COMMISSION_RATE);
  return { fee, earning: netPaise - fee };
}

/* ---------------------------------- creator --------------------------------- */

export type CreatorCourseRow = Course & {
  students: number;
  revenue: number;
  lessons: number;
};

export async function getCreatorCourses(creatorId: string): Promise<CreatorCourseRow[]> {
  const courseRows = await db
    .select()
    .from(courses)
    .where(eq(courses.creatorId, creatorId))
    .orderBy(desc(courses.createdAt));
  if (courseRows.length === 0) return [];
  const ids = courseRows.map((c) => c.id);

  const revenue = await db
    .select({
      courseId: orders.courseId,
      revenue: sql<number>`coalesce(sum(${orders.creatorEarningPaise}), 0)::int`,
    })
    .from(orders)
    .where(and(inArray(orders.courseId, ids), eq(orders.status, "paid")))
    .groupBy(orders.courseId);

  const students = await db
    .select({
      courseId: enrollments.courseId,
      count: sql<number>`count(*)::int`,
    })
    .from(enrollments)
    .where(inArray(enrollments.courseId, ids))
    .groupBy(enrollments.courseId);

  const lessonCounts = await db
    .select({
      courseId: chapters.courseId,
      count: sql<number>`count(${lessons.id})::int`,
    })
    .from(chapters)
    .leftJoin(lessons, eq(lessons.chapterId, chapters.id))
    .where(inArray(chapters.courseId, ids))
    .groupBy(chapters.courseId);

  const revBy = new Map(revenue.map((r) => [r.courseId, num(r.revenue)]));
  const stuBy = new Map(students.map((r) => [r.courseId, num(r.count)]));
  const lesBy = new Map(lessonCounts.map((r) => [r.courseId, num(r.count)]));

  return courseRows.map((c) => ({
    ...c,
    revenue: revBy.get(c.id) ?? 0,
    students: stuBy.get(c.id) ?? 0,
    lessons: lesBy.get(c.id) ?? 0,
  }));
}

export async function getCreatorOverview(creatorId: string) {
  const [totals] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${orders.netPaise}), 0)::bigint`,
      earning: sql<number>`coalesce(sum(${orders.creatorEarningPaise}), 0)::bigint`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .innerJoin(courses, eq(orders.courseId, courses.id))
    .where(and(eq(courses.creatorId, creatorId), eq(orders.status, "paid")));

  const [stu] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(courses.creatorId, creatorId));

  const [published] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(courses)
    .where(and(eq(courses.creatorId, creatorId), eq(courses.status, "published")));

  // completion: completed lesson rows / (enrollments * lessons per course)
  const [completion] = await db
    .select({
      done: sql<number>`(
        select count(*) from ${lessonProgress} lp
        inner join ${courses} c2 on c2.id = lp.course_id
        where c2.creator_id = ${creatorId}
      )::int`,
      total: sql<number>`(
        select coalesce(sum(cnt), 0) from (
          select count(l2.id) as cnt from ${enrollments} e
          inner join ${chapters} ch on ch.course_id = e.course_id
          left join ${lessons} l2 on l2.chapter_id = ch.id
          inner join ${courses} c3 on c3.id = e.course_id
          where c3.creator_id = ${creatorId}
          group by e.id
        ) t
      )::bigint`,
    })
    .from(courses)
    .where(eq(courses.creatorId, creatorId))
    .limit(1);

  return {
    revenue: num(totals?.revenue),
    earning: num(totals?.earning),
    orders: num(totals?.count),
    students: num(stu?.count),
    publishedCourses: num(published?.count),
    avgCompletion:
      num(completion?.total) > 0
        ? Math.round((num(completion?.done) / num(completion?.total)) * 100)
        : 0,
  };
}

export async function getRevenueSeries(creatorId: string, days = 30) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
      total: sql<number>`coalesce(sum(${orders.netPaise}), 0)::int`,
    })
    .from(orders)
    .innerJoin(courses, eq(orders.courseId, courses.id))
    .where(
      and(
        eq(courses.creatorId, creatorId),
        eq(orders.status, "paid"),
        gte(orders.createdAt, since),
      ),
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const byDay = new Map(rows.map((r) => [r.day, num(r.total)]));
  const series: { day: string; label: string; total: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    // to_char uses DB timezone; align using local date formatting
    const keyLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    series.push({
      day: keyLocal,
      label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      total: byDay.get(key) ?? byDay.get(keyLocal) ?? 0,
    });
  }
  return series;
}

export type OrderRow = Order & {
  courseTitle: string;
  courseSlug: string;
  buyerName: string;
  buyerEmail: string;
};

export async function getCreatorOrders(creatorId: string, limitTo?: number): Promise<OrderRow[]> {
  const q = db
    .select({
      order: orders,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      buyerName: users.name,
      buyerEmail: users.email,
    })
    .from(orders)
    .innerJoin(courses, eq(orders.courseId, courses.id))
    .innerJoin(users, eq(users.id, orders.buyerId))
    .where(eq(courses.creatorId, creatorId))
    .orderBy(desc(orders.createdAt));
  const rows = await (limitTo ? q.limit(limitTo) : q);
  return rows.map((r) => ({
    ...r.order,
    courseTitle: r.courseTitle,
    courseSlug: r.courseSlug,
    buyerName: r.buyerName,
    buyerEmail: r.buyerEmail,
  }));
}

export async function getCreatorEarnings(creatorId: string) {
  const [earn] = await db
    .select({
      gross: sql<number>`coalesce(sum(${orders.netPaise}), 0)::bigint`,
      fee: sql<number>`coalesce(sum(${orders.platformFeePaise}), 0)::bigint`,
      earning: sql<number>`coalesce(sum(${orders.creatorEarningPaise}), 0)::bigint`,
      unsettled: sql<number>`coalesce(sum(case when ${orders.settlementId} is null then ${orders.creatorEarningPaise} else 0 end), 0)::bigint`,
    })
    .from(orders)
    .innerJoin(courses, eq(orders.courseId, courses.id))
    .where(and(eq(courses.creatorId, creatorId), eq(orders.status, "paid")));

  const payoutRows = await db
    .select()
    .from(settlements)
    .where(eq(settlements.creatorId, creatorId))
    .orderBy(desc(settlements.createdAt));

  return {
    gross: num(earn?.gross),
    fees: num(earn?.fee),
    earned: num(earn?.earning),
    unsettled: num(earn?.unsettled),
    settled: Math.max(0, num(earn?.earning) - num(earn?.unsettled)),
    settlements: payoutRows,
  };
}

export async function getCourseStatsForBuilder(courseId: string) {
  const [rev] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${orders.creatorEarningPaise}), 0)::bigint`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(eq(orders.courseId, courseId), eq(orders.status, "paid")));
  const [stu] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId));
  return {
    revenue: num(rev?.revenue),
    orders: num(rev?.count),
    students: num(stu?.count),
  };
}

export async function getCouponsForCourse(courseId: string): Promise<Coupon[]> {
  return db
    .select()
    .from(coupons)
    .where(eq(coupons.courseId, courseId))
    .orderBy(desc(coupons.createdAt));
}

/* ---------------------------------- student --------------------------------- */

export type StudentCourse = {
  enrollment: Enrollment;
  course: Course;
  creatorName: string;
  totalLessons: number;
  doneLessons: number;
};

export async function getStudentCourses(studentId: string): Promise<StudentCourse[]> {
  const rows = await db
    .select({
      enrollment: enrollments,
      course: courses,
      creatorName: users.name,
    })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(users, eq(users.id, courses.creatorId))
    .where(eq(enrollments.studentId, studentId))
    .orderBy(desc(enrollments.createdAt));

  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.course.id);

  const totals = await db
    .select({ courseId: chapters.courseId, count: sql<number>`count(${lessons.id})::int` })
    .from(chapters)
    .leftJoin(lessons, eq(lessons.chapterId, chapters.id))
    .where(inArray(chapters.courseId, ids))
    .groupBy(chapters.courseId);

  const dones = await db
    .select({ courseId: lessonProgress.courseId, count: sql<number>`count(*)::int` })
    .from(lessonProgress)
    .where(and(inArray(lessonProgress.courseId, ids), eq(lessonProgress.studentId, studentId)))
    .groupBy(lessonProgress.courseId);

  const totalBy = new Map(totals.map((t) => [t.courseId, num(t.count)]));
  const doneBy = new Map(dones.map((t) => [t.courseId, num(t.count)]));

  return rows.map((r) => ({
    enrollment: r.enrollment,
    course: r.course,
    creatorName: r.creatorName,
    totalLessons: totalBy.get(r.course.id) ?? 0,
    doneLessons: doneBy.get(r.course.id) ?? 0,
  }));
}

/* ----------------------------------- admin ---------------------------------- */

export async function getAdminOverview() {
  const [o] = await db
    .select({
      gmv: sql<number>`coalesce(sum(${orders.netPaise}), 0)::bigint`,
      platform: sql<number>`coalesce(sum(${orders.platformFeePaise}), 0)::bigint`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(eq(orders.status, "paid"));

  const [creators] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "creator"));
  const [learners] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "buyer"));
  const [pub] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(courses)
    .where(eq(courses.status, "published"));

  const [pendingPayouts] = await db
    .select({
      count: sql<number>`count(*)::int`,
      amount: sql<number>`coalesce(sum(${settlements.amountPaise}), 0)::bigint`,
    })
    .from(settlements)
    .where(eq(settlements.status, "pending"));

  const recent = await db
    .select({
      order: orders,
      courseTitle: courses.title,
      buyerName: users.name,
    })
    .from(orders)
    .innerJoin(courses, eq(orders.courseId, courses.id))
    .innerJoin(users, eq(users.id, orders.buyerId))
    .orderBy(desc(orders.createdAt))
    .limit(8);

  return {
    gmv: num(o?.gmv),
    platformRevenue: num(o?.platform),
    paidOrders: num(o?.count),
    creators: num(creators?.count),
    learners: num(learners?.count),
    publishedCourses: num(pub?.count),
    pendingSettlements: num(pendingPayouts?.count),
    pendingSettlementAmount: num(pendingPayouts?.amount),
    recent: recent.map((r) => ({
      ...r.order,
      courseTitle: r.courseTitle,
      buyerName: r.buyerName,
    })),
  };
}

export type CreatorBalance = {
  creator: User;
  courses: number;
  earned: number;
  settled: number;
  unsettled: number;
};

export async function getCreatorBalances(): Promise<CreatorBalance[]> {
  const creatorRows = await db
    .select()
    .from(users)
    .where(eq(users.role, "creator"))
    .orderBy(asc(users.createdAt));

  const rows = await db
    .select({
      creatorId: courses.creatorId,
      courses: sql<number>`count(distinct ${courses.id})::int`,
      earned: sql<number>`coalesce(sum(case when ${orders.status} = 'paid' then ${orders.creatorEarningPaise} else 0 end), 0)::bigint`,
      unsettled: sql<number>`coalesce(sum(case when ${orders.status} = 'paid' and ${orders.settlementId} is null then ${orders.creatorEarningPaise} else 0 end), 0)::bigint`,
    })
    .from(courses)
    .leftJoin(orders, eq(orders.courseId, courses.id))
    .groupBy(courses.creatorId);

  const by = new Map(rows.map((r) => [r.creatorId, r]));

  return creatorRows.map((creator) => {
    const r = by.get(creator.id);
    const earned = num(r?.earned);
    const unsettled = num(r?.unsettled);
    return {
      creator,
      courses: num(r?.courses),
      earned,
      unsettled,
      settled: Math.max(0, earned - unsettled),
    };
  });
}

export async function getAllSettlements(): Promise<(Settlement & { creatorName: string; creatorEmail: string })[]> {
  const rows = await db
    .select({
      settlement: settlements,
      creatorName: users.name,
      creatorEmail: users.email,
    })
    .from(settlements)
    .innerJoin(users, eq(users.id, settlements.creatorId))
    .orderBy(desc(settlements.createdAt))
    .limit(100);
  return rows.map((r) => ({
    ...r.settlement,
    creatorName: r.creatorName,
    creatorEmail: r.creatorEmail,
  }));
}

export function countLessons(curriculum: (Chapter & { lessons: Lesson[] })[]) {
  return curriculum.reduce((s, c) => s + c.lessons.length, 0);
}

export function flattenLessons(curriculum: (Chapter & { lessons: Lesson[] })[]) {
  return curriculum.flatMap((c) => c.lessons);
}

export type { Course, Chapter, Lesson, Coupon, Order, Settlement, User };
