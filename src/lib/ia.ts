import { chamarGemini, lerJson } from "./gemini";
import { modeloFabrica } from "./modelos";
import {
  assuntoEmCaixaDeFrase,
  limparTextoInformativo,
  normalizarDocumento,
  pedidoExplicitoDeNormas,
} from "./padrao-documento";
import type { DocData, TipoDoc } from "./types";
import { SEGMENTOS, normalizarTexto, uid } from "./types";

export type CondominioCtx = {
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  sindico: string | null;
  gestor: string | null;
};

export type DocCtx = { nome: string; categoria: string; texto: string };

export type RedigirResultado = {
  titulo?: string;
  subtitulo?: string;
  campos?: { id: string; label: string; value: string }[];
  destaque?: { ativo: boolean; label: string; value: string; nota: string };
  saudacao?: string;
  corpo?: string;
  fechamento?: string;
  legendas?: { rotulo: string; legenda: string }[];
  galeria?: { titulo: string; posicao: "inicio" | "fim" };
  fundamentos: string[];
  alertas: string[];
};

const ORCAMENTO_CARACTERES = 380_000;

/** Distribui o orçamento de texto entre os documentos (os menores entram inteiros). */
export function dividirOrcamento(docs: DocCtx[]): { doc: DocCtx; texto: string; cortado: boolean }[] {
  const ordem = docs
    .map((doc, i) => ({ doc, i }))
    .sort((a, b) => a.doc.texto.length - b.doc.texto.length);
  let restante = ORCAMENTO_CARACTERES;
  let n = ordem.length;
  const saida: { doc: DocCtx; texto: string; cortado: boolean; i: number }[] = [];
  for (const { doc, i } of ordem) {
    const cota = Math.max(2000, Math.floor(restante / Math.max(n, 1)));
    const texto = doc.texto.slice(0, cota);
    restante -= texto.length;
    n--;
    saida.push({ doc, texto, cortado: texto.length < doc.texto.length, i });
  }
  return saida.sort((a, b) => a.i - b.i);
}

const SISTEMA = `Você é redator(a) sênior da Gerencial Governança ADM & Gestão Condominial, administradora de condomínios no Brasil. Redige notificações, multas e comunicados formais, claros e objetivos em português do Brasil.

REGRAS OBRIGATÓRIAS
1. Use SOMENTE os fatos fornecidos pelo usuário. Nunca invente nomes, datas, valores, artigos, protocolos ou fatos. Informação ausente fica entre colchetes, por exemplo [data da ocorrência].
2. Siga a estrutura do MODELO PADRÃO recebido, adaptando o conteúdo ao caso. Não crie campo "Destinatário" nem "Destinatários" no quadro de identificação.
3. O valor do campo "Assunto" (e "Infração", quando existir) deve ter apenas a primeira palavra com inicial maiúscula; as demais palavras em minúsculas.
4. Em multas, preencha o valor somente se o usuário informou ou se os documentos o definem objetivamente. Caso contrário, mantenha [valor].
5. Em notificações e multas, assegure contraditório, ampla defesa e prazos.
6. NÃO escreva "Atenciosamente", "Cordialmente", "Respeitosamente", "Att.", agradecimentos de despedida ou similares no fim do corpo. O sistema insere o fechamento automaticamente.
7. Não inclua assinaturas, ciência do destinatário, canais de comunicação, local, data ou número do documento no corpo: o sistema cuida desses blocos.
8. As fotos são exibidas pelo sistema APÓS o texto. Não coloque marcadores de imagem no corpo e não sugira fotos antes do texto.
9. Responda SOMENTE com JSON válido no esquema solicitado, sem comentários.`;

