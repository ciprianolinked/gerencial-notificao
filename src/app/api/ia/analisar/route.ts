import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { condominioDocumentos, condominios } from "@/db/schema";
import { ehUuid, erro, erroDeExcecao } from "@/lib/api";
import { dataPorExtenso } from "@/lib/format";
import { buscarHistorico } from "@/lib/historico";
import { analisarViabilidade } from "@/lib/ia-analise";
import { modeloFabrica } from "@/lib/modelos";
import { assuntoDe, destinatarioDe, isTipo, sanitizeDoc, unidadeDe } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || !isTipo(body.tipo)) return erro("Tipo de documento inválido.");
    const tipo = body.tipo;
    if (tipo === "comunicado") return erro("A análise de multa/reincidência vale para notificações e multas.");

    const hoje = dataPorExtenso();
    const doc = sanitizeDoc(body.doc, modeloFabrica(tipo, hoje));
    const unidade =
      (typeof body.unidade === "string" && body.unidade.trim()) || unidadeDe(doc);
    if (!unidade.trim()) return erro("Informe a unidade para analisar o histórico e a reincidência.");

    const destinatario =
      (typeof body.destinatario === "string" && body.destinatario.trim()) || destinatarioDe(doc);
    const assunto =
      (typeof body.assunto === "string" && body.assunto.trim()) || assuntoDe(doc);

    const condominioId = typeof body.condominioId === "string" ? body.condominioId : "";
    if (!ehUuid(condominioId)) {
      return erro("Selecione o condomínio para analisar o regulamento e o histórico.");
    }

    const [condominio] = await db
      .select({
        nome: condominios.nome,
        cnpj: condominios.cnpj,
        endereco: condominios.endereco,
        cidade: condominios.cidade,
        uf: condominios.uf,
        sindico: condominios.sindico,
        gestor: condominios.gestor,
      })
      .from(condominios)
      .where(eq(condominios.id, condominioId))
      .limit(1);
    if (!condominio) return erro("Condomínio não encontrado.", 404);

    const [docs, historico] = await Promise.all([
      db
        .select({
          nome: condominioDocumentos.nome,
          categoria: condominioDocumentos.categoria,
          texto: condominioDocumentos.texto,
        })
        .from(condominioDocumentos)
        .where(
          and(
            eq(condominioDocumentos.condominioId, condominioId),
            inArray(condominioDocumentos.status, ["ok"]),
          ),
        )
        .orderBy(desc(condominioDocumentos.criadoEm)),
      buscarHistorico(
        condominioId,
        unidade,
        typeof body.docId === "string" && ehUuid(body.docId) ? body.docId : null,
      ),
    ]);

    const { analise, documentosUsados } = await analisarViabilidade({
      tipo,
      condominio,
      docs: docs.filter((d) => d.texto.trim().length > 0),
      historico,
      unidade,
      destinatario,
      assunto,
      doc,
      briefing: typeof body.briefing === "string" ? body.briefing.slice(0, 8000) : "",
      hoje,
    });

    return NextResponse.json({ analise, historico, documentosUsados });
  } catch (e) {
    return erroDeExcecao(e);
  }
}
