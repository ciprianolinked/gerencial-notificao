import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { COLUNAS_VERIFICADAS, SQL_CRIAR_ESQUEMA, SQL_VERIFICAR_ESQUEMA } from "./ddl";

type Database = ReturnType<typeof drizzle>;
type Consulta = (...args: unknown[]) => Promise<unknown>;

/**
 * Variáveis aceitas, em ordem de preferência. A integração Neon do Vercel cria
 * DATABASE_URL (pooled) e DATABASE_URL_UNPOOLED; as demais cobrem templates antigos.
 */
export const VARIAVEIS_CONEXAO = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "NEON_DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
] as const;

export type Conexao = { variavel: string; url: string };

/** Remove erros comuns de colagem: aspas, espaços e o prefixo `psql` do painel do Neon. */
function normalizarValor(valor: string): string {
  return valor
    .trim()
    .replace(/^psql\s+/i, "")
    .replace(/^['"]+|['"]+$/g, "")
    .trim();
}

export function lerConexao(): Conexao | null {
  for (const nome of VARIAVEIS_CONEXAO) {
    const bruto = process.env[nome];
    const valor = bruto ? normalizarValor(bruto) : "";
    if (valor) return { variavel: nome, url: valor };
  }
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    return {
      variavel: "PGHOST/PGUSER/PGPASSWORD/PGDATABASE",
      url: `postgresql://${encodeURIComponent(PGUSER)}:${encodeURIComponent(PGPASSWORD)}@${PGHOST}/${encodeURIComponent(PGDATABASE)}?sslmode=require`,
    };
  }
  return null;
}

export class BancoNaoConfiguradoError extends Error {
  readonly code = "BANCO_NAO_CONFIGURADO";
  constructor() {
    super("Nenhuma variável de conexão com o banco (DATABASE_URL) foi encontrada no servidor.");
    this.name = "BancoNaoConfiguradoError";
  }
}

/** O Neon exige SSL: inclui `sslmode=require` quando a URL não informa. */
function prepararUrl(url: string): string {
  try {
    const u = new URL(url);
    if (/\.neon\.(tech|com)$/i.test(u.hostname) && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
      return u.toString();
    }
  } catch {
    /* URL inválida: o diagnóstico do banco informa o problema */
  }
  return url;
}

let pool: Pool | undefined;
let instancia: Database | undefined;
let esquemaPronto: Promise<void> | null = null;

async function prepararEsquema(consultar: Consulta): Promise<void> {
  const r = (await consultar(SQL_VERIFICAR_ESQUEMA)) as { rows?: { n?: number }[] };
  if (Number(r.rows?.[0]?.n ?? 0) >= COLUNAS_VERIFICADAS) return;
  await consultar(SQL_CRIAR_ESQUEMA);
}

/** Cria as tabelas que faltarem uma única vez por processo (refaz se falhar). */
function garantirEsquema(consultar: Consulta): Promise<void> {
  if (!esquemaPronto) {
    esquemaPronto = prepararEsquema(consultar).catch((erro: unknown) => {
      esquemaPronto = null;
      throw erro;
    });
  }
  return esquemaPronto;
}

/**
 * Cria o pool na primeira consulta real — nunca durante o `next build`,
 * que importa as rotas sem acesso ao banco.
 */
export function obterPool(): Pool {
  if (pool) return pool;
  const conexao = lerConexao();
  if (!conexao) throw new BancoNaoConfiguradoError();

  const g = globalThis as typeof globalThis & { __gerencialPool?: Pool };
  if (process.env.NODE_ENV !== "production" && g.__gerencialPool) {
    pool = g.__gerencialPool;
    return pool;
  }

  const novo = new Pool({
    connectionString: prepararUrl(conexao.url),
    max: 5,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 20_000,
  });
  // Sem este listener, a queda de uma conexão ociosa (ex.: o Neon suspende o banco) derruba o processo.
  novo.on("error", (erro) => console.error("[banco] conexão ociosa encerrada:", erro.message));

  // Toda consulta aguarda a verificação/criação das tabelas (feita uma vez por processo).
  const consultaOriginal = novo.query.bind(novo) as unknown as Consulta;
  (novo as unknown as { query: Consulta }).query = (...args: unknown[]) =>
    garantirEsquema(consultaOriginal).then(() => consultaOriginal(...args));

  if (process.env.NODE_ENV !== "production") g.__gerencialPool = novo;
  pool = novo;
  return novo;
}

function obterDb(): Database {
  if (!instancia) instancia = drizzle(obterPool());
  return instancia;
}

/** Mesmo uso de sempre (`db.select`, `db.insert`…), com conexão criada sob demanda. */
export const db: Database = new Proxy({} as Database, {
  get(_alvo, propriedade) {
    // Evita que o build/runtime trate o objeto como Promise ou o inspecione via símbolos.
    if (propriedade === "then" || typeof propriedade === "symbol") return undefined;
    const real = obterDb();
    const valor = Reflect.get(real, propriedade, real) as unknown;
    return typeof valor === "function"
      ? (valor as (...args: unknown[]) => unknown).bind(real)
      : valor;
  },
});
