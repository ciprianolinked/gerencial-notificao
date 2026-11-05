import { like, max } from "drizzle-orm";
import { db } from "@/db";
import { documentosEmitidos } from "@/db/schema";
import type { TipoDoc } from "./types";
import { SEGMENTOS } from "./types";

function anoAtual(): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(
      new Date(),
    ),
  );
}

/** Próximo protocolo no formato NT-2026-0001 / MT-2026-0001 / CM-2026-0001. */
export async function proximoNumero(tipo: TipoDoc): Promise<string> {
  const prefixo = `${SEGMENTOS[tipo].prefixo}-${anoAtual()}-`;
  const [r] = await db
    .select({ ultimo: max(documentosEmitidos.numero) })
    .from(documentosEmitidos)
    .where(like(documentosEmitidos.numero, `${prefixo}%`));
  const seq = r?.ultimo ? Number(r.ultimo.slice(prefixo.length)) || 0 : 0;
  return `${prefixo}${String(seq + 1).padStart(4, "0")}`;
}

export { assuntoDe } from "./types";
