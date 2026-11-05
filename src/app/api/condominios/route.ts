import { NextResponse } from "next/server";
import { db } from "@/db";
import { condominios } from "@/db/schema";
import { erro, erroDeExcecao, texto } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const nome = texto(body?.nome, 200);
    if (!nome) return erro("Informe o nome do condomínio.");

    const [novo] = await db
      .insert(condominios)
      .values({
        nome,
        cnpj: texto(body?.cnpj, 30),
        endereco: texto(body?.endereco, 300),
        cidade: texto(body?.cidade, 100),
        uf: texto(body?.uf, 2)?.toUpperCase() ?? null,
        sindico: texto(body?.sindico, 150),
        gestor: texto(body?.gestor, 150),
        observacoes: texto(body?.observacoes, 2000),
      })
      .returning({ id: condominios.id });

    return NextResponse.json({ id: novo.id }, { status: 201 });
  } catch (e) {
    return erroDeExcecao(e);
  }
}
