import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "creator", "buyer"]);
export const courseStatusEnum = pgEnum("course_status", ["draft", "published"]);
export const lessonTypeEnum = pgEnum("lesson_type", ["video", "pdf", "text"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "failed"]);
export const settlementStatusEnum = pgEnum("settlement_status", ["pending", "paid"]);
export const couponTypeEnum = pgEnum("coupon_type", ["percent", "flat"]);

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("buyer"),
  createdAt: createdAt(),
}).enableRLS();

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
).enableRLS();

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    coverUrl: text("cover_url"),
    pricePaise: integer("price_paise").notNull().default(0),
    currency: text("currency").notNull().default("INR"),
    status: courseStatusEnum("status").notNull().default("draft"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("courses_creator_idx").on(t.creatorId)],
).enableRLS();

export const chapters = pgTable(
  "chapters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("chapters_course_idx").on(t.courseId)],
).enableRLS();

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: lessonTypeEnum("type").notNull().default("video"),
    body: text("body").notNull().default(""),
    videoUrl: text("video_url"),
    fileUrl: text("file_url"),
    durationMin: integer("duration_min"),
    isPreview: boolean("is_preview").notNull().default(false),
    position: integer("position").notNull().default(0),
    resources: jsonb("resources").$type<{ label: string; url: string }[]>().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [index("lessons_chapter_idx").on(t.chapterId)],
).enableRLS();

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    type: couponTypeEnum("type").notNull(),
    value: integer("value").notNull(),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    active: boolean("active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("coupons_course_code_idx").on(t.courseId, t.code)],
).enableRLS();

export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountPaise: integer("amount_paise").notNull(),
    status: settlementStatusEnum("status").notNull().default("pending"),
    note: text("note"),
    createdAt: createdAt(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [index("settlements_creator_idx").on(t.creatorId)],
).enableRLS();

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    grossPaise: integer("gross_paise").notNull(),
    discountPaise: integer("discount_paise").notNull().default(0),
    netPaise: integer("net_paise").notNull(),
    platformFeePaise: integer("platform_fee_paise").notNull().default(0),
    creatorEarningPaise: integer("creator_earning_paise").notNull().default(0),
    status: orderStatusEnum("status").notNull().default("pending"),
    provider: text("provider").notNull().default("razorpay"),
    providerOrderId: text("provider_order_id"),
    providerPaymentId: text("provider_payment_id"),
    settlementId: uuid("settlement_id").references(() => settlements.id),
    createdAt: createdAt(),
  },
  (t) => [
    index("orders_course_idx").on(t.courseId),
    index("orders_buyer_idx").on(t.buyerId),
    index("orders_status_idx").on(t.status),
    uniqueIndex("orders_provider_order_idx").on(t.providerOrderId),
  ],
).enableRLS();

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("enroll_unique_idx").on(t.courseId, t.studentId)],
).enableRLS();

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("progress_unique_idx").on(t.studentId, t.lessonId),
    index("progress_course_idx").on(t.courseId),
    index("progress_student_idx").on(t.studentId),
  ],
).enableRLS();

export type User = typeof users.$inferSelect;
export type UserRole = User["role"];
export type Course = typeof courses.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type LessonType = Lesson["type"];
export type Coupon = typeof coupons.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Settlement = typeof settlements.$inferSelect;
