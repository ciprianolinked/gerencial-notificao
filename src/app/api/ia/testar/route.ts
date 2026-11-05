import { NextResponse } from "next/server";
import { erroDeExcecao } from "@/lib/api";
import { getIaConfig } from "@/lib/config";
import { chamarGemini } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const cfg = await getIaConfig();
    const resposta = await chamarGemini({
      parts: [{ text: "Responda somente com a palavra: OK" }],
      temperature: 0,
    });
    return NextResponse.json({ ok: true, modelo: cfg.model, resposta: resposta.slice(0, 40) });
  } catch (e) {
    return erroDeExcecao(e);
  }
}
