import { sql } from "drizzle-orm";
import { BancoNaoConfiguradoError, db, lerConexao } from "@/db";

export type EtapaBanco = "variavel" | "conexao" | "tabelas";

export type DiagnosticoBanco = {
  etapa: EtapaBanco;
  titulo: string;
  mensagem: string;
  acao: string;
  codigo?: string;
};

export type StatusBancoOk = { ok: true; variavel: string; host: string };
export type StatusBancoFalha = { ok: false; variavel?: string; host?: string } & DiagnosticoBanco;
export type StatusBanco = StatusBancoOk | StatusBancoFalha;

const SEM_VARIAVEL: DiagnosticoBanco = {
  etapa: "variavel",
  titulo: "Banco de dados não configurado",
  mensagem: "A variável DATABASE_URL não foi encontrada no ambiente do servidor.",
  acao: "No Vercel, conecte um banco Neon pela aba Storage ou adicione DATABASE_URL em Settings → Environment Variables. Depois, faça um Redeploy.",
};

const CODIGOS_REDE = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
]);

/** Exibe o servidor sem revelar o identificador completo do projeto. */
export function mascararHost(host: string): string {
  if (!host) return "";
  const [primeiro = "", ...resto] = host.split(".");
  const inicio = primeiro.length > 8 ? `${primeiro.slice(0, 6)}…` : primeiro;
  return [inicio, ...resto].join(".");
}

function limparMensagem(msg: string): string {
  return msg
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[URL oculta]")
    .replace(/password=\S+/gi, "password=***")
    .slice(0, 280);
}

/** O Drizzle encapsula o erro do driver em `cause` (DrizzleQueryError): percorre a cadeia. */
function errosEncadeados(e: unknown): unknown[] {
  const lista: unknown[] = [];
  let atual: unknown = e;
  for (let i = 0; i < 6 && atual; i++) {
    lista.push(atual);
    const proximo = (atual as { cause?: unknown }).cause;
    if (!proximo || proximo === atual) break;
    atual = proximo;
  }
  return lista;
}

function semVariavel(e: unknown): boolean {
  return errosEncadeados(e).some(
    (x) => x instanceof BancoNaoConfiguradoError || (x as { code?: unknown })?.code === "BANCO_NAO_CONFIGURADO",
  );
}

function codigoDe(e: unknown): string {
  for (const item of errosEncadeados(e)) {
    const c = (item as { code?: unknown } | null)?.code;
    if (typeof c === "string" && c) return c;
  }
  return "";
}

/** Mensagem do erro original (o mais interno da cadeia). */
function mensagemDe(e: unknown): string {
  const lista = errosEncadeados(e);
  const raiz = lista[lista.length - 1];
  const m = (raiz as { message?: unknown } | null)?.message;
  return typeof m === "string" && m ? m : String(raiz);
}

/** Identifica erros de configuração/conexão do banco (para mensagens claras na API). */
export function ehErroDeBanco(e: unknown): boolean {
  if (semVariavel(e)) return true;
  const codigo = codigoDe(e);
  if (codigo === "BANCO_NAO_CONFIGURADO" || CODIGOS_REDE.has(codigo)) return true;
  if (/^(08|28|3D|53|57P)/.test(codigo) || ["42501", "25006", "42P01"].includes(codigo)) return true;
  return /connection terminated|connection timeout|timeout exceeded when trying to connect|getaddrinfo|sslmode|self.signed certificate/i.test(
    mensagemDe(e),
  );
}

