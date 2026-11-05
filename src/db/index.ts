import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Cliente do PostgreSQL com inicialização preguiçosa.
 *
 * O build da Vercel importa os módulos das rotas para coletar dados das páginas.
 * Se a conexão (ou a validação de DATABASE_URL) acontecesse no topo do arquivo,
 * o build falharia sem as variáveis de ambiente. Aqui o pool só é criado quando
 * a primeira consulta é realmente executada.
 */

type Db = NodePgDatabase<Record<string, never>>;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsDb?: Db;
};

function conexao(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não configurada. Defina a variável de ambiente apontando para o PostgreSQL " +
        "(por exemplo, um banco Neon/Supabase na Vercel) e rode as migrações do Drizzle.",
    );
  }
  return url;
}

export function getPool(): Pool {
  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    globalForDb.__arenaNextJsPostgresqlPool = new Pool({ connectionString: conexao() });
  }
  return globalForDb.__arenaNextJsPostgresqlPool;
}

export function getDb(): Db {
  if (!globalForDb.__arenaNextJsDb) {
    const pool = getPool();
    globalForDb.__arenaNextJsDb = drizzle(pool);
    if (process.env.NODE_ENV !== "production") {
      globalForDb.__arenaNextJsPostgresqlPool = pool;
    }
  }
  return globalForDb.__arenaNextJsDb;
}

/** Proxy que cria a conexão no primeiro acesso (db.select(), db.execute(), ...). */
export const db: Db = new Proxy({} as Db, {
  get(_alvo, prop) {
    const instancia = getDb();
    const valor = Reflect.get(instancia as object, prop, instancia);
    return typeof valor === "function" ? valor.bind(instancia) : valor;
  },
  has(_alvo, prop) {
    return prop in (getDb() as object);
  },
  ownKeys() {
    return Reflect.ownKeys(getDb() as object);
  },
  getOwnPropertyDescriptor(_alvo, prop) {
    return (
      Reflect.getOwnPropertyDescriptor(getDb() as object, prop) ?? {
        configurable: true,
        enumerable: true,
        value: undefined,
      }
    );
  },
});
