import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { condominioDocumentos, condominios } from "@/db/schema";
import { CATEGORIAS_DOC, ehUuid, erro, erroDeExcecao } from "@/lib/api";
import { extrairTexto } from "@/lib/extract";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

const LIMITE_ARQUIVO = 25 * 1024 * 1024;

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!ehUuid(id)) return erro("Condomínio não encontrado.", 404);
    const docs = await db
      .select({
        id: condominioDocumentos.id,
        nome: condominioDocumentos.nome,
        categoria: condominioDocumentos.categoria,
        tamanho: condominioDocumentos.tamanho,
        status: condominioDocumentos.status,
        caracteres: sql<number>`length(${condominioDocumentos.texto})`.mapWith(Number),
      })
      .from(condominioDocumentos)
      .where(eq(condominioDocumentos.condominioId, id))
      .orderBy(desc(condominioDocumentos.criadoEm));
    return NextResponse.json({ documentos: docs });
  } catch (e) {
    return erroDeExcecao(e);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!ehUuid(id)) return erro("Condomínio não encontrado.", 404);

    const [condo] = await db
      .select({ id: condominios.id })
      .from(condominios)
      .where(eq(condominios.id, id))
      .limit(1);
    if (!condo) return erro("Condomínio não encontrado.", 404);

    const form = await req.formData().catch(() => null);
    if (!form) return erro("Envio inválido.");

    const catRecebida = String(form.get("categoria") ?? "");
    const categoria = (CATEGORIAS_DOC as readonly string[]).includes(catRecebida)
      ? catRecebida
      : "Outro";

    const arquivos = form.getAll("arquivos").filter((f): f is File => f instanceof File && f.size > 0);
    if (arquivos.length === 0) return erro("Selecione ao menos um arquivo.");

    const criados: { id: string; nome: string; status: string; aviso: string | null }[] = [];
    const recusados: string[] = [];

    for (const arq of arquivos) {
      if (arq.size > LIMITE_ARQUIVO) {
        recusados.push(`${arq.name} (acima de 25 MB)`);
        continue;
      }
      const buf = Buffer.from(await arq.arrayBuffer());
      const mime = arq.type || "application/octet-stream";
      const ext = await extrairTexto(buf, mime, arq.name);

      const [novo] = await db
        .insert(condominioDocumentos)
        .values({
          condominioId: id,
          nome: arq.name,
          categoria,
          mimeType: mime,
          tamanho: buf.length,
          conteudo: buf,
          texto: ext.texto,
          status: ext.status,
          aviso: ext.aviso ?? null,
        })
        .returning({ id: condominioDocumentos.id });
      criados.push({ id: novo.id, nome: arq.name, status: ext.status, aviso: ext.aviso ?? null });
    }

    return NextResponse.json({ criados, recusados }, { status: 201 });
  } catch (e) {
    return erroDeExcecao(e);
  }
}
