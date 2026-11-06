import { ASSINATURA_PADRAO, FECHAMENTO_PADRAO, normalizarDocumento } from "./padrao-documento";
import type { DocData, TipoDoc } from "./types";
import { sanitizeDoc } from "./types";

const RODAPE = "Documento emitido pela administradora em nome do condomínio.";

const base = (
  hoje: string,
): Omit<
  DocData,
  "titulo" | "subtitulo" | "campos" | "destaque" | "saudacao" | "corpo" | "fechamento" | "assinaturas"
> => ({
  logoDataUrl: "",
  imagens: [],
  galeria: { titulo: "", posicao: "fim" },
  normasSolicitadas: false,
  numero: "",
  local: "[Cidade]",
  data: hoje,
  condominio: "[Nome do condomínio]",
  condominioInfo: "",
  rodape: RODAPE,
});

/** Modelos padrão de fábrica — um para cada segmento. */
export function modeloFabrica(tipo: TipoDoc, hoje: string): DocData {
  if (tipo === "notificacao") {
    return {
      ...base(hoje),
      titulo: "NOTIFICAÇÃO",
      subtitulo: "Notificação por descumprimento de norma condominial",
      campos: [
        { id: "c2", label: "Unidade", value: "[Bloco / Apartamento]" },
        { id: "c3", label: "Assunto", value: "[Resumo da infração — ex.: perturbação do sossego]" },
        { id: "c4", label: "Data da ocorrência", value: "[dd/mm/aaaa]" },
        { id: "c5", label: "Prazo para regularização", value: "05 (cinco) dias corridos" },
      ],
      destaque: { ativo: false, label: "Destaque", value: "", nota: "" },
      saudacao: "Prezado(a) condômino(a),",
      corpo: [
        "A administração do condomínio, por meio da Gerencial Governança ADM & Gestão Condominial, vem NOTIFICAR Vossa Senhoria acerca da ocorrência abaixo descrita, registrada em [data da ocorrência], envolvendo a unidade [bloco / apartamento].",
        "DOS FATOS\n[Descrever de forma objetiva o que ocorreu, quando, onde e como foi constatado — ex.: registro em livro de ocorrências, relato de moradores, imagens do circuito de segurança.]",
        "DO FUNDAMENTO\nA conduta descrita contraria o disposto no [art. __ da Convenção Condominial / art. __ do Regimento Interno], que estabelece: “[transcrever o trecho da norma]”.",
        "DA PROVIDÊNCIA\nDiante do exposto, fica Vossa Senhoria NOTIFICADO(A) para que, no prazo de 05 (cinco) dias corridos, contados do recebimento desta, faça cessar a conduta e regularize a situação, bem como, querendo, apresente defesa por escrito à administração, em observância ao contraditório e à ampla defesa.",
        "Ressaltamos que a reincidência ou o não atendimento a esta notificação poderá ensejar a aplicação das penalidades previstas na Convenção Condominial, no Regimento Interno e no Código Civil (arts. 1.336 e 1.337), sem prejuízo das demais medidas cabíveis.",
      ].join("\n\n"),
      fechamento: FECHAMENTO_PADRAO,
      assinaturas: [{ ...ASSINATURA_PADRAO }],
    };
  }

  if (tipo === "multa") {
    return {
      ...base(hoje),
      titulo: "COMUNICADO DE APLICAÇÃO DE MULTA",
      subtitulo: "Penalidade por infração às normas condominiais",
      campos: [
        { id: "c2", label: "Unidade", value: "[Bloco / Apartamento]" },
        { id: "c3", label: "Notificação anterior", value: "[Nº e data da notificação]" },
        { id: "c4", label: "Data da infração", value: "[dd/mm/aaaa]" },
        { id: "c5", label: "Infração", value: "[Descrição resumida da infração]" },
        { id: "c6", label: "Fundamento", value: "[Art. __ da Convenção / Regimento Interno]" },
        { id: "c7", label: "Reincidência", value: "[Primeira ocorrência / reincidência]" },
        { id: "c8", label: "Vencimento", value: "[dd/mm/aaaa]" },
      ],
      destaque: {
        ativo: true,
        label: "Valor da multa",
        value: "R$ [0,00]",
        nota: "[valor por extenso]",
      },
      saudacao: "Prezado(a) condômino(a),",
      corpo: [
        "Comunicamos a Vossa Senhoria que, em razão do descumprimento de norma condominial devidamente apurado, fica aplicada a penalidade de MULTA, nos termos da Convenção Condominial, do Regimento Interno e dos arts. 1.336 e 1.337 do Código Civil, conforme os dados acima.",
        "DO HISTÓRICO\nEm [data da infração], foi constatado que [descrever a infração]. Por meio da Notificação nº [número], de [data], Vossa Senhoria foi cientificado(a) da ocorrência e teve a oportunidade de apresentar defesa no prazo de [__] dias, [não tendo se manifestado / tendo a defesa apresentada sido indeferida pelos seguintes motivos: ___].",
        "DO FUNDAMENTO\nA conduta infringe o [art. __ da Convenção / Regimento Interno], que dispõe: “[transcrever o trecho da norma]”. A penalidade foi fixada em [valor ou múltiplo da taxa condominial], conforme [art. __].",
        "DA COBRANÇA\nO valor da multa será lançado no boleto da taxa condominial com vencimento em [data], ou pela forma [indicar]. Não havendo o pagamento no prazo, incidirão correção monetária, juros de mora e multa moratória previstos na Convenção e na legislação aplicável.",
        "DO RECURSO\nFica assegurado a Vossa Senhoria o direito de recorrer da penalidade, por escrito, [à administração / ao Conselho / à próxima assembleia geral], no prazo de [__] dias contados do recebimento deste comunicado, conforme [art. __ do Regimento Interno].",
      ].join("\n\n"),
      fechamento: FECHAMENTO_PADRAO,
      assinaturas: [{ ...ASSINATURA_PADRAO }],
    };
  }

  return {
    ...base(hoje),
    titulo: "COMUNICADO",
    subtitulo: "",
    campos: [
      { id: "c1", label: "Assunto", value: "[Assunto do comunicado]" },
      { id: "c3", label: "Data / horário", value: "[dd/mm/aaaa, das __h às __h]" },
    ],
    destaque: { ativo: false, label: "Destaque", value: "", nota: "" },
    saudacao: "Prezados condôminos e moradores,",
    corpo: [
      "A administração do condomínio, em conjunto com a Gerencial Governança ADM & Gestão Condominial, vem por meio deste comunicar que [descrever o aviso, evento ou mudança].",
      "INFORMAÇÕES IMPORTANTES\n• Data e horário: [__]\n• Local: [__]\n• Responsável: [__]\n• Impactos / restrições: [__]",
      "Pedimos a compreensão e a colaboração de todos para [orientação ou ação solicitada]. Em caso de dúvidas, entre em contato com a administração pelos canais de atendimento informados neste documento.",
    ].join("\n\n"),
    fechamento: FECHAMENTO_PADRAO,
    assinaturas: [{ ...ASSINATURA_PADRAO }],
  };
}

/** Une o modelo salvo ao de fábrica, preservando a data de hoje e as regras atuais. */
export function resolverModelo(
  tipo: TipoDoc,
  salvo: unknown | null | undefined,
  hoje: string,
): DocData {
  const fabrica = modeloFabrica(tipo, hoje);
  if (!salvo) return fabrica;
  const m = sanitizeDoc(salvo, fabrica);
  return normalizarDocumento({ ...m, numero: "", data: hoje }, tipo);
}
