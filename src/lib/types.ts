export type TipoDoc = "notificacao" | "multa" | "comunicado";

export const TIPOS: TipoDoc[] = ["notificacao", "multa", "comunicado"];

export type Campo = { id: string; label: string; value: string };

export type Assinatura = { id: string; nome: string; cargo: string };
export type Destaque = { ativo: boolean; label: string; value: string; nota: string };

/** Foto anexada ao documento (comunicado, notificação ou multa). */
export type ImagemDoc = {
  id: string;
  /** data URL da imagem já reduzida (JPEG/PNG/WebP). */
  dataUrl: string;
  legenda: string;
  /** "inteira" ocupa a largura do texto; "meia" fica em coluna dupla. */
  largura: "inteira" | "meia";
};

/** Bloco de fotos: título e posição escolhidos pela IA (editáveis depois). */
export type Galeria = { titulo: string; posicao: "inicio" | "fim" };

/** Estrutura única que descreve qualquer documento (tela, banco e PDF). Tudo é editável. */
export type DocData = {
  /** Logo anexada a este documento/modelo. Vazia = usar a logo do condomínio, se houver. */
  logoDataUrl: string;
  titulo: string;
  subtitulo: string;
  numero: string;
  local: string;
  data: string;
  condominio: string;
  condominioInfo: string;
  campos: Campo[];
  destaque: Destaque;
  saudacao: string;
  corpo: string;
  fechamento: string;
  assinaturas: Assinatura[];
  rodape: string;
  /** Fotos anexadas (até 6). */
  imagens: ImagemDoc[];
  galeria: Galeria;
};

export type CampoIA = {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
};

export type SegmentoInfo = {
  tipo: TipoDoc;
  slug: string;
  nome: string;
  plural: string;
  prefixo: string;
  eyebrow: string;
  heroTitulo: string;
  heroTexto: string;
  descricao: string;
  briefingPlaceholder: string;
  camposIA: CampoIA[];
};

export const SEGMENTOS: Record<TipoDoc, SegmentoInfo> = {
  notificacao: {
    tipo: "notificacao",
    slug: "notificacao",
    nome: "Notificação",
    plural: "Notificações",
    prefixo: "NT",
    eyebrow: "Governança condominial · notificações",
    heroTitulo: "Notificação formal, com fundamento na convenção do condomínio.",
    heroTexto:
      "Descreva a ocorrência e deixe a IA analisar a Convenção e o Regimento Interno do condomínio para redigir a notificação — todos os campos continuam editáveis.",
    descricao: "Advertências e notificações por descumprimento de normas",
    briefingPlaceholder:
      "Ex.: Morador do apto 302 colocou som alto após as 22h nos dias 12 e 14. Houve 2 reclamações registradas na portaria. Primeira notificação.",
    camposIA: [
      { key: "destinatario", label: "Destinatário", placeholder: "Nome do morador / proprietário" },
      { key: "unidade", label: "Unidade", placeholder: "Bloco A · Apto 302" },
      { key: "dataOcorrencia", label: "Data da ocorrência", placeholder: "12/10/2026" },
      { key: "prazo", label: "Prazo para regularização", placeholder: "05 dias corridos" },
    ],
  },
  multa: {
    tipo: "multa",
    slug: "multa",
    nome: "Multa",
    plural: "Multas",
    prefixo: "MT",
    eyebrow: "Governança condominial · multas",
    heroTitulo: "Aplicação de multa com base legal e direito de defesa assegurado.",
    heroTexto:
      "Informe a infração e deixe a IA localizar o artigo e o valor previstos na documentação do condomínio. Revise, edite qualquer campo e salve o PDF.",
    descricao: "Penalidades pecuniárias por infração às normas condominiais",
    briefingPlaceholder:
      "Ex.: Apto 101 não regularizou o barulho após a notificação NT-2026-0004. Defesa não apresentada no prazo. Aplicar multa conforme o regimento, reincidência.",
    camposIA: [
      { key: "destinatario", label: "Destinatário", placeholder: "Nome do morador / proprietário" },
      { key: "unidade", label: "Unidade", placeholder: "Bloco B · Apto 101" },
      { key: "dataInfracao", label: "Data da infração", placeholder: "12/10/2026" },
      { key: "notificacaoAnterior", label: "Notificação anterior", placeholder: "NT-2026-0004 de 15/10/2026" },
      { key: "valor", label: "Valor da multa (se definido)", placeholder: "R$ 350,00 ou 1x a taxa condominial" },
      { key: "vencimento", label: "Vencimento", placeholder: "10/11/2026" },
    ],
  },
  comunicado: {
    tipo: "comunicado",
    slug: "comunicado",
    nome: "Comunicado",
    plural: "Comunicados",
    prefixo: "CM",
    eyebrow: "Governança condominial · comunicados",
    heroTitulo: "Comunicados claros para todos os condôminos e moradores.",
    heroTexto:
      "Avisos gerais, manutenções, assembleias e orientações: informe o assunto e a IA redige o texto no padrão Gerencial, respeitando as regras do condomínio.",
    descricao: "Avisos gerais, circulares e orientações aos condôminos",
    briefingPlaceholder:
      "Ex.: Limpeza da caixa d'água dia 20/11, das 8h às 17h, sem abastecimento de água. Orientar moradores a armazenarem água.",
    camposIA: [
      { key: "assunto", label: "Assunto", placeholder: "Limpeza da caixa d'água" },
      { key: "dataEvento", label: "Data / horário", placeholder: "20/11/2026, das 8h às 17h" },
      { key: "publico", label: "Destinatários", placeholder: "Todos os condôminos e moradores" },
    ],
  },
};

