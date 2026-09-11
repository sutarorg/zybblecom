import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const time = new Date().toISOString();
  try {
    await db.execute(sql`select 1`);
    // Verify the schema actually exists — a live socket with no tables is
    // not a healthy deployment (drizzle-kit push wasn't run).
    await db.execute(sql`select id from "users" limit 1`);
    return Response.json({ ok: true, db: true, time });
  } catch {
    return Response.json({ ok: false, db: false, time }, { status: 500 });
  }
}
