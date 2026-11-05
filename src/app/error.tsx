"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Erro({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto max-w-2xl py-6">
      <div className="card p-5 sm:p-7">
        <p className="inline-block rounded-full bg-brand-soft px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.16em] text-brand-dark">
          Não foi possível carregar
        </p>
        <h1 className="font-display mt-3 text-[26px] leading-tight text-ink">
          Ocorreu um erro ao montar esta página.
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
          Em produção, o Next.js oculta os detalhes técnicos por segurança. As causas mais comuns após a
          publicação são o banco de dados não configurado no Vercel ou uma versão antiga do código no
          GitHub. O guia de publicação mostra o status desta instalação e como corrigir.
        </p>

        {error.digest ? (
          <div className="mt-4 rounded-lg bg-paper px-3 py-2 text-[12px]">
            <p className="label !mb-0">Código do erro (digest)</p>
            <p className="font-mono font-bold text-ink">{error.digest}</p>
            <p className="mt-1 text-slate-500">
              Para ver a causa: Vercel → seu projeto → <strong>Logs</strong> → pesquise por este código.
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/guia-publicacao" className="btn btn-brand">
            Ver status e guia de publicação
          </Link>
          <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
          <Link href="/" className="btn btn-ghost">
            Voltar ao painel
          </Link>
        </div>
      </div>
    </section>
  );
}
