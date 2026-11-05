"use client";

import { useState } from "react";
import { Icon } from "./Icon";

export function CopiarBotao({ texto, claro = false }: { texto: string; claro?: boolean }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const area = document.createElement("textarea");
      area.value = texto;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition ${
        claro ? "text-brand-dark hover:bg-brand-soft" : "text-brand hover:bg-white/10"
      }`}
    >
      <Icon name={copiado ? "check" : "file"} className="h-3.5 w-3.5" />
      {copiado ? "Copiado!" : "Copiar"}
    </button>
  );
}