export async function redigirDocumento(input: {
  tipo: TipoDoc;
  condominio: CondominioCtx | null;
  docs: DocCtx[];
  briefing: string;
  dados: Record<string, string>;
  doc: DocData;
  hoje: string;
  historico?: string;
  /** Rótulos e legendas atuais das fotos (sem o conteúdo binário). */
  imagens?: { rotulo: string; legendaAtual: string }[];
}): Promise<{ resultado: RedigirResultado; documentosUsados: string[]; permiteNormasComunicado: boolean }> {
  const seg = SEGMENTOS[input.tipo];
  const permiteNormasComunicado =
    input.tipo !== "comunicado" ||
    pedidoExplicitoDeNormas(input.briefing, ...Object.values(input.dados));
  const informativo = input.tipo === "comunicado" && !permiteNormasComunicado;
  const partes = informativo ? [] : dividirOrcamento(input.docs);

  const blocoDocs = informativo
    ? "(Comunicado exclusivamente informativo: nenhum documento normativo foi fornecido. Não mencione regulamento, convenção, regimento, atas, artigos, leis ou outros documentos.)"
    : partes.length
      ? partes
          .map(
            (p) =>
              `=== DOCUMENTO: ${p.doc.nome} (${p.doc.categoria})${p.cortado ? " [trecho inicial]" : ""} ===\n${p.texto}`,
          )
          .join("\n\n")
      : "(Nenhum documento com texto foi enviado para este condomínio. Não cite artigos: use [art. __] e avise em \"alertas\".)";

  // No documento, o bloco do condomínio mostra apenas o nome.
  const blocoCondo = input.condominio?.nome ?? "(condomínio não selecionado)";
  const regrasSegmento = informativo
    ? `MODO INFORMATIVO DO COMUNICADO
- O texto deve ser apenas informativo, com base no relato e nos dados do usuário.
- Não mencione regulamento, convenção, regimento interno, atas, artigos, cláusulas, leis, Código Civil, normas ou "documentos do condomínio".
- Não acrescente pedidos de cumprimento de normas nem fundamentos jurídicos.
- Deixe "fundamentos" vazio. Se o usuário pediu expressamente uma referência normativa, esta instrução não se aplicaria; nesse caso os documentos teriam sido fornecidos acima.`
    : `FUNDAMENTAÇÃO
- Fundamente notificações, multas ou comunicados com referências expressamente solicitadas nos documentos fornecidos.
- Cite artigo/cláusula somente se constar nos documentos; não invente. Se faltar norma, use [art. __] e registre em "alertas".
- Referências legais gerais só quando pertinentes e sem alterar seu sentido.`;

  const dadosInformados = Object.entries(input.dados)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => {
      const rotulo = seg.camposIA.find((f) => f.key === k)?.label ?? k;
      return `- ${rotulo}: ${v.trim()}`;
    })
    .join("\n");

  const modelo = {
    titulo: input.doc.titulo,
    subtitulo: input.doc.subtitulo,
    campos: input.doc.campos
      .filter((x) => !/^destinatarios?$/.test(normalizarTexto(x.label)))
      .map((x) => ({
        label: x.label,
        value: /^(assunto|infracao)$/.test(normalizarTexto(x.label))
          ? assuntoEmCaixaDeFrase(x.value)
          : x.value,
      })),
    destaque: input.doc.destaque,
    saudacao: input.doc.saudacao,
    corpo: input.doc.corpo,
  };

  const blocoFotos = (input.imagens ?? []).length
    ? (input.imagens ?? [])
        .map(
          (f) =>
            `${f.rotulo}${f.legendaAtual.trim() ? ` (legenda atual: ${f.legendaAtual.trim()})` : ""}`,
        )
        .join("\n")
    : "(nenhuma foto anexada)";

  const prompt = `${blocoDocs}

##############################
TAREFA: redigir ${seg.nome.toUpperCase()} do condomínio abaixo.
Data de hoje: ${input.hoje}

${regrasSegmento}

CONDOMÍNIO (exibir apenas o nome no documento)
${blocoCondo}

DADOS INFORMADOS PELO USUÁRIO
${dadosInformados || "(nenhum campo estruturado preenchido)"}

RELATO / INSTRUÇÕES DO USUÁRIO
${input.briefing.trim() || "(sem relato adicional — adapte o modelo com base nos dados informados e nos documentos)"}

HISTÓRICO DE NOTIFICAÇÕES E MULTAS DA UNIDADE (registros reais do sistema)
${input.historico?.trim() || "(nenhum registro anterior localizado para esta unidade)"}
Use este histórico para verificar reincidência e coerência com notificações anteriores. Não invente registros.

MODELO PADRÃO ATUAL (estrutura e estilo a seguir; os trechos [entre colchetes] são lacunas a preencher)
${JSON.stringify(modelo, null, 2)}

FOTOS ANEXADAS AO DOCUMENTO (o usuário anexou imagens que serão exibidas no documento)
${blocoFotos}

ESQUEMA DA RESPOSTA (JSON)
{
  "titulo": "string (título do documento, em maiúsculas)",
  "subtitulo": "string",
  "campos": [{ "label": "string", "value": "string" }],
  "destaque": { "ativo": boolean, "label": "string", "value": "string", "nota": "string" },
  "saudacao": "string",
  "corpo": "string — parágrafos separados por linha em branco (\\n\\n), SEM despedida final; títulos de seção em maiúsculas na primeira linha do parágrafo, como no modelo",
  "legendas": [{ "rotulo": "string — o mesmo rótulo da foto (ex.: FOTO 1)", "legenda": "string — legenda objetiva, até 90 caracteres, descrevendo o que se vê" }],
  "galeria": { "titulo": "string — título do bloco de fotos (ex.: Registro fotográfico); string vazia se não quiser título", "posicao": "fim" },
  "fundamentos": ["string — cada norma usada, no formato: Documento, art./cláusula: resumo do que estabelece"],
  "alertas": ["string — pontos que o responsável deve conferir, lacunas e informações não encontradas"]
}`;

  const texto = await chamarGemini({
    system: SISTEMA,
    parts: [{ text: prompt }],
    json: true,
    temperature: 0.3,
  });
  const j = lerJson(texto);

  const s = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);
  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const lista = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];

  const campos = Array.isArray(j.campos)
    ? j.campos
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map((x) => ({
          id: uid(),
          label: typeof x.label === "string" ? x.label : "",
          value: typeof x.value === "string" ? x.value : "",
        }))
        .filter((x) => x.label.trim())
    : undefined;

  const dj = j.destaque && typeof j.destaque === "object" ? (j.destaque as Record<string, unknown>) : null;

  const legendas = Array.isArray(j.legendas)
    ? j.legendas
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map((x) => ({
          rotulo: str(x.rotulo).toUpperCase().replace(/^FOTO\s*/, "FOTO "),
          legenda: str(x.legenda).slice(0, 120),
        }))
        .filter((x) => x.rotulo && x.legenda)
    : undefined;

  const gj = j.galeria && typeof j.galeria === "object" ? (j.galeria as Record<string, unknown>) : null;

  const destaque = dj
    ? {
        ativo: typeof dj.ativo === "boolean" ? dj.ativo : input.doc.destaque.ativo,
        label: s(dj.label) ?? input.doc.destaque.label,
        value: typeof dj.value === "string" ? dj.value : input.doc.destaque.value,
        nota: typeof dj.nota === "string" ? dj.nota : input.doc.destaque.nota,
      }
    : input.doc.destaque;

  // Rede de segurança: mesmo que o modelo devolva campos/blocos antigos,
  // o resultado aplicado ao editor já sai no padrão institucional atual.
  const normalizado = normalizarDocumento(
    {
      ...input.doc,
      titulo: s(j.titulo) ?? input.doc.titulo,
      subtitulo: s(j.subtitulo) ?? input.doc.subtitulo,
      campos: campos && campos.length ? campos : input.doc.campos,
      destaque,
      saudacao: s(j.saudacao) ?? input.doc.saudacao,
      corpo: s(j.corpo) ?? input.doc.corpo,
      normasSolicitadas: permiteNormasComunicado,
    },
    input.tipo,
    { permitirNormasComunicado: permiteNormasComunicado },
  );

  return {
    resultado: {
      titulo: normalizado.titulo,
      subtitulo: normalizado.subtitulo,
      campos: normalizado.campos,
      destaque: normalizado.destaque,
      saudacao: normalizado.saudacao,
      corpo: normalizado.corpo,
      legendas,
      galeria: {
        titulo: gj && typeof gj.titulo === "string" ? gj.titulo.slice(0, 80) : input.doc.galeria.titulo,
        posicao: "fim",
      },
      fundamentos: informativo ? [] : lista(j.fundamentos),
      alertas: informativo
        ? lista(j.alertas).map(limparTextoInformativo).filter(Boolean)
        : lista(j.alertas),
    },
    documentosUsados: partes.map((p) => p.doc.nome),
    permiteNormasComunicado,
  };
}

