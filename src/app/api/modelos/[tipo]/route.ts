import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { modelosPadrao } from "@/db/schema";
import { erro, erroDeExcecao } from "@/lib/api";
import { modeloFabrica } from "@/lib/modelos";
import { isTipo, sanitizeDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tipo: string }> };

/** Salva o documento atual como modelo padrão do segmento. */
export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { tipo } = await params;
    if (!isTipo(tipo)) return erro("Segmento inválido.", 404);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const dados = sanitizeDoc(body?.dados, modeloFabrica(tipo, ""));
    dados.numero = "";
    const origem = body?.origem === "importado" ? "importado" : "editor";

    await db
      .insert(modelosPadrao)
      .values({ tipo, dados, origem })
      .onConflictDoUpdate({
        target: modelosPadrao.tipo,
        set: { dados, origem, atualizadoEm: new Date() },
      });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return erroDeExcecao(e);
  }
}

/** Remove o modelo personalizado e volta ao modelo de fábrica. */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { tipo } = await params;
    if (!isTipo(tipo)) return erro("Segmento inválido.", 404);
    await db.delete(modelosPadrao).where(eq(modelosPadrao.tipo, tipo));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return erroDeExcecao(e);
  }
}
