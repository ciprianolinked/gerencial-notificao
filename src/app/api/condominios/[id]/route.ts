import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { condominios } from "@/db/schema";
import { ehUuid, erro, erroDeExcecao, texto } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!ehUuid(id)) return erro("Condomínio não encontrado.", 404);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const nome = texto(body?.nome, 200);
    if (!nome) return erro("Informe o nome do condomínio.");

    const [r] = await db
      .update(condominios)
      .set({
        nome,
        cnpj: texto(body?.cnpj, 30),
        endereco: texto(body?.endereco, 300),
        cidade: texto(body?.cidade, 100),
        uf: texto(body?.uf, 2)?.toUpperCase() ?? null,
        sindico: texto(body?.sindico, 150),
        gestor: texto(body?.gestor, 150),
        observacoes: texto(body?.observacoes, 2000),
      })
      .where(eq(condominios.id, id))
      .returning({ id: condominios.id });
    if (!r) return erro("Condomínio não encontrado.", 404);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return erroDeExcecao(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!ehUuid(id)) return erro("Condomínio não encontrado.", 404);
    await db.delete(condominios).where(eq(condominios.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return erroDeExcecao(e);
  }
}
