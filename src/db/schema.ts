import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Users — every registered user can be a buyer AND an instant creator.
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------
export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    category: text("category").notNull().default("Other"),
    description: text("description").notNull().default(""),
    // Either an image URL or a "gradient:<key>" preset token.
    thumbnail: text("thumbnail").notNull().default("gradient:violet"),
    pricePaise: integer("price_paise").notNull().default(0),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("courses_slug_unique").on(t.slug),
    index("courses_creator_idx").on(t.creatorId),
  ],
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    durationMin: integer("duration_min").notNull().default(5),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("lessons_course_idx").on(t.courseId)],
);

// ---------------------------------------------------------------------------
// Purchases / transactions. Money is stored in paise (1 INR = 100 paise).
// ---------------------------------------------------------------------------
export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    razorpayOrderId: text("razorpay_order_id").notNull(),
    razorpayPaymentId: text("razorpay_payment_id"),
    grossPaise: integer("gross_paise").notNull(),
    feePaise: integer("fee_paise").notNull(),
    creatorPaise: integer("creator_paise").notNull(),
    status: text("status", {
      enum: ["created", "paid", "failed", "refunded"],
    })
      .notNull()
      .default("created"),
    method: text("method"),
    failureReason: text("failure_reason"),
    payoutId: uuid("payout_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("purchases_order_unique").on(t.razorpayOrderId),
    index("purchases_buyer_idx").on(t.buyerId),
    index("purchases_creator_idx").on(t.creatorId),
    index("purchases_status_idx").on(t.status),
    index("purchases_payout_idx").on(t.payoutId),
  ],
);

// ---------------------------------------------------------------------------
// Creator payout (settlement) destination — banking data is server-only.
// ---------------------------------------------------------------------------
export const payoutAccounts = pgTable(
  "payout_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    holderName: text("holder_name").notNull(),
    accountNumber: text("account_number").notNull(),
    ifsc: text("ifsc").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("payout_accounts_user_unique").on(t.userId)],
);

export const payouts = pgTable(
  "payouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountPaise: integer("amount_paise").notNull(),
    purchaseCount: integer("purchase_count").notNull().default(0),
    status: text("status", { enum: ["processing", "processed", "failed"] })
      .notNull()
      .default("processing"),
    razorpayPayoutId: text("razorpay_payout_id"),
    failureReason: text("failure_reason"),
    trigger: text("trigger", { enum: ["scheduled", "manual"] })
      .notNull()
      .default("scheduled"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    index("payouts_creator_idx").on(t.creatorId),
    index("payouts_status_idx").on(t.status),
  ],
);

// ---------------------------------------------------------------------------
// Learning progress
// ---------------------------------------------------------------------------
export const progress = pgTable(
  "progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("progress_user_lesson_unique").on(t.userId, t.lessonId)],
);

// ---------------------------------------------------------------------------
// Platform-wide settings (single row, id = 1)
// ---------------------------------------------------------------------------
export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  feePercent: integer("fee_percent").notNull().default(10),
  minPayoutPaise: integer("min_payout_paise").notNull().default(100),
  pendingHours: integer("pending_hours").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many, one }) => ({
  courses: many(courses),
  purchases: many(purchases),
  payouts: many(payouts),
  payoutAccount: one(payoutAccounts),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  creator: one(users, { fields: [courses.creatorId], references: [users.id] }),
  lessons: many(lessons),
  purchases: many(purchases),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  course: one(courses, { fields: [lessons.courseId], references: [courses.id] }),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  course: one(courses, { fields: [purchases.courseId], references: [courses.id] }),
  buyer: one(users, { fields: [purchases.buyerId], references: [users.id] }),
  creator: one(users, { fields: [purchases.creatorId], references: [users.id] }),
  payout: one(payouts, { fields: [purchases.payoutId], references: [payouts.id] }),
}));

export const payoutsRelations = relations(payouts, ({ one, many }) => ({
  creator: one(users, { fields: [payouts.creatorId], references: [users.id] }),
  purchases: many(purchases),
}));

export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
export type PayoutAccount = typeof payoutAccounts.$inferSelect;
export type PlatformSettings = typeof platformSettings.$inferSelect;
