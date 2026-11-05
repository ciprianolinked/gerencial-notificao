import { chamarGemini, lerJson } from "./gemini";
import { dividirOrcamento } from "./ia";
import type { CondominioCtx, DocCtx } from "./ia";
import type { HistoricoItem } from "./historico";
import { historicoParaPrompt } from "./historico";
import type { DocData, TipoDoc } from "./types";

export type SituacaoRequisito = "atendido" | "pendente" | "nao_identificado";

export type AnaliseViabilidade = {
  podeMultar: "sim" | "nao" | "ressalvas";
  resumo: string;
  reincidencia: {
    reincidente: boolean;
    reincidenteMesmoAssunto: boolean;
    ocorrenciasAnteriores: number;
    ocorrenciasMesmoAssunto: number;
    ocorrenciasOutrosAssuntos: number;
    protocolosMesmoAssunto: string[];
    ultimaOcorrencia: string;
    criterio: string;
  };
  requisitos: { item: string; situacao: SituacaoRequisito; detalhe: string }[];
  fundamentos: string[];
  alertas: string[];
  proximosPassos: string[];
  sugestoesCampos: { label: string; value: string }[];
};

const SISTEMA = `Você é analista de governança condominial da Gerencial (administradora de condomínios). Sua tarefa é verificar, com base nos DOCUMENTOS DO CONDOMÍNIO e no HISTÓRICO REAL de notificações e multas, se é cabível aplicar multa a uma unidade e se há reincidência.

REGRAS
1. Não invente normas, artigos, valores, datas nem registros. Use apenas os documentos e o histórico fornecidos.
2. Considere, quando aplicável: previsão da conduta como infração, previsão da penalidade e seu valor/critério, necessidade de notificação prévia, prazo de defesa/recurso e contraditório, competência para aplicar a penalidade (síndico, assembleia, conselho) e reincidência.
3. Reincidência só pode ser afirmada se houver registro anterior da mesma unidade no histórico, com conduta semelhante ou conforme o critério do regimento. Informe o critério usado.
4. Se faltar documento ou informação, marque o requisito como "nao_identificado" e explique em "alertas". Não conclua "sim" sem fundamento documental.
5. Responda SOMENTE com JSON válido no esquema pedido, em português do Brasil, de forma objetiva.`;

