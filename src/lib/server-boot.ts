import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  courses,
  lessons,
  payoutAccounts,
  payouts,
  purchases,
  progress,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/settings";
import { computeSplit } from "@/lib/money";

const DAY = 24 * 3600_000;

async function upsertUser(name: string, email: string, password: string, isAdmin = false) {
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(users)
    .values({ name, email, passwordHash: await hashPassword(password), isAdmin })
    .returning();
  return created;
}

/** Core seed (always runs): platform settings row + the admin account. */
async function seedCore() {
  await getPlatformSettings();

  const admin = await upsertUser(
    process.env.ADMIN_NAME ?? "Zybble Admin",
    process.env.ADMIN_EMAIL ?? "admin@zybble.com",
    process.env.ADMIN_PASSWORD ?? "admin12345",
    true,
  );
  if (!process.env.ADMIN_EMAIL) {
    console.log("[zybble] default admin created: admin@zybble.com / admin12345");
    console.log("[zybble] set ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_NAME to customize it");
  }
  return admin;
}

/** Demo seed (skippable with SEED_DEMO=false): creator/buyer accounts,
 *  two published courses, a settled payout and a pending balance. */
async function seedDemo() {
  const creator = await upsertUser("Aarav Mehta", "creator@zybble.com", "creator12345");
  const buyer = await upsertUser("Ishita Rao", "buyer@zybble.com", "buyer12345");

  // Creator bank account (used by the settlement engine)
  const [hasBank] = await db
    .select()
    .from(payoutAccounts)
    .where(eq(payoutAccounts.userId, creator.id))
    .limit(1);
  if (!hasBank) {
    await db.insert(payoutAccounts).values({
      userId: creator.id,
      holderName: "Aarav Mehta",
      accountNumber: "50100223344556",
      ifsc: "HDFC0001234",
    });
  }

  async function ensureCourse(input: {
    slug: string;
    title: string;
    category: string;
    description: string;
    pricePaise: number;
    thumbnail: string;
    lessonList: Array<{ title: string; content: string; durationMin: number }>;
  }) {
    const [existing] = await db
      .select()
      .from(courses)
      .where(eq(courses.slug, input.slug))
      .limit(1);
    if (existing) return existing;
    const [course] = await db
      .insert(courses)
      .values({
        creatorId: creator.id,
        slug: input.slug,
        title: input.title,
        category: input.category,
        description: input.description,
        pricePaise: input.pricePaise,
        thumbnail: input.thumbnail,
        status: "published",
      })
      .returning();
    for (let i = 0; i < input.lessonList.length; i++) {
      await db.insert(lessons).values({
        courseId: course.id,
        title: input.lessonList[i].title,
        content: input.lessonList[i].content,
        durationMin: input.lessonList[i].durationMin,
        position: i,
      });
    }
    return course;
  }

  const course1 = await ensureCourse({
    slug: "design-system-playbook",
    title: "The Creator's Design System Playbook",
    category: "Design",
    pricePaise: 149900,
    thumbnail: "gradient:violet",
    description:
      "Everything I learned building design systems for three startups — condensed into 12 practical lessons you can finish in a weekend.\n\nYou'll walk away with a working system: tokens, components, docs, and the confidence to ship consistent UI fast. No fluff, no theory dumps — just the exact process I use with paying clients.",
    lessonList: [
      {
        title: "Why most design systems fail (and yours won't)",
        durationMin: 8,
        content:
          "Most design systems die within six months. Not because the buttons were ugly — because nobody owned them.\n\nIn this lesson we map the three failure modes: no adoption plan, no governance, and solving problems nobody has. You'll write a one-page charter for your system before touching a single component.\n\nExercise: define the two teams who must adopt your system first, and the one workflow you'll make 10x easier for them.",
      },
      {
        title: "Design tokens from scratch",
        durationMin: 14,
        content:
          "Tokens are the atoms of your system: color, spacing, type, radius, shadow, motion.\n\nWe'll build a three-tier token architecture — primitives, semantic, component — so a brand refresh means editing six values, not six hundred.\n\nYou'll end this lesson with a JSON token file you can hand to any engineer and a Figma variable setup that mirrors it exactly.",
      },
      {
        title: "Components that compose",
        durationMin: 16,
        content:
          "Great components are boring on purpose. We cover slots over props, state matrices (default, hover, disabled, loading, error), and when a variant becomes a new component.\n\nBuild along: we design a Button, an Input, and a Card — then compose them into a pricing section without writing a single override.",
      },
      {
        title: "Docs people actually read",
        durationMin: 9,
        content:
          "Documentation is a product. We cover the four pages every component needs: anatomy, usage, do/don't, and code.\n\nSteal my template and publish your first three component docs in under an hour.",
      },
      {
        title: "Shipping v1 and keeping it alive",
        durationMin: 11,
        content:
          "A design system is a garden, not a statue. In the final lesson we set up your release rhythm: change requests, versioning, deprecations, and the monthly adoption metric that keeps leadership funding the work.\n\nYou'll leave with a 90-day rollout plan and a changelog format engineers love.",
      },
    ],
  });

  const course2 = await ensureCourse({
    slug: "ship-your-first-saas",
    title: "Ship Your First SaaS in 30 Days",
    category: "Development",
    pricePaise: 249900,
    thumbnail: "gradient:ocean",
    description:
      "A code-along sprint from empty folder to paying customers. We pick a boring niche, build the smallest lovable product, wire up payments, and launch — in four weeks of evenings.\n\nYou don't need startup experience. You need a laptop and 90 minutes a day.",
    lessonList: [
      {
        title: "Pick a painfully specific niche",
        durationMin: 10,
        content:
          "Your SaaS fails at the idea stage, not the code stage. In this lesson we use the three-filter test: who has this problem weekly, who already pays for a workaround, and who you can reach in one DM.\n\nBy the end you'll have one sentence: 'I help [person] do [job] without [pain].'",
      },
      {
        title: "The smallest lovable product",
        durationMin: 18,
        content:
          "Scope is the enemy. We cut your feature list to the one workflow that delivers the 'oh wow' moment, and prototype it in a single evening.\n\nIncludes my anti-shiny-object checklist for saying no to ideas you love.",
      },
      {
        title: "Payments, auth and the boring 80%",
        durationMin: 22,
        content:
          "The unglamorous parts make or break launch week. We wire auth, email, error handling, and a checkout with webhook verification — and talk through what you can safely skip for v1.",
      },
      {
        title: "Launch day playbook",
        durationMin: 13,
        content:
          "We launch to 50 hand-picked people, not the whole internet. Templates included: the outreach DM, the landing page outline, and the pricing page that converts skeptics.\n\nFinal mission: get your first paying user within 7 days.",
      },
    ],
  });

  // --- Seed transactions (idempotent via unique order ids) ---
  async function ensurePaid(orderId: string, courseId: string, daysAgo: number) {
    const [existing] = await db
      .select()
      .from(purchases)
      .where(eq(purchases.razorpayOrderId, orderId))
      .limit(1);
    if (existing) return existing;
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    const { feePaise, creatorPaise } = computeSplit(course.pricePaise, 10);
    const paidAt = new Date(Date.now() - daysAgo * DAY);
    const [p] = await db
      .insert(purchases)
      .values({
        courseId,
        creatorId: creator.id,
        buyerId: buyer.id,
        razorpayOrderId: orderId,
        razorpayPaymentId: orderId.replace("order_", "pay_"),
        grossPaise: course.pricePaise,
        feePaise,
        creatorPaise,
        status: "paid",
        method: "upi",
        createdAt: paidAt,
        paidAt,
      })
      .returning();
    return p;
  }

  // A settled sale from 5 days ago + its payout from 4 days ago.
  const p1 = await ensurePaid("order_sim_seed_h1", course1.id, 5);
  if (p1 && !p1.payoutId) {
    const [existingPayout] = await db
      .select()
      .from(payouts)
      .where(eq(payouts.razorpayPayoutId, "pout_sim_seed_h1"))
      .limit(1);
    let payoutRow = existingPayout;
    if (!payoutRow) {
      [payoutRow] = await db
        .insert(payouts)
        .values({
          creatorId: creator.id,
          amountPaise: p1.creatorPaise,
          purchaseCount: 1,
          status: "processed",
          razorpayPayoutId: "pout_sim_seed_h1",
          trigger: "scheduled",
          createdAt: new Date(Date.now() - 4 * DAY),
          processedAt: new Date(Date.now() - 4 * DAY + 40_000),
        })
        .returning();
    }
    await db.update(purchases).set({ payoutId: payoutRow.id }).where(eq(purchases.id, p1.id));
  }

  // A fresh unsettled sale — lands in the next settlement run.
  await ensurePaid("order_sim_seed_pending", course2.id, 1);

  // Buyer progress: 3/5 lessons done in course 1.
  const c1Lessons = await db.select().from(lessons).where(eq(lessons.courseId, course1.id));
  for (const l of c1Lessons.slice(0, 3)) {
    await db
      .insert(progress)
      .values({ userId: buyer.id, courseId: course1.id, lessonId: l.id })
      .onConflictDoNothing();
  }

  console.log("[zybble] demo seed ready (set SEED_DEMO=false to disable)");
}

