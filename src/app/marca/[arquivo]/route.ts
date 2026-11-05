import { MARCA } from "@/lib/marca";
import type { ArquivoMarca } from "@/lib/marca";

// Gerado no build como arquivo estático (sem depender de imagens binárias no repositório).
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(MARCA).map((arquivo) => ({ arquivo }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ arquivo: string }> }) {
  const { arquivo } = await params;
  const base64 = MARCA[arquivo as ArquivoMarca];
  if (!base64) return new Response("Arquivo não encontrado", { status: 404 });

  const imagem = Buffer.from(base64, "base64");
  return new Response(new Uint8Array(imagem), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(imagem.length),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
