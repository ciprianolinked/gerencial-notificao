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
    ocorrenciasAnteriores: number;
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
3. Reincidência, na maioria dos regulamentos, só se configura quando o novo fato é do MESMO ASSUNTO / mesma infração da notificação ou multa anterior (ex.: novo barulho após notificação de barulho). Não trate como reincidência um registro de assunto diferente (ex.: animal vs. barulho), salvo se o regulamento disser o contrário. Itens do histórico marcados com [MESMO ASSUNTO] já foram considerados equivalentes pelo sistema.
4. Reincidência só pode ser afirmada se houver registro anterior da mesma unidade no histórico, com o mesmo assunto (ou conduta equivalente segundo o regimento). Informe o critério usado.
5. Se faltar documento ou informação, marque o requisito como "nao_identificado" e explique em "alertas". Não conclua "sim" sem fundamento documental.
6. Responda SOMENTE com JSON válido no esquema pedido, em português do Brasil, de forma objetiva.`;

export async function analisarViabilidade(input: {
  tipo: TipoDoc;
  condominio: CondominioCtx | null;
  docs: DocCtx[];
  historico: HistoricoItem[];
  unidade: string;
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
ASSUNTO / INFRAÇÃO ANALISADO: ${input.assunto?.trim() || "(não informado — infira pelo texto do documento)"}
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

TAREFA
Analise se é cabível multar esta unidade neste momento, conforme a documentação e o histórico, e se configura reincidência do MESMO ASSUNTO. Separe no resumo: (a) registros da unidade no mesmo assunto; (b) registros da unidade em assuntos diferentes.

Responda SOMENTE com JSON:
{
  "podeMultar": "sim" | "nao" | "ressalvas",
  "resumo": "string — conclusão em até 4 linhas",
  "reincidencia": {
    "reincidente": boolean,
    "ocorrenciasAnteriores": number,
    "ultimaOcorrencia": "string — número e data do registro mais recente, ou vazio",
    "criterio": "string — por que configura ou não reincidência"
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

  return {
    analise: {
      podeMultar: j.podeMultar === "sim" || j.podeMultar === "nao" ? j.podeMultar : "ressalvas",
      resumo: str(j.resumo),
      reincidencia: {
        reincidente: rj.reincidente === true,
        ocorrenciasAnteriores:
          typeof rj.ocorrenciasAnteriores === "number" && Number.isFinite(rj.ocorrenciasAnteriores)
            ? Math.max(0, Math.round(rj.ocorrenciasAnteriores))
            : input.historico.length,
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
