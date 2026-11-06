import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { documentosEmitidos } from "@/db/schema";
import { dataCurta } from "./format";
import { modeloFabrica } from "./modelos";
import { normalizarDocumento } from "./padrao-documento";
import type { DocData } from "./types";
import { assuntoDe, destinatarioDe, mesmaUnidade, mesmoAssunto, sanitizeDoc, unidadeDe } from "./types";

export type HistoricoItem = {
  id: string;
  tipo: "notificacao" | "multa";
  numero: string;
  status: string;
  data: string;
  unidade: string;
  destinatario: string;
  assunto: string;
  valor: string;
  resumo: string;
  mesmoAssunto: boolean;
};

export type BuscaHistorico = {
  condominioId: string;
  unidade?: string;
  assunto?: string;
  excluirId?: string | null;
};

/** Notificações e multas já registradas no condomínio, opcionalmente da mesma unidade. */
export async function buscarHistorico(opts: BuscaHistorico): Promise<HistoricoItem[]> {
  const { condominioId, unidade, assunto, excluirId } = opts;
  const assuntoAlvo = assunto?.trim() ?? "";

  const rows = await db
    .select({
      id: documentosEmitidos.id,
      tipo: documentosEmitidos.tipo,
      numero: documentosEmitidos.numero,
      status: documentosEmitidos.status,
      assunto: documentosEmitidos.assunto,
      criadoEm: documentosEmitidos.criadoEm,
      dados: documentosEmitidos.dados,
    })
    .from(documentosEmitidos)
    .where(
      and(
        eq(documentosEmitidos.condominioId, condominioId),
        inArray(documentosEmitidos.tipo, ["notificacao", "multa"]),
      ),
    )
    .orderBy(desc(documentosEmitidos.criadoEm))
    .limit(200);

  const itens: HistoricoItem[] = [];
  for (const r of rows) {
    if (r.tipo !== "notificacao" && r.tipo !== "multa") continue;
    if (excluirId && r.id === excluirId) continue;
    const d: DocData = normalizarDocumento(sanitizeDoc(r.dados, modeloFabrica(r.tipo, "")), r.tipo);
    const unid = unidadeDe(d);
    if (unidade?.trim() && !unid) continue;
    if (unidade?.trim() && !mesmaUnidade(unid, unidade)) continue;

    const assuntoItem = assuntoDe(d) || r.assunto || "";
    itens.push({
      id: r.id,
      tipo: r.tipo,
      numero: r.numero,
      status: r.status,
      data: dataCurta(r.criadoEm),
      unidade: unid,
      destinatario: destinatarioDe(d),
      assunto: assuntoItem,
      valor: d.destaque.ativo ? d.destaque.value : "",
      resumo: d.corpo.replace(/\s+/g, " ").slice(0, 900),
      mesmoAssunto: assuntoAlvo ? mesmoAssunto(`${assuntoItem} ${d.corpo.slice(0, 280)}`, assuntoAlvo) : false,
    });
    if (itens.length >= 40) break;
  }
  return itens;
}

export function historicoParaPrompt(itens: HistoricoItem[]): string {
  if (itens.length === 0) return "";
  return itens
    .map((h) =>
      [
        `- ${h.tipo === "multa" ? "MULTA" : "NOTIFICAÇÃO"} ${h.numero} · criada em ${h.data} · status: ${h.status}${
          h.mesmoAssunto ? " · [MESMO ASSUNTO]" : ""
        }`,
        `  Unidade: ${h.unidade || "não identificada"}${h.destinatario ? ` · Destinatário: ${h.destinatario}` : ""}`,
        `  Assunto: ${h.assunto}${h.valor ? ` · Valor: ${h.valor}` : ""}`,
        h.resumo ? `  Trecho: ${h.resumo}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
}
