import type { TipoDoc } from "@/lib/types";
import { SEGMENTOS } from "@/lib/types";

const CORES: Record<TipoDoc, string> = {
  notificacao: "bg-brand-soft text-brand-dark",
  multa: "bg-red-50 text-red-700",
  comunicado: "bg-success-soft text-success",
};

export function TipoBadge({ tipo }: { tipo: TipoDoc }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${CORES[tipo]}`}
    >
      {SEGMENTOS[tipo].nome}
    </span>
  );
}
