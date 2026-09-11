import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

/**
 * Managed Postgres providers (Supabase, RDS, etc.) terminate TLS with a
 * certificate chain that isn't in Node's default trust store when connecting
 * through a pooler host. We enable TLS for remote hosts and skip strict chain
 * verification, which is the documented configuration for these poolers.
 * Local development (127.0.0.1 / localhost) connects without TLS.
 */
function resolveSsl(url: string): false | { rejectUnauthorized: boolean } {
  const override = process.env.DATABASE_SSL?.toLowerCase();
  if (override === "disable" || override === "false") return false;
  if (override === "require" || override === "true") return { rejectUnauthorized: false };

  try {
    const { hostname, searchParams } = new URL(url);
    const isLocal =
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    if (isLocal) return false;
    if (searchParams.get("sslmode") === "disable") return false;
    return { rejectUnauthorized: false };
  } catch {
    return false;
  }
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: resolveSsl(databaseUrl),
    // Serverless-friendly: Supabase's transaction pooler handles concurrency,
    // so each function instance keeps a small pool with short idle times.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
