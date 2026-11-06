import { NextResponse } from "next/server";
import { db } from "@/db";
import { documentosEmitidos } from "@/db/schema";
import { ehUuid, erro, erroDeExcecao } from "@/lib/api";
import { assuntoDe, proximoNumero } from "@/lib/emitidos";
import { modeloFabrica } from "@/lib/modelos";
import { normalizarDocumento } from "@/lib/padrao-documento";
import { isStatus, isTipo, sanitizeDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || !isTipo(body.tipo)) return erro("Tipo de documento inválido.");
    const tipo = body.tipo;

    const dados = normalizarDocumento(sanitizeDoc(body.dados, modeloFabrica(tipo, "")), tipo);
    if (!dados.numero.trim()) dados.numero = await proximoNumero(tipo);

    const status = isStatus(body.status) ? body.status : "rascunho";

    const condominioId =
      typeof body.condominioId === "string" && ehUuid(body.condominioId)
        ? body.condominioId
        : null;

    const [novo] = await db
      .insert(documentosEmitidos)
      .values({
        tipo,
        numero: dados.numero,
        condominioId,
        condominioNome: dados.condominio,
        assunto: assuntoDe(dados),
        status,
        enviadoEm: status === "enviado" ? new Date() : null,
        dados,
      })
      .returning({ id: documentosEmitidos.id, numero: documentosEmitidos.numero });

    return NextResponse.json(novo, { status: 201 });
  } catch (e) {
    return erroDeExcecao(e);
  }
}
