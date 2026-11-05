"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const semBanco = /DATABASE_URL|ECONNREFUSED|ENOTFOUND|connect|relação|relation|does not exist/i.test(
    error.message ?? "",
  );

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="card p-6">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-dark">
          Não foi possível carregar
        </p>
        <h1 className="font-display mt-3 text-[24px] text-ink">
          {semBanco ? "Banco de dados não configurado no ambiente." : "Ocorreu um erro inesperado."}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
          {semBanco
            ? "O app precisa de um PostgreSQL acessível. Defina a variável de ambiente DATABASE_URL (por exemplo, um banco Neon ou Supabase) e aplique o schema do Drizzle antes de publicar."
            : "Tente novamente. Se o problema persistir, verifique os logs do servidor."}
        </p>
        <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-paper px-3 py-2 text-[11px] leading-snug text-slate-500">
          {error.message}
        </pre>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-brand" onClick={reset}>
            Tentar novamente
          </button>
          <Link href="/" className="btn btn-ghost">
            Voltar ao painel
          </Link>
          <Link href="/configuracoes" className="btn btn-ghost">
            Configurar IA
          </Link>
        </div>
      </div>
    </div>
  );
}