export function descreverErroBanco(e: unknown): DiagnosticoBanco {
  if (semVariavel(e)) return SEM_VARIAVEL;
  const codigo = codigoDe(e) || undefined;
  const mensagem = limparMensagem(mensagemDe(e));
  const base = { codigo, mensagem };

  if (codigo === "ENOTFOUND" || codigo === "EAI_AGAIN") {
    return {
      ...base,
      etapa: "conexao",
      titulo: "Servidor do banco não encontrado",
      acao: "Confira se a DATABASE_URL foi copiada inteira do Neon (o endereço termina em .neon.tech) e se o projeto Neon ainda existe.",
    };
  }
  if (codigo === "ECONNREFUSED") {
    return {
      ...base,
      etapa: "conexao",
      titulo: "Conexão recusada pelo servidor",
      acao: "A URL aponta para um servidor que não aceita conexões (por exemplo, um banco local). Use a string de conexão do Neon.",
    };
  }
  if (codigo === "28P01" || /password authentication failed/i.test(mensagem)) {
    return {
      ...base,
      etapa: "conexao",
      titulo: "Usuário ou senha do banco incorretos",
      acao: "Copie novamente a string de conexão no Neon (botão Connect) ou redefina a senha da role e atualize a DATABASE_URL no Vercel.",
    };
  }
  if (codigo === "28000") {
    return {
      ...base,
      etapa: "conexao",
      titulo: "Acesso negado pelo banco",
      acao: "Confira o usuário (role) informado na URL de conexão do Neon.",
    };
  }
  if (codigo === "3D000") {
    return {
      ...base,
      etapa: "conexao",
      titulo: "Banco de dados inexistente",
      acao: "Confira o nome do banco no fim da URL (normalmente /neondb).",
    };
  }
  if (/endpoint.*(disabled|suspended)|quota|compute time|exceeded the/i.test(mensagem)) {
    return {
      ...base,
      etapa: "conexao",
      titulo: "Banco Neon suspenso ou sem cota",
      acao: "Abra o painel do Neon e verifique o status e o consumo do projeto.",
    };
  }
  if (/ssl|certificate|insecure/i.test(mensagem)) {
    return {
      ...base,
      etapa: "conexao",
      titulo: "Conexão segura (SSL) exigida",
      acao: "Inclua ?sslmode=require no fim da DATABASE_URL.",
    };
  }
  if (codigo === "ETIMEDOUT" || codigo === "ECONNRESET" || /timeout|timed out/i.test(mensagem)) {
    return {
      ...base,
      etapa: "conexao",
      titulo: "Tempo de conexão esgotado",
      acao: "Verifique no painel do Neon se o projeto está ativo e tente novamente em alguns segundos.",
    };
  }
  if (codigo === "42501" || codigo === "25006") {
    return {
      ...base,
      etapa: "tabelas",
      titulo: "Sem permissão para criar as tabelas",
      acao: "Use na DATABASE_URL a role proprietária do banco (owner) ou execute o script SQL do guia no SQL Editor do Neon.",
    };
  }
  if (codigo === "42P01") {
    return {
      ...base,
      etapa: "tabelas",
      titulo: "Tabelas do sistema não encontradas",
      acao: "Recarregue a página para criá-las automaticamente ou execute o script SQL do guia no SQL Editor do Neon.",
    };
  }
  if (codigo && /^(08|53|57P)/.test(codigo)) {
    return {
      ...base,
      etapa: "conexao",
      titulo: "Banco de dados indisponível no momento",
      acao: "Aguarde alguns segundos e tente novamente. Se persistir, verifique o status do projeto no Neon.",
    };
  }
  return {
    ...base,
    etapa: "conexao",
    titulo: "Falha ao acessar o banco de dados",
    acao: "Confira a DATABASE_URL no Vercel e os logs da função (Vercel → Logs).",
  };
}

let cacheOk: { ate: number; status: StatusBancoOk } | null = null;

/**
 * Confere variável, conexão e tabelas (criadas automaticamente na primeira consulta).
 * Nunca lança erro: devolve um diagnóstico para exibir na tela.
 */
export async function verificarBanco(): Promise<StatusBanco> {
  if (cacheOk && cacheOk.ate > Date.now()) return cacheOk.status;

  const conexao = lerConexao();
  if (!conexao) return { ok: false, ...SEM_VARIAVEL };

  let host = "";
  try {
    const u = new URL(conexao.url);
    host = u.hostname;
    if (!/^postgres(ql)?:$/i.test(u.protocol)) {
      return {
        ok: false,
        variavel: conexao.variavel,
        etapa: "variavel",
        titulo: "URL de conexão em formato inválido",
        mensagem: `O valor de ${conexao.variavel} não começa com postgresql://.`,
        acao: "Cole a string de conexão do Neon completa, começando com postgresql:// (sem aspas e sem o comando psql). Depois, faça um Redeploy.",
      };
    }
  } catch {
    return {
      ok: false,
      variavel: conexao.variavel,
      etapa: "variavel",
      titulo: "URL de conexão inválida",
      mensagem: `Não foi possível interpretar o valor de ${conexao.variavel}.`,
      acao: "Cole a string de conexão do Neon completa, exatamente como aparece no botão Connect (sem aspas). Depois, faça um Redeploy.",
    };
  }

  if (process.env.VERCEL && /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?)$/i.test(host)) {
    return {
      ok: false,
      variavel: conexao.variavel,
      host,
      etapa: "variavel",
      titulo: "A URL aponta para um banco local",
      mensagem: `${conexao.variavel} usa ${host}, endereço que não existe nos servidores do Vercel.`,
      acao: "Substitua pela string de conexão do Neon (termina em .neon.tech) e faça um Redeploy.",
    };
  }

  try {
    await db.execute(sql`select 1`);
    const status: StatusBancoOk = { ok: true, variavel: conexao.variavel, host: mascararHost(host) };
    cacheOk = { ate: Date.now() + 60_000, status };
    return status;
  } catch (e) {
    console.error("[banco] verificação falhou:", e);
    return { ok: false, variavel: conexao.variavel, host: mascararHost(host), ...descreverErroBanco(e) };
  }
}
