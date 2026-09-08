import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { runSettlement } from "@/lib/settlement";

/**
 * Settlement trigger for external schedulers (Vercel Cron, GitHub Actions,
 * system cron) hitting this endpoint daily at 4:00 PM.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` or an admin session.
 * The in-process 16:00 scheduler (instrumentation.ts) calls the same engine.
 */
async function handle(req: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  let ok = expected && provided === expected;
  if (!ok) {
    const user = await getSessionUser();
    ok = Boolean(user?.isAdmin);
  }
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runSettlement("scheduled");
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...summary });
}

export const GET = handle;
export const POST = handle;
