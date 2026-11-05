"use client";

import { useState } from "react";
import { CondominioForm } from "./CondominioForm";
import { Icon } from "./Icon";

export function NovoCondominio({ aberto = false }: { aberto?: boolean }) {
  const [open, setOpen] = useState(aberto);
  return (
    <div className="card mb-5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[18px] text-ink">Novo condomínio</h2>
          <p className="text-[12px] text-slate-500">
            Cadastre o condomínio e envie a documentação (convenção, regimento, atas) para a IA.
          </p>
        </div>
        <button type="button" className="btn btn-brand" onClick={() => setOpen((o) => !o)}>
          <Icon name={open ? "x" : "plus"} />
          {open ? "Fechar" : "Cadastrar"}
        </button>
      </div>
      {open ? (
        <div className="mt-4 border-t border-line pt-4">
          <CondominioForm />
        </div>
      ) : null}
    </div>
  );
}
