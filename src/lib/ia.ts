import { chamarGemini, lerJson } from "./gemini";
import type { DocData, TipoDoc } from "./types";
import { SEGMENTOS, uid } from "./types";

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

const SISTEMA = `Você é redator(a) sênior da Gerencial — Governança Condominial, administradora de condomínios no Brasil. Você redige notificações, multas e comunicados formais, claros, objetivos e juridicamente prudentes, em português do Brasil.

REGRAS OBRIGATÓRIAS
1. Use SOMENTE os fatos fornecidos pelo usuário. Nunca invente nomes, datas, valores, números de artigos, números de protocolo ou fatos. Quando faltar uma informação, mantenha um marcador entre colchetes, por exemplo [data da ocorrência].
2. Fundamente o texto nos DOCUMENTOS DO CONDOMÍNIO fornecidos (Convenção, Regimento Interno, atas etc.). Cite artigo, cláusula ou item SOMENTE se ele constar nos documentos, transcrevendo ou parafraseando fielmente. Se não encontrar norma aplicável, não invente: use [art. __] e registre o ponto em "alertas".
3. Referências legais gerais (Código Civil, arts. 1.336 e 1.337; LGPD) só podem ser citadas quando pertinentes e sem alterar seu sentido.
4. Tom respeitoso, impessoal e firme, sem acusações exageradas. Em notificações e multas, assegure o contraditório e a ampla defesa e informe prazos.
5. Siga a estrutura do MODELO PADRÃO recebido (mesmos campos do quadro de identificação e mesmas seções do corpo), adaptando o conteúdo ao caso. Você pode acrescentar ou remover linhas do quadro quando necessário.
6. Em multas, preencha o valor somente se o usuário informou ou se os documentos o definem objetivamente (valor fixo ou múltiplo da taxa condominial). Caso contrário, mantenha [valor].
7. Não inclua assinaturas, local, data ou número do documento: eles são tratados pelo sistema.
8. Responda SOMENTE com JSON válido no esquema solicitado, sem comentários.`;

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
}): Promise<{ resultado: RedigirResultado; documentosUsados: string[] }> {
  const seg = SEGMENTOS[input.tipo];
  const partes = dividirOrcamento(input.docs);

  const blocoDocs = partes.length
    ? partes
        .map(
          (p) =>
            `=== DOCUMENTO: ${p.doc.nome} (${p.doc.categoria})${p.cortado ? " [trecho inicial]" : ""} ===\n${p.texto}`,
        )
        .join("\n\n")
    : "(Nenhum documento com texto foi enviado para este condomínio. Não cite artigos: use [art. __] e avise em \"alertas\".)";

  const c = input.condominio;
  const blocoCondo = c
    ? [
        `Nome: ${c.nome}`,
        c.cnpj ? `CNPJ: ${c.cnpj}` : null,
        c.endereco ? `Endereço: ${c.endereco}` : null,
        c.cidade ? `Cidade/UF: ${c.cidade}${c.uf ? `/${c.uf}` : ""}` : null,
        c.sindico ? `Síndico(a): ${c.sindico}` : null,
        c.gestor ? `Gestor(a) Gerencial: ${c.gestor}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "(condomínio não selecionado)";

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
    campos: input.doc.campos.map((x) => ({ label: x.label, value: x.value })),
    destaque: input.doc.destaque,
    saudacao: input.doc.saudacao,
    corpo: input.doc.corpo,
    fechamento: input.doc.fechamento,
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

CONDOMÍNIO
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
  "corpo": "string — parágrafos separados por linha em branco (\\n\\n); títulos de seção em maiúsculas na primeira linha do parágrafo, como no modelo",
  "fechamento": "string",
  "legendas": [{ "rotulo": "string — o mesmo rótulo da foto (ex.: FOTO 1)", "legenda": "string — legenda objetiva, até 90 caracteres, descrevendo o que se vê" }],
  "galeria": { "titulo": "string — título do bloco de fotos (ex.: Registro fotográfico); string vazia se não quiser título", "posicao": "inicio" | "fim" },
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

  return {
    resultado: {
      titulo: s(j.titulo),
      subtitulo: s(j.subtitulo),
      campos: campos && campos.length ? campos : undefined,
      destaque: dj
        ? {
            ativo: typeof dj.ativo === "boolean" ? dj.ativo : input.doc.destaque.ativo,
            label: s(dj.label) ?? input.doc.destaque.label,
            value: typeof dj.value === "string" ? dj.value : input.doc.destaque.value,
            nota: typeof dj.nota === "string" ? dj.nota : input.doc.destaque.nota,
          }
        : undefined,
      saudacao: s(j.saudacao),
      corpo: s(j.corpo),
      fechamento: s(j.fechamento),
      legendas,
      galeria: gj
        ? {
            titulo: typeof gj.titulo === "string" ? gj.titulo.slice(0, 80) : "",
            posicao: gj.posicao === "inicio" ? "inicio" : "fim",
          }
        : undefined,
      fundamentos: lista(j.fundamentos),
      alertas: lista(j.alertas),
    },
    documentosUsados: partes.map((p) => p.doc.nome),
  };
}

/** Converte o texto de um modelo enviado (PDF/DOCX/TXT) na estrutura editável do segmento. */
export async function estruturarModelo(
  tipo: TipoDoc,
  textoModelo: string,
): Promise<Partial<RedigirResultado>> {
  const seg = SEGMENTOS[tipo];
  const prompt = `Abaixo está o texto de um modelo de ${seg.nome.toLowerCase()} usado pela Gerencial. Converta-o para a estrutura JSON do editor, SEM reescrever ou resumir o conteúdo: preserve a redação original.
- Dados que mudam a cada caso (nomes, unidades, datas, valores, artigos) devem virar lacunas entre colchetes, ex.: [nome do morador].
- "campos" é o quadro de identificação (pares rótulo/valor como Destinatário, Unidade, Assunto etc.). Se o modelo não tiver quadro, crie-o a partir das informações principais.
- "corpo" contém os parágrafos, separados por linha em branco.
- Não inclua assinaturas, local, data ou número.

TEXTO DO MODELO
"""
${textoModelo.slice(0, 60_000)}
"""

Responda SOMENTE com JSON:
{ "titulo": "string", "subtitulo": "string", "campos": [{"label":"string","value":"string"}], "destaque": {"ativo": boolean, "label":"string","value":"string","nota":"string"}, "saudacao": "string", "corpo": "string", "fechamento": "string" }`;

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
  return {
    titulo: s(j.titulo),
    subtitulo: s(j.subtitulo),
    campos: campos && campos.length ? campos : undefined,
    destaque: dj
      ? {
          ativo: dj.ativo === true,
          label: s(dj.label) ?? "Destaque",
          value: typeof dj.value === "string" ? dj.value : "",
          nota: typeof dj.nota === "string" ? dj.nota : "",
        }
      : undefined,
    saudacao: s(j.saudacao),
    corpo: s(j.corpo),
    fechamento: s(j.fechamento),
  };
}
