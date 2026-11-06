import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { documentosEmitidos } from "@/db/schema";
import { ehUuid, erro, erroDeExcecao } from "@/lib/api";
import { assuntoDe, proximoNumero } from "@/lib/emitidos";
import { modeloFabrica } from "@/lib/modelos";
import { normalizarDocumento } from "@/lib/padrao-documento";
import { isStatus, isTipo, sanitizeDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!ehUuid(id)) return erro("Documento não encontrado.", 404);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || !isTipo(body.tipo)) return erro("Tipo de documento inválido.");
    const tipo = body.tipo;

    const status = isStatus(body.status) ? body.status : "rascunho";
    const dados = normalizarDocumento(sanitizeDoc(body.dados, modeloFabrica(tipo, "")), tipo);
    if (!dados.numero.trim()) dados.numero = await proximoNumero(tipo);

    const condominioId =
      typeof body.condominioId === "string" && ehUuid(body.condominioId)
        ? body.condominioId
        : null;

    const [r] = await db
      .update(documentosEmitidos)
      .set({
        numero: dados.numero,
        condominioId,
        condominioNome: dados.condominio,
        assunto: assuntoDe(dados),
        status,
        enviadoEm:
          status === "enviado"
            ? sql`coalesce(${documentosEmitidos.enviadoEm}, now())`
            : null,
        dados,
        atualizadoEm: new Date(),
      })
      .where(eq(documentosEmitidos.id, id))
      .returning({ id: documentosEmitidos.id, numero: documentosEmitidos.numero });
    if (!r) return erro("Documento não encontrado.", 404);
    return NextResponse.json(r);
  } catch (e) {
    return erroDeExcecao(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!ehUuid(id)) return erro("Documento não encontrado.", 404);
    await db.delete(documentosEmitidos).where(eq(documentosEmitidos.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return erroDeExcecao(e);
  }
}

/** Atualização rápida de status (kanban / lista). */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!ehUuid(id)) return erro("Documento não encontrado.", 404);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!isStatus(body?.status)) return erro("Status inválido.");

    const [r] = await db
      .update(documentosEmitidos)
      .set({
        status: body.status,
        enviadoEm:
          body.status === "enviado"
            ? sql`coalesce(${documentosEmitidos.enviadoEm}, now())`
            : null,
        atualizadoEm: new Date(),
      })
      .where(eq(documentosEmitidos.id, id))
      .returning({ id: documentosEmitidos.id, status: documentosEmitidos.status });
    if (!r) return erro("Documento não encontrado.", 404);
    return NextResponse.json(r);
  } catch (e) {
    return erroDeExcecao(e);
  }
}
