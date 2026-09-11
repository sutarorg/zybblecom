import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const time = new Date().toISOString();
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: true, time });
  } catch {
    return Response.json({ ok: false, db: false, time }, { status: 500 });
  }
}