export function isTipo(v: unknown): v is TipoDoc {
  return v === "notificacao" || v === "multa" || v === "comunicado";
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const str = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);

/** Garante um DocData válido a partir de dados desconhecidos (API, banco, IA). */
export function sanitizeDoc(raw: unknown, base: DocData): DocData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const campos = Array.isArray(r.campos)
    ? r.campos
        .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
        .map((c) => ({
          id: str(c.id) || uid(),
          label: str(c.label),
          value: str(c.value),
        }))
    : base.campos;

  const assinaturas = Array.isArray(r.assinaturas)
    ? r.assinaturas
        .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
        .map((a) => ({ id: str(a.id) || uid(), nome: str(a.nome), cargo: str(a.cargo) }))
    : base.assinaturas;

  const d = (r.destaque && typeof r.destaque === "object" ? r.destaque : {}) as Record<
    string,
    unknown
  >;

  const logoRecebida = str(r.logoDataUrl, base.logoDataUrl);
  const logoDataUrl =
    logoRecebida === "" ||
    (/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(logoRecebida) &&
      logoRecebida.length <= 2_850_000)
      ? logoRecebida
      : base.logoDataUrl;

  const imagens = Array.isArray(r.imagens)
    ? r.imagens
        .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
        .map((i) => ({
          id: str(i.id) || uid(),
          dataUrl: str(i.dataUrl),
          legenda: str(i.legenda),
          largura: i.largura === "meia" ? ("meia" as const) : ("inteira" as const),
        }))
        .filter((i) => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(i.dataUrl))
        .slice(0, 6)
    : base.imagens;

  const g = (r.galeria && typeof r.galeria === "object" ? r.galeria : {}) as Record<
    string,
    unknown
  >;

  return {
    logoDataUrl,
    titulo: str(r.titulo, base.titulo),
    subtitulo: str(r.subtitulo, base.subtitulo),
    numero: str(r.numero, base.numero),
    local: str(r.local, base.local),
    data: str(r.data, base.data),
    condominio: str(r.condominio, base.condominio),
    condominioInfo: str(r.condominioInfo, base.condominioInfo),
    campos,
    destaque: {
      ativo: typeof d.ativo === "boolean" ? d.ativo : base.destaque.ativo,
      label: str(d.label, base.destaque.label),
      value: str(d.value, base.destaque.value),
      nota: str(d.nota, base.destaque.nota),
    },
    saudacao: str(r.saudacao, base.saudacao),
    corpo: str(r.corpo, base.corpo),
    fechamento: str(r.fechamento, base.fechamento),
    assinaturas,
    rodape: str(r.rodape, base.rodape),
    imagens,
    galeria: {
      titulo: str(g.titulo, base.galeria.titulo),
      posicao: g.posicao === "inicio" ? ("inicio" as const) : ("fim" as const),
    },
  };
}

