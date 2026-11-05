import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { documentosEmitidos } from "@/db/schema";
import { dataCurta } from "./format";
import { modeloFabrica } from "./modelos";
import type { DocData } from "./types";
import { destinatarioDe, mesmaUnidade, sanitizeDoc, unidadeDe } from "./types";

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
};

/** Notificações e multas já registradas para a mesma unidade do condomínio. */
export async function buscarHistorico(
  condominioId: string,
  unidade: string,
  excluirId?: string | null,
): Promise<HistoricoItem[]> {
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
    .limit(120);

  const itens: HistoricoItem[] = [];
  for (const r of rows) {
    if (r.tipo !== "notificacao" && r.tipo !== "multa") continue;
    if (excluirId && r.id === excluirId) continue;
    const d: DocData = sanitizeDoc(r.dados, modeloFabrica(r.tipo, ""));
    const unid = unidadeDe(d);
    if (!mesmaUnidade(unid, unidade)) continue;
    itens.push({
      id: r.id,
      tipo: r.tipo,
      numero: r.numero,
      status: r.status,
      data: dataCurta(r.criadoEm),
      unidade: unid,
      destinatario: destinatarioDe(d),
      assunto: r.assunto,
      valor: d.destaque.ativo ? d.destaque.value : "",
      resumo: d.corpo.replace(/\s+/g, " ").slice(0, 900),
    });
    if (itens.length >= 30) break;
  }
  return itens;
}

export function historicoParaPrompt(itens: HistoricoItem[]): string {
  if (itens.length === 0) return "";
  return itens
    .map((h) =>
      [
        `- ${h.tipo === "multa" ? "MULTA" : "NOTIFICAÇÃO"} ${h.numero} · criada em ${h.data} · status: ${h.status}`,
        `  Unidade: ${h.unidade || "não identificada"}${h.destinatario ? ` · Destinatário: ${h.destinatario}` : ""}`,
        `  Assunto: ${h.assunto}${h.valor ? ` · Valor: ${h.valor}` : ""}`,
        h.resumo ? `  Trecho: ${h.resumo}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
}