export async function analisarViabilidade(input: {
  tipo: TipoDoc;
  condominio: CondominioCtx | null;
  docs: DocCtx[];
  historico: HistoricoItem[];
  unidade: string;
  destinatario?: string;
  assunto?: string;
  doc: DocData;
  briefing: string;
  hoje: string;
}): Promise<{ analise: AnaliseViabilidade; documentosUsados: string[] }> {
  const partes = dividirOrcamento(input.docs);
  const blocoDocs = partes.length
    ? partes
        .map((p) => `=== ${p.doc.nome} (${p.doc.categoria}) ===\n${p.texto}`)
        .join("\n\n")
    : "(NENHUM documento do condomínio disponível. Não cite artigos e sinalize a impossibilidade de confirmar o fundamento.)";

  const historico = historicoParaPrompt(input.historico);
  const prompt = `${blocoDocs}

##############################
CONDOMÍNIO: ${input.condominio?.nome ?? input.doc.condominio}
UNIDADE ANALISADA: ${input.unidade}
DESTINATÁRIO: ${input.destinatario?.trim() || "(não especificado expressamente)"}
ASSUNTO / INFRAÇÃO EM ANÁLISE: ${input.assunto?.trim() || "(extrair do documento)"}
DATA DE HOJE: ${input.hoje}
DOCUMENTO EM ELABORAÇÃO: ${input.tipo === "multa" ? "MULTA" : "NOTIFICAÇÃO"}

DADOS DO DOCUMENTO EM ELABORAÇÃO
${JSON.stringify(
  {
    campos: input.doc.campos.map((c) => `${c.label}: ${c.value}`),
    destaque: input.doc.destaque.ativo ? input.doc.destaque : null,
    corpo: input.doc.corpo.slice(0, 4000),
  },
  null,
  2,
)}

RELATO COMPLEMENTAR DO USUÁRIO
${input.briefing.trim() || "(sem relato complementar)"}

HISTÓRICO REAL DA UNIDADE (notificações e multas já registradas no sistema)
${historico || "(nenhum registro anterior para esta unidade)"}

TAREFA ESPECÍFICA
1. Analise se é cabível aplicar multa à unidade neste momento, conforme o regulamento do condomínio e o histórico de ocorrências.
2. IMPORTANTE — REINCIDÊNCIA DO MESMO ASSUNTO:
   A maioria das convenções e regimentos internos de condomínio exige que a multa seja precedida de notificação prévia SOBRE A MESMA CONDUTA / MESMO ASSUNTO (ex.: barulho exige notificação prévia de barulho; vaga de garagem exige notificação prévia de vaga de garagem).
   Analise com rigor:
   - O histórico contém notificações ou multas anteriores sobre O MESMO ASSUNTO / MESMA INFRAÇÃO?
   - Quantas ocorrências anteriores foram especificamente sobre o MESMO ASSUNTO? E quantas foram sobre assuntos diferentes?
   - Liste os números de protocolo que são do mesmo assunto.
   - O regulamento deste condomínio exige reincidência específica no mesmo assunto ou reincidência genérica?
   - Se o regulamento exige reincidência no mesmo assunto e só houver ocorrências de assuntos diferentes, a aplicação de multa NÃO deve ser recomendada ou deve ser apontada com ressalvas gravíssimas.

Responda SOMENTE com JSON:
{
  "podeMultar": "sim" | "nao" | "ressalvas",
  "resumo": "string — conclusão em até 4 linhas destacando a análise do mesmo assunto",
  "reincidencia": {
    "reincidente": boolean,
    "reincidenteMesmoAssunto": boolean,
    "ocorrenciasAnteriores": number,
    "ocorrenciasMesmoAssunto": number,
    "ocorrenciasOutrosAssuntos": number,
    "protocolosMesmoAssunto": ["string — número de cada notificação/multa anterior do mesmo assunto"],
    "ultimaOcorrencia": "string — número e data do registro anterior mais relevante do mesmo assunto, ou vazio",
    "criterio": "string — explicação detalhada se houve reincidência do mesmo assunto e o que o regulamento exige"
  },
  "requisitos": [
    { "item": "string", "situacao": "atendido" | "pendente" | "nao_identificado", "detalhe": "string" }
  ],
  "fundamentos": ["string — documento e artigo/cláusula, somente se constar nos documentos"],
  "alertas": ["string"],
  "proximosPassos": ["string"],
  "sugestoesCampos": [
    { "label": "string — rótulo de campo do quadro (ex.: Notificação anterior, Reincidência, Fundamento)", "value": "string" }
  ]
}`;

  const texto = await chamarGemini({ system: SISTEMA, parts: [{ text: prompt }], json: true, temperature: 0.1 });
  const j = lerJson(texto);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const lista = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];

  const rj = j.reincidencia && typeof j.reincidencia === "object" ? (j.reincidencia as Record<string, unknown>) : {};
  const requisitos = Array.isArray(j.requisitos)
    ? j.requisitos
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map((x) => ({
          item: str(x.item),
          situacao: (["atendido", "pendente", "nao_identificado"].includes(str(x.situacao))
            ? str(x.situacao)
            : "nao_identificado") as SituacaoRequisito,
          detalhe: str(x.detalhe),
        }))
        .filter((x) => x.item)
    : [];

  const sugestoes = Array.isArray(j.sugestoesCampos)
    ? j.sugestoesCampos
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map((x) => ({ label: str(x.label), value: str(x.value) }))
        .filter((x) => x.label && x.value)
    : [];

  const ocorrenciasAnteriores =
    typeof rj.ocorrenciasAnteriores === "number" && Number.isFinite(rj.ocorrenciasAnteriores)
      ? Math.max(0, Math.round(rj.ocorrenciasAnteriores))
      : input.historico.length;

  const ocorrenciasMesmoAssunto =
    typeof rj.ocorrenciasMesmoAssunto === "number" && Number.isFinite(rj.ocorrenciasMesmoAssunto)
      ? Math.max(0, Math.round(rj.ocorrenciasMesmoAssunto))
      : rj.reincidenteMesmoAssunto === true
        ? Math.max(1, ocorrenciasAnteriores)
        : 0;

  const ocorrenciasOutrosAssuntos =
    typeof rj.ocorrenciasOutrosAssuntos === "number" && Number.isFinite(rj.ocorrenciasOutrosAssuntos)
      ? Math.max(0, Math.round(rj.ocorrenciasOutrosAssuntos))
      : Math.max(0, ocorrenciasAnteriores - ocorrenciasMesmoAssunto);

  return {
    analise: {
      podeMultar: j.podeMultar === "sim" || j.podeMultar === "nao" ? j.podeMultar : "ressalvas",
      resumo: str(j.resumo),
      reincidencia: {
        reincidente: rj.reincidente === true || ocorrenciasAnteriores > 0,
        reincidenteMesmoAssunto:
          rj.reincidenteMesmoAssunto === true || ocorrenciasMesmoAssunto > 0,
        ocorrenciasAnteriores,
        ocorrenciasMesmoAssunto,
        ocorrenciasOutrosAssuntos,
        protocolosMesmoAssunto: lista(rj.protocolosMesmoAssunto),
        ultimaOcorrencia: str(rj.ultimaOcorrencia),
        criterio: str(rj.criterio),
      },
      requisitos,
      fundamentos: lista(j.fundamentos),
      alertas: lista(j.alertas),
      proximosPassos: lista(j.proximosPassos),
      sugestoesCampos: sugestoes,
    },
    documentosUsados: partes.map((p) => p.doc.nome),
  };
}