/** Quantidade de trechos [entre colchetes] ainda não preenchidos. */
export function contarPendencias(doc: DocData): number {
  const textos = [
    doc.titulo,
    doc.subtitulo,
    doc.local,
    doc.data,
    doc.condominio,
    doc.condominioInfo,
    doc.saudacao,
    doc.corpo,
    doc.fechamento,
    doc.rodape,
    doc.destaque.ativo ? doc.destaque.value : "",
    doc.destaque.ativo ? doc.destaque.nota : "",
    ...doc.campos.map((c) => c.value),
    ...doc.assinaturas.map((a) => `${a.nome} ${a.cargo}`),
  ].join("\n");
  return (textos.match(/\[[^\]\n]{1,160}\]/g) ?? []).length;
}

/** Assunto resumido do documento, usado nas listagens. */
export function assuntoDe(d: DocData): string {
  const c =
    d.campos.find((x) => /assunto/i.test(x.label) && x.value.trim()) ??
    d.campos.find((x) => /infra[çc][ãa]o/i.test(x.label) && x.value.trim());
  return (c?.value || d.subtitulo || d.titulo).slice(0, 200);
}

export type StatusDoc = "rascunho" | "a_enviar" | "enviado";

export const STATUS_DOC: { id: StatusDoc; label: string; dica: string }[] = [
  { id: "rascunho", label: "Rascunho", dica: "Em elaboração, ainda não revisado" },
  { id: "a_enviar", label: "A enviar", dica: "Revisado e pronto para envio ao destinatário" },
  { id: "enviado", label: "Enviado", dica: "Já entregue / comunicado ao destinatário" },
];

export function isStatus(v: unknown): v is StatusDoc {
  return v === "rascunho" || v === "a_enviar" || v === "enviado";
}

export function statusLabel(s: string): string {
  return STATUS_DOC.find((x) => x.id === s)?.label ?? "Rascunho";
}

/** Valor de um campo do quadro cujo rótulo combina com a expressão. */
export function campoValor(doc: DocData, re: RegExp): string {
  return doc.campos.find((c) => re.test(c.label) && c.value.trim())?.value.trim() ?? "";
}

export function unidadeDe(doc: DocData): string {
  return campoValor(doc, /unidade|apartamento|apto|bloco|unid/i);
}

export function destinatarioDe(doc: DocData): string {
  return campoValor(doc, /destinat/i);
}

export function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/** Compara unidades ("Apto 302" = "Bloco A · 302"), sem confundir 30 com 302. */
export function mesmaUnidade(a: string, b: string): boolean {
  const na = normalizarTexto(a);
  const nb = normalizarTexto(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const da = a.replace(/\D/g, "");
  const db = b.replace(/\D/g, "");
  if (da || db) return !!da && da === db;
  return na.includes(nb) || nb.includes(na);
}

const STOPWORDS_ASSUNTO = new Set([
  "para",
  "pelo",
  "pela",
  "apos",
  "como",
  "este",
  "esta",
  "desse",
  "dessa",
  "condominio",
  "unidade",
  "apartamento",
  "bloco",
  "apto",
  "sobre",
  "entre",
  "depois",
  "antes",
  "infracao",
  "ocorrencia",
  "notificacao",
  "multa",
  "geral",
  "mesmo",
  "descumprimento",
  "norma",
  "condominial",
]);

/** Palavras relevantes de um assunto/infração. */
export function tokensAssunto(s: string): string[] {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS_ASSUNTO.has(w));
}

/**
 * Compara assuntos/infrações. A maioria dos regulamentos só gera multa
 * na reincidência do MESMO assunto (ex.: barulho vs. barulho).
 */
export function mesmoAssunto(a: string, b: string): boolean {
  const na = normalizarTexto(a);
  const nb = normalizarTexto(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 6 && nb.length >= 6 && (na.includes(nb) || nb.includes(na))) return true;
  const ta = tokensAssunto(a);
  const tb = new Set(tokensAssunto(b));
  if (ta.length === 0 || tb.size === 0) return false;
  return ta.some((t) => tb.has(t));
}
