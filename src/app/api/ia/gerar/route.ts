import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { condominioDocumentos, condominios } from "@/db/schema";
import { ehUuid, erro, erroDeExcecao } from "@/lib/api";
import { dataPorExtenso } from "@/lib/format";
import { buscarHistorico, historicoParaPrompt } from "@/lib/historico";
import { redigirDocumento } from "@/lib/ia";
import { modeloFabrica } from "@/lib/modelos";
import { normalizarDocumento } from "@/lib/padrao-documento";
import { assuntoDe, isTipo, sanitizeDoc, unidadeDe } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || !isTipo(body.tipo)) return erro("Tipo de documento inválido.");
    const tipo = body.tipo;
    const hoje = dataPorExtenso();

    const briefing = typeof body.briefing === "string" ? body.briefing.slice(0, 8000) : "";
    const dadosBrutos =
      body.dados && typeof body.dados === "object" ? (body.dados as Record<string, unknown>) : {};
    const dados: Record<string, string> = {};
    for (const [k, v] of Object.entries(dadosBrutos)) {
      if (typeof v === "string") dados[k] = v.slice(0, 500);
    }
    if (!briefing.trim() && !Object.values(dados).some((v) => v.trim())) {
      return erro("Descreva o caso ou preencha ao menos um dos campos para a IA redigir.");
    }

    const doc = normalizarDocumento(sanitizeDoc(body.doc, modeloFabrica(tipo, hoje)), tipo);
    const imagens = Array.isArray(body.imagens)
      ? body.imagens
          .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
          .map((x) => ({
            rotulo: typeof x.rotulo === "string" ? x.rotulo.slice(0, 20) : "",
            legendaAtual: typeof x.legendaAtual === "string" ? x.legendaAtual.slice(0, 160) : "",
          }))
          .filter((x) => x.rotulo)
          .slice(0, 6)
      : [];

    let condominio = null;
    let docs: { nome: string; categoria: string; texto: string }[] = [];
    const condominioId = typeof body.condominioId === "string" ? body.condominioId : "";
    if (condominioId && ehUuid(condominioId)) {
      const [c] = await db
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
      condominio = c ?? null;

      // documentoIds ausente = usar todos; lista vazia = nenhum documento selecionado.
      const ids = Array.isArray(body.documentoIds)
        ? body.documentoIds.filter((x): x is string => typeof x === "string" && ehUuid(x))
        : null;

      if (c && !(ids !== null && ids.length === 0)) {
        const filtro =
          ids !== null
            ? and(
                eq(condominioDocumentos.condominioId, condominioId),
                inArray(condominioDocumentos.id, ids),
              )
            : eq(condominioDocumentos.condominioId, condominioId);
        const lista = await db
          .select({
            nome: condominioDocumentos.nome,
            categoria: condominioDocumentos.categoria,
            texto: condominioDocumentos.texto,
          })
          .from(condominioDocumentos)
          .where(filtro)
          .orderBy(desc(condominioDocumentos.criadoEm));
        docs = lista.filter((d) => d.texto.trim().length > 0);
      }
    }

    // Histórico real da unidade: usado pela IA para coerência e reincidência.
    let historico = "";
    const unidade = dados.unidade?.trim() || unidadeDe(doc);
    if (condominioId && ehUuid(condominioId) && unidade && tipo !== "comunicado") {
      const itens = await buscarHistorico({
        condominioId,
        unidade,
        assunto: dados.assunto?.trim() || assuntoDe(doc),
      });
      historico = historicoParaPrompt(itens);
    }

    const { resultado, documentosUsados, permiteNormasComunicado } = await redigirDocumento({
      tipo,
      condominio,
      docs,
      briefing,
      dados,
      doc,
      hoje,
      historico,
      imagens,
    });

    return NextResponse.json({ resultado, documentosUsados, permiteNormasComunicado });
  } catch (e) {
    return erroDeExcecao(e);
  }
}
