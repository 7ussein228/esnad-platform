import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

// Allow `next build` / `next lint` on Vercel without a DB at build time.
// Runtime pages are force-dynamic and will fail clearly if DB is unreachable.
if (!databaseUrl && process.env.NODE_ENV === "production" && process.env.VERCEL !== "1") {
  throw new Error("DATABASE_URL is required");
}

const connectionString = databaseUrl ?? "postgresql://localhost:5432/placeholder_build_only";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
