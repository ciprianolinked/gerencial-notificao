import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { condominios } from "@/db/schema";
import { ehUuid, erro, erroDeExcecao } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const LIMITE = 3 * 1024 * 1024;

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!ehUuid(id)) return erro("Condomínio não encontrado.", 404);
    const [c] = await db
      .select({ logo: condominios.logo, logoMime: condominios.logoMime })
      .from(condominios)
      .where(eq(condominios.id, id))
      .limit(1);
    if (!c?.logo || !c.logoMime) return erro("Logo não encontrada.", 404);
    return new Response(new Uint8Array(c.logo), {
      headers: {
        "Content-Type": c.logoMime,
        "Content-Length": String(c.logo.length),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return erroDeExcecao(e);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!ehUuid(id)) return erro("Condomínio não encontrado.", 404);
    const form = await req.formData().catch(() => null);
    const arq = form?.get("arquivo");
    if (!(arq instanceof File) || arq.size === 0) return erro("Selecione a imagem da logo.");
    if (arq.size > LIMITE) return erro("A logo deve ter até 3 MB.");

    const buf = Buffer.from(await arq.arrayBuffer());
    const ehPng = buf.length > 8 && buf.subarray(0, 4).toString("hex") === "89504e47";
    const ehJpg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8;
    if (!ehPng && !ehJpg) {
      return erro("Envie a logo em PNG ou JPG (formato aceito também no PDF).");
    }
    const mime = ehPng ? "image/png" : "image/jpeg";
    const agora = new Date();

    const [r] = await db
      .update(condominios)
      .set({ logo: buf, logoMime: mime, logoEm: agora })
      .where(eq(condominios.id, id))
      .returning({ id: condominios.id });
    if (!r) return erro("Condomínio não encontrado.", 404);
    return NextResponse.json({ ok: true, logoUrl: `/api/condominios/${id}/logo?v=${agora.getTime()}` });
  } catch (e) {
    return erroDeExcecao(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!ehUuid(id)) return erro("Condomínio não encontrado.", 404);
    await db
      .update(condominios)
      .set({ logo: null, logoMime: null, logoEm: null })
      .where(eq(condominios.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return erroDeExcecao(e);
  }
}
