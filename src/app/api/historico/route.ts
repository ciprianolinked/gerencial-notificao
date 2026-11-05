import { NextResponse } from "next/server";
import { ehUuid, erro, erroDeExcecao } from "@/lib/api";
import { buscarHistorico } from "@/lib/historico";

export const dynamic = "force-dynamic";

/** Lista notificações e multas do condomínio (e da unidade, se informada) para o cartão de reincidência. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const condominioId = url.searchParams.get("condominioId") ?? "";
    if (!ehUuid(condominioId)) return erro("Selecione o condomínio.");
    const unidade = url.searchParams.get("unidade")?.trim() || undefined;
    const assunto = url.searchParams.get("assunto")?.trim() || undefined;
    const itens = await buscarHistorico({ condominioId, unidade, assunto });
    const assuntos = [...new Set(itens.map((i) => i.assunto.trim()).filter(Boolean))];
    return NextResponse.json({ itens, assuntos });
  } catch (e) {
    return erroDeExcecao(e);
  }
}