/** Converte o texto de um modelo enviado na estrutura editável já no padrão atual. */
export async function estruturarModelo(
  tipo: TipoDoc,
  textoModelo: string,
): Promise<Partial<RedigirResultado>> {
  const seg = SEGMENTOS[tipo];
  const prompt = `Converta o texto de um modelo de ${seg.nome.toLowerCase()} da Gerencial para JSON do editor, preservando os fatos e a redação útil.
- Dados variáveis viram lacunas entre colchetes.
- "campos" é o quadro de identificação (Unidade, Assunto, datas etc.). NÃO inclua Destinatário/Destinatários.
- Assunto/Infração: apenas a primeira palavra com inicial maiúscula.
- "corpo": parágrafos separados por linha em branco, sem despedida final.
- Não inclua assinaturas, canais, fechamento, local, data ou número.
${tipo === "comunicado" ? "- Comunicado informativo: remova menções a regulamento, convenção, regimento, atas, artigos, leis e outros documentos, salvo se o próprio texto do modelo contiver pedido expresso do usuário para mantê-los." : ""}

TEXTO DO MODELO
"""
${textoModelo.slice(0, 60_000)}
"""

Responda SOMENTE com JSON:
{ "titulo": "string", "subtitulo": "string", "campos": [{"label":"string","value":"string"}], "destaque": {"ativo": boolean, "label":"string","value":"string","nota":"string"}, "saudacao": "string", "corpo": "string" }`;

  const texto = await chamarGemini({ parts: [{ text: prompt }], json: true, temperature: 0.1 });
  const j = lerJson(texto);
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
  const campos = Array.isArray(j.campos)
    ? j.campos
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map((x) => ({
          id: uid(),
          label: typeof x.label === "string" ? x.label : "",
          value: typeof x.value === "string" ? x.value : "",
        }))
        .filter((x) => x.label.trim())
    : undefined;
  const dj = j.destaque && typeof j.destaque === "object" ? (j.destaque as Record<string, unknown>) : null;
  const base = modeloFabrica(tipo, "");
  const permitirNormas = tipo === "comunicado" && pedidoExplicitoDeNormas(textoModelo);
  const normalizado = normalizarDocumento(
    {
      ...base,
      titulo: s(j.titulo) ?? base.titulo,
      subtitulo: s(j.subtitulo) ?? base.subtitulo,
      campos: campos && campos.length ? campos : base.campos,
      destaque: dj
        ? {
            ativo: dj.ativo === true,
            label: s(dj.label) ?? "Destaque",
            value: typeof dj.value === "string" ? dj.value : "",
            nota: typeof dj.nota === "string" ? dj.nota : "",
          }
        : base.destaque,
      saudacao: s(j.saudacao) ?? base.saudacao,
      corpo: s(j.corpo) ?? base.corpo,
      normasSolicitadas: permitirNormas,
    },
    tipo,
    { permitirNormasComunicado: permitirNormas },
  );
  return {
    titulo: normalizado.titulo,
    subtitulo: normalizado.subtitulo,
    campos: normalizado.campos,
    destaque: normalizado.destaque,
    saudacao: normalizado.saudacao,
    corpo: normalizado.corpo,
  };
}
