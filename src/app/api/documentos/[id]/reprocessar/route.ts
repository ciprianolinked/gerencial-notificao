import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { condominioDocumentos } from "@/db/schema";
import { ehUuid, erro, erroDeExcecao } from "@/lib/api";
import { extrairTexto } from "@/lib/extract";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!ehUuid(id)) return erro("Documento não encontrado.", 404);
    const [doc] = await db
      .select({
        nome: condominioDocumentos.nome,
        mimeType: condominioDocumentos.mimeType,
        conteudo: condominioDocumentos.conteudo,
      })
      .from(condominioDocumentos)
      .where(eq(condominioDocumentos.id, id))
      .limit(1);
    if (!doc) return erro("Documento não encontrado.", 404);

    const ext = await extrairTexto(doc.conteudo, doc.mimeType, doc.nome);
    await db
      .update(condominioDocumentos)
      .set({ texto: ext.texto, status: ext.status, aviso: ext.aviso ?? null })
      .where(eq(condominioDocumentos.id, id));
    return NextResponse.json({ status: ext.status, aviso: ext.aviso ?? null });
  } catch (e) {
    return erroDeExcecao(e);
  }
}
