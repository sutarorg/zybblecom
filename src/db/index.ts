import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

/**
 * SSL strategy: local databases (localhost / 127.0.0.1 / explicit
 * sslmode=disable) stay unencrypted. Every hosted database (Neon, Supabase,
 * Vercel Postgres, RDS…) gets TLS with relaxed verification — managed
 * Postgres proxies use rotating certs that strict verification rejects,
 * which is a common cause of "connection failed" on Vercel.
 */
function sslConfig(url: string): PoolConfig["ssl"] {
  try {
    const parsed = new URL(url);
    const sslmode = parsed.searchParams.get("sslmode");
    if (sslmode === "disable") return undefined;
    const localHosts = new Set(["localhost", "127.0.0.1", "::1", "postgres", "db"]);
    if (localHosts.has(parsed.hostname)) return undefined;
    if (sslmode === "no-verify") return { rejectUnauthorized: false };
    return { rejectUnauthorized: false };
  } catch {
    // Unparseable URL — let pg handle it as-is.
    return undefined;
  }
}

const globalForDb = globalThis as typeof globalThis & {
  __zybblePgPool?: Pool;
};

// Cache the pool on globalThis in ALL environments: in dev it survives hot
// reloads; on serverless it survives warm invocations within an instance.
export const pool =
  globalForDb.__zybblePgPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: sslConfig(databaseUrl),
    max: 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });

globalForDb.__zybblePgPool = pool;

pool.on("error", (err) => {
  // Never let an idle client error crash the process (serverless-safe).
  console.error("[zybble] postgres pool error:", err.message);
});

export const db = drizzle(pool, { schema });
