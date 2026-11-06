import type { DocData, TipoDoc } from "./types";
import { normalizarTexto } from "./types";

export const NOME_GERENCIAL = "Gerencial Governança ADM & Gestão Condominial";
export const FECHAMENTO_PADRAO = "Atenciosamente,";
export const ASSINATURA_PADRAO = {
  id: "ass-gerencial",
  nome: NOME_GERENCIAL,
  cargo: "",
} as const;

export const CANAIS_COMUNICACAO = [
  { rotulo: "Telefones", valor: "12 32067623 / 32067683" },
  { rotulo: "Whatsapp", valor: "12 966660941", href: "https://wa.me/5512966660941" },
  { rotulo: "GroupCOM", valor: '"Fale com a Administradora"' },
  { rotulo: "Site", valor: "https://www.gerencialcond.com.br/", href: "https://www.gerencialcond.com.br/" },
] as const;

/** Apenas a primeira palavra em maiúscula: "Uso Indevido DA Vaga" → "Uso indevido da vaga". */
export function assuntoEmCaixaDeFrase(valor: string): string {
  const texto = valor.replace(/\s+/g, " ").trim();
  const i = texto.search(/\p{L}/u);
  if (i < 0) return texto;
  return (
    texto.slice(0, i) +
    texto.charAt(i).toLocaleUpperCase("pt-BR") +
    texto.slice(i + 1).toLocaleLowerCase("pt-BR")
  );
}

const DESPEDIDA_LINHA =
  /^(?:\*{0,2})(?:atenciosamente|cordialmente|respeitosamente|cumprimentos|sauda[cç][oõ]es|at\.?te\.?|att\.?|grat[oa](?:\(a\))?|muito obrigad[oa](?:\(a\))?|obrigad[oa](?:\(a\))?|sem mais(?: para o momento)?|agradecemos desde j[aá]|agradecemos a (?:aten[cç][aã]o|compreens[aã]o))(?:\*{0,2})[,;.!…\s]*$/i;

/** Remove despedidas no fim do corpo; o fechamento fixo é renderizado separado. */
export function retirarDespedidaFinal(corpo: string): string {
  const linhas = corpo.replace(/\r/g, "").split("\n");
  while (linhas.length) {
    const ultima = linhas[linhas.length - 1].trim();
    if (!ultima) {
      linhas.pop();
      continue;
    }
    if (DESPEDIDA_LINHA.test(ultima)) {
      linhas.pop();
      continue;
    }
    // Despedida na mesma linha final, depois de um ponto final.
    const semDespedida = ultima.replace(
      /(?<=[.!?])\s+(?:atenciosamente|cordialmente|respeitosamente|at\.?te\.?|att\.?)[,;.!…\s]*$/i,
      "",
    );
    if (semDespedida !== ultima) {
      linhas[linhas.length - 1] = semDespedida;
      continue;
    }
    break;
  }
  return linhas.join("\n").trim();
}

const TERMO_NORMATIVO =
  /\b(regulamentos?|convenc(?:ao|oes)|regimentos?|atas?|normas?|artigos?|art\.?|clausulas?|codigo civil|legislacao|leis?|documentos?)\b/;

/** Para frases, preserva espaços (diferente de normalizarTexto, usado em rótulos). */
function semAcentos(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function mencionaNorma(texto: string): boolean {
  return TERMO_NORMATIVO.test(semAcentos(texto));
}

/** Detecta pedido afirmativo do usuário para citar/incluir normas ou documentos. */
export function pedidoExplicitoDeNormas(...textos: string[]): boolean {
  const acao =
    /\b(cit\w*|mencion\w*|inclu\w*|insir\w*|coloqu\w*|transcrev\w*|fundament\w*|inform\w*|usar|utiliz\w*|basead\w*|conforme|segundo|com base)\b/;
  const negacao = /\b(nao|sem|evite|evitar|dispense|retire|remova|exclua|nunca|proibido)\b/;
  return textos.some((texto) =>
    semAcentos(texto)
      .split(/[.!?\n;]+/)
      .some((frase) => mencionaNorma(frase) && acao.test(frase) && !negacao.test(frase)),
  );
}

/** Remove citações normativas preservando o fato informativo da frase quando possível. */
function limparFraseInformativa(frase: string): string {
  let limpa = frase.replace(/\([^)]*\)/g, (trecho) => (mencionaNorma(trecho) ? "" : trecho));
  if (!mencionaNorma(limpa)) return limpa.replace(/\s+/g, " ").trim();

  // "A manutenção será dia 20, conforme o regimento." → "A manutenção será dia 20."
  limpa = limpa.replace(
    /[,;]\s*(?:conforme|segundo|nos termos|de acordo|com base|em conformidade|consoante|como previsto|em atendimento)[^.!?\n]*/gi,
    (trecho) => (mencionaNorma(trecho) ? "" : trecho),
  );
  if (!mencionaNorma(limpa)) return limpa.replace(/\s+/g, " ").trim();
  return "";
}

