import { NextResponse } from "next/server";
import { erro, erroDeExcecao } from "@/lib/api";
import { getIaConfig } from "@/lib/config";
import { extrairTexto } from "@/lib/extract";
import { estruturarModelo } from "@/lib/ia";
import { isTipo } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Lê um arquivo de modelo (PDF, DOCX, TXT ou imagem) e devolve a estrutura editável. */
export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    if (!form) return erro("Envio inválido.");
    const tipo = String(form.get("tipo") ?? "");
    if (!isTipo(tipo)) return erro("Segmento inválido.");
    const arq = form.get("arquivo");
    if (!(arq instanceof File) || arq.size === 0) return erro("Selecione o arquivo do modelo.");
    if (arq.size > 15 * 1024 * 1024) return erro("O arquivo do modelo deve ter até 15 MB.");

    const buf = Buffer.from(await arq.arrayBuffer());
    const ext = await extrairTexto(buf, arq.type || "application/octet-stream", arq.name);
    if (ext.texto.trim().length < 20) {
      return erro(ext.aviso ?? "Não foi possível ler texto deste arquivo.", 422);
    }

    const cfg = await getIaConfig();
    if (cfg.apiKey) {
      try {
        const parcial = await estruturarModelo(tipo, ext.texto);
        return NextResponse.json({ modo: "ia", parcial });
      } catch {
        /* se a IA falhar, usa o texto bruto abaixo */
      }
    }
    return NextResponse.json({
      modo: "texto",
      parcial: { corpo: ext.texto },
      aviso:
        "Texto do arquivo carregado no corpo do documento. Configure a IA para separar automaticamente os campos.",
    });
  } catch (e) {
    return erroDeExcecao(e);
  }
}
