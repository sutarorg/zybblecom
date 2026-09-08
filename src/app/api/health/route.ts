import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const REQUIRED_TABLES = [
  "users",
  "courses",
  "lessons",
  "purchases",
  "payouts",
  "payout_accounts",
  "progress",
  "platform_settings",
];

function sanitize(message: string) {
  // Never leak credentials or full connection strings into the response.
  return message.replace(/postgres(ql)?:\/\/\S+/gi, "postgresql://***").slice(0, 160);
}

/**
 * Deployment diagnostic — answers "is the app wired correctly?" without
 * exposing secrets. Check this first when auth or data fails in production.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);

    const existing = await db.execute(
      sql`select tablename from pg_tables where schemaname = 'public'`,
    );
    const present = new Set(
      (existing.rows as Array<{ tablename: string }>).map((r) => r.tablename),
    );
    const tables = Object.fromEntries(REQUIRED_TABLES.map((t) => [t, present.has(t)]));
    const missing = REQUIRED_TABLES.filter((t) => !present.has(t));

    // Column-level drift check — a schema pushed before an upgrade can leave
    // tables present but columns missing, which breaks auth/user queries.
    const columns: Record<string, boolean> = {};
    if (present.has("users")) {
      const colRows = await db.execute(
        sql`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'users'`,
      );
      const colSet = new Set(
        (colRows.rows as Array<{ column_name: string }>).map((r) => r.column_name),
      );
      columns["users.google_sub"] = colSet.has("google_sub");
    }

    const [userCount] = (await db.execute(sql`select count(*)::int as n from users`))
      .rows as Array<{ n: number }>;

    const drift = Object.entries(columns)
      .filter(([, ok]) => !ok)
      .map(([name]) => name);
    const ok = missing.length === 0 && drift.length === 0;

    return Response.json({
      ok,
      db: "connected",
      tables,
      columns,
      counts: { users: userCount?.n ?? 0 },
      ...(!ok && {
        hint: `${missing.length ? `Missing tables: ${missing.join(", ")}. ` : ""}${
          drift.length ? `Missing columns: ${drift.join(", ")} (schema drift). ` : ""
        }Run "npx drizzle-kit push" against this database (README §8.3).`,
      }),
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        db: "error",
        error: sanitize(err instanceof Error ? err.message : String(err)),
        hint: "Check DATABASE_URL in your host's environment variables (README §3.1).",
      },
      { status: 500 },
    );
  }
}
