import { NextResponse } from "next/server";
import { erro, erroDeExcecao } from "@/lib/api";
import { consultarCnpj } from "@/lib/cnpj";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const cnpj = typeof body?.cnpj === "string" ? body.cnpj : "";
    if (!cnpj.trim()) return erro("Informe o CNPJ.");
    const resultado = await consultarCnpj(cnpj);
    return NextResponse.json(resultado);
  } catch (e) {
    return erroDeExcecao(e);
  }
}