let booted = false;

export async function boot() {
  if (booted) return;
  booted = true;

  try {
    await seedCore();
    if (process.env.SEED_DEMO !== "false") {
      await seedDemo();
    }
  } catch (err) {
    console.error("[zybble] seed failed (continuing):", err);
  }

  // On Vercel, serverless instances don't stay alive — the 4:00 PM settlement
  // is triggered by Vercel Cron hitting /api/cron/settle (see vercel.json).
  // Everywhere else (VPS, Docker, local `next start`), arm an in-process cron.
  if (process.env.VERCEL) {
    console.log("[zybble] Vercel detected — settlements via Vercel Cron (/api/cron/settle)");
    return;
  }

  try {
    const cron = (await import("node-cron")).default;
    const { runSettlement } = await import("@/lib/settlement");
    const timezone = process.env.SETTLEMENT_TZ || "Asia/Kolkata";
    cron.schedule(
      "0 16 * * *",
      async () => {
        console.log("[zybble] 4:00 PM settlement run starting");
        try {
          const summary = await runSettlement("scheduled");
          console.log(
            `[zybble] settlement complete: ${summary.processed} processed, ${summary.failed} failed, ${summary.skipped} skipped`,
          );
        } catch (err) {
          console.error("[zybble] settlement run failed:", err);
        }
      },
      { timezone },
    );
    console.log(`[zybble] settlement scheduler armed (16:00 daily, ${timezone})`);
  } catch (err) {
    console.error("[zybble] failed to arm scheduler:", err);
  }
}
