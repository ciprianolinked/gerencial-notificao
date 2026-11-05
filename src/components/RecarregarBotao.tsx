"use client";

import { Icon } from "./Icon";

export function RecarregarBotao({ rotulo = "Tentar novamente" }: { rotulo?: string }) {
  return (
    <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>
      <Icon name="refresh" className="h-4 w-4" />
      {rotulo}
    </button>
  );
}
