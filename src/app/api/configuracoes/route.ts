import { NextResponse } from "next/server";
import { erro, erroDeExcecao } from "@/lib/api";
import { gravarConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return erro("Envio inválido.");

    if (typeof body.apiKey === "string") {
      const chave = body.apiKey.trim();
      // Campo vazio mantém a chave atual; use removerChave para apagar.
      if (chave) await gravarConfig("gemini_api_key", chave.slice(0, 300));
    }
    if (body.removerChave === true) await gravarConfig("gemini_api_key", null);

    if (typeof body.model === "string") {
      const modelo = body.model.trim().slice(0, 100);
      await gravarConfig("gemini_model", modelo || null);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return erroDeExcecao(e);
  }
}