export function limparTextoInformativo(texto: string): string {
  return texto
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((paragrafo) => {
      const linhas = paragrafo.split("\n");
      const mantidas = linhas
        .map((linha) => {
          const limpa = linha.trim();
          if (!limpa) return "";
          // Títulos como "DO FUNDAMENTO" não aparecem em comunicados informativos.
          if (/^(?:[•\-*]\s*)?(?:do|da|dos|das)?\s*(fundamento|base legal|amparo legal|legisla[cç][aã]o)s?$/i.test(limpa)) {
            return "";
          }
          const prefixo = /^([•\-*]\s*)/.exec(limpa)?.[1] ?? "";
          const conteudo = limpa.slice(prefixo.length);
          const frases = conteudo.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [conteudo];
          const textoLimpo = frases
            .map(limparFraseInformativa)
            .filter(Boolean)
            .join(" ")
            .replace(/\s+([,.;:!?])/g, "$1")
            .trim();
          return textoLimpo ? `${prefixo}${textoLimpo}` : "";
        })
        .filter(Boolean);
      return mantidas.join("\n");
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

export type OpcoesPadrao = { permitirNormasComunicado?: boolean };

/**
 * Regras institucionais aplicadas em modelos, IA, leitura de salvos e gravação.
 * Não altera o arquivo original da logo nem as fotos anexadas.
 */
export function normalizarDocumento(
  doc: DocData,
  tipo: TipoDoc,
  opcoes: OpcoesPadrao = {},
): DocData {
  const permitirNormas =
    tipo === "comunicado" && (opcoes.permitirNormasComunicado ?? doc.normasSolicitadas === true);
  const limpar = (texto: string) =>
    tipo === "comunicado" && !permitirNormas ? limparTextoInformativo(texto) : texto;

  const campos = doc.campos
    .filter((c) => !/^destinatarios?$/.test(normalizarTexto(c.label)))
    .filter((c) => !(tipo === "comunicado" && !permitirNormas && /^(fundamento|base legal|amparo legal)$/.test(normalizarTexto(c.label))))
    .map((c) => {
      const rotulo = normalizarTexto(c.label);
      let value = limpar(c.value);
      if (/^(assunto|infracao)$/.test(rotulo)) value = assuntoEmCaixaDeFrase(value);
      return { ...c, value };
    })
    .filter((c) => c.label.trim() && (c.value.trim() || !mencionaNorma(doc.campos.find((x) => x.id === c.id)?.value ?? "")));

  const titulo = limpar(doc.titulo).trim();
  const subtituloLimpo = limpar(doc.subtitulo).trim();
  const subtitulo =
    tipo === "comunicado" &&
    normalizarTexto(subtituloLimpo) === normalizarTexto("Comunicado geral aos condôminos e moradores")
      ? ""
      : subtituloLimpo;
  return {
    ...doc,
    titulo: tipo === "comunicado" && !permitirNormas && !titulo ? "COMUNICADO" : doc.titulo,
    subtitulo,
    condominioInfo: "",
    campos,
    saudacao: limpar(doc.saudacao),
    corpo: retirarDespedidaFinal(limpar(doc.corpo)),
    fechamento: FECHAMENTO_PADRAO,
    assinaturas: [{ ...ASSINATURA_PADRAO }],
    galeria: { ...doc.galeria, posicao: "fim" },
    normasSolicitadas: permitirNormas,
  };
}
