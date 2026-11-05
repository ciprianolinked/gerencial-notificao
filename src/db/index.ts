import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

type Database = ReturnType<typeof drizzle>;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

let database: Database | undefined;

/**
 * Next.js imports route modules while collecting page data during `next build`.
 * Do not read/validate DATABASE_URL or initialize a connection at module load:
 * on Vercel the build must be able to import routes without a database connection.
 * The connection is created on the first real database operation instead.
 */
function getDatabase(): Database {
  if (database) return database;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL não configurada. Configure a URL de um PostgreSQL acessível no ambiente do Vercel para usar o aplicativo.",
    );
  }

  const pool =
    (process.env.NODE_ENV !== "production" && globalForDb.__arenaNextJsPostgresqlPool) ||
    new Pool({ connectionString: databaseUrl });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }

  database = drizzle(pool);
  return database;
}

/** Mantém a API existente (`db.select`, `db.insert` etc.) com inicialização tardia. */
export const db: Database = new Proxy({} as Database, {
  get(_target, property) {
    // Introspection during build must not establish a database connection.
    if (property === "then" || typeof property === "symbol") return undefined;

    const instance = getDatabase();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
