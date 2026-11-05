import { getIaConfig } from "./config";
import { chamarGemini } from "./gemini";

export type Extracao = {
  texto: string;
  status: "ok" | "sem_texto" | "erro";
  aviso?: string;
};

const LIMITE_OCR = 18 * 1024 * 1024;

function extensao(nome: string): string {
  const i = nome.lastIndexOf(".");
  return i >= 0 ? nome.slice(i + 1).toLowerCase() : "";
}

function normalizar(texto: string): string {
  return texto
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\u0000/g, "")
    .trim();
}

/** Lê o documento com a IA (OCR), útil para PDFs escaneados e imagens. */
async function ocrComIA(buf: Buffer, mime: string): Promise<string | null> {
  const cfg = await getIaConfig();
  if (!cfg.apiKey || buf.length > LIMITE_OCR) return null;
  try {
    const texto = await chamarGemini({
      parts: [
        {
          text: "Transcreva integralmente o texto deste documento em português, preservando a numeração de capítulos, artigos, cláusulas e parágrafos. Não resuma, não comente e não adicione nada além do texto do documento.",
        },
        { inlineData: { mimeType: mime, data: buf.toString("base64") } },
      ],
      temperature: 0,
    });
    return normalizar(texto);
  } catch {
    return null;
  }
}

export async function extrairTexto(buf: Buffer, mime: string, nome: string): Promise<Extracao> {
  const ext = extensao(nome);
  const ehPdf = mime === "application/pdf" || ext === "pdf";
  const ehDocx =
    ext === "docx" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const ehImagem = mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext);
  const ehTexto =
    mime.startsWith("text/") || ["txt", "md", "csv", "html", "htm", "rtf"].includes(ext);

  try {
    if (ehPdf) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await extractText(pdf, { mergePages: true });
      const texto = normalizar(Array.isArray(text) ? text.join("\n\n") : text);
      if (texto.length >= 80) return { texto, status: "ok" };

      const ocr = await ocrComIA(buf, "application/pdf");
      if (ocr && ocr.length >= 40) {
        return { texto: ocr, status: "ok", aviso: "Texto lido por IA (documento escaneado)." };
      }
      return {
        texto,
        status: "sem_texto",
        aviso:
          "PDF sem texto selecionável (escaneado). Configure a IA e use “Reprocessar” para ler o conteúdo.",
      };
    }

    if (ehDocx) {
      const mammoth = await import("mammoth");
      const r = await mammoth.extractRawText({ buffer: buf });
      const texto = normalizar(r.value);
      return texto.length > 0
        ? { texto, status: "ok" }
        : { texto: "", status: "sem_texto", aviso: "Documento sem texto." };
    }

    if (ehTexto) {
      const texto = normalizar(buf.toString("utf8"));
      return texto.length > 0
        ? { texto, status: "ok" }
        : { texto: "", status: "sem_texto", aviso: "Arquivo vazio." };
    }

    if (ehImagem) {
      const mimeImg = mime.startsWith("image/") ? mime : `image/${ext === "jpg" ? "jpeg" : ext}`;
      const ocr = await ocrComIA(buf, mimeImg);
      if (ocr && ocr.length >= 20) {
        return { texto: ocr, status: "ok", aviso: "Texto lido por IA a partir da imagem." };
      }
      return {
        texto: "",
        status: "sem_texto",
        aviso: "Imagem armazenada. Configure a IA e use “Reprocessar” para ler o texto.",
      };
    }

    return {
      texto: "",
      status: "sem_texto",
      aviso: "Formato armazenado, mas sem leitura de texto (use PDF, DOCX, TXT ou imagem).",
    };
  } catch (e) {
    return {
      texto: "",
      status: "erro",
      aviso: `Não foi possível ler o arquivo${e instanceof Error ? `: ${e.message}` : "."}`,
    };
  }
}
