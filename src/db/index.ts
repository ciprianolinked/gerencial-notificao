import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Next.js imports every server route module while collecting page data during
 * `next build`. DATABASE_URL should NOT be read or validated at module load
 * (otherwise Vercel's build fails before environment variables are available).
 *
 * The pool is created the first time the application actually queries the
 * database, not when this module is imported.
 */
let pool: Pool | undefined;
let database: ReturnType<typeof drizzle> | undefined;
let poolError: Error | undefined;

function getPool(): Pool {
  if (poolError) throw poolError;
  if (pool) return pool;

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    poolError = new Error(
      "DATABASE_URL não está configurada. No Vercel, adicione a variável de servidor DATABASE_URL em Settings → Environment Variables (Production/Preview) com a URL completa do PostgreSQL hospedado, depois faça um novo deploy.",
    );
    throw poolError;
  }

  const novo = new Pool({ connectionString: url });
  if (process.env.NODE_ENV !== "production") {
    const g = globalThis as typeof globalThis & {
      __gerencialPgPool?: Pool;
    };
    if (g.__gerencialPgPool) {
      void novo.end();
      pool = g.__gerencialPgPool;
    } else {
      pool = novo;
      g.__gerencialPgPool = pool;
    }
  } else {
    pool = novo;
  }
  return pool;
}

/**
 * `db` é um objeto Drizzle que cria a conexão na primeira chamada. Ele expõe
 * o mesmo método (`select`, `insert`, `update`, `delete`, `execute`, …), mas
 * só inicializa o pool durante a execução da rota, não durante o build.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache: Record<string | symbol, any> = {};

export const db: ReturnType<typeof drizzle> = new Proxy(
  {} as ReturnType<typeof drizzle>,
  {
    get(_target, property) {
      if (property === Symbol.toPrimitive || property === "then") {
        // Evita que Next.js/Node tentem converter o Proxy em Promise durante o build.
        return undefined;
      }
      if (property in cache) return cache[property];
      const instancia = drizzle(getPool());
      const valor = Reflect.get(instancia, property, instancia);
      cache[property] = typeof valor === "function" ? valor.bind(instancia) : valor;
      return cache[property];
    },
  },
);
