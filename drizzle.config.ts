import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Reads DATABASE_URL from the environment (or .env). Falls back to the local
 * development default. Point DATABASE_URL at your production database (e.g.
 * Neon) and run `npx drizzle-kit push` to apply the schema there.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
