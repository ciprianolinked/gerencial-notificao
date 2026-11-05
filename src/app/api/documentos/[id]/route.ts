import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { condominioDocumentos } from "@/db/schema";
import { ehUuid, erro, erroDeExcecao } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
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

    return new Response(new Uint8Array(doc.conteudo), {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Length": String(doc.conteudo.length),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.nome)}`,
      },
    });
  } catch (e) {
    return erroDeExcecao(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!ehUuid(id)) return erro("Documento não encontrado.", 404);
    await db.delete(condominioDocumentos).where(eq(condominioDocumentos.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return erroDeExcecao(e);
  }
}
