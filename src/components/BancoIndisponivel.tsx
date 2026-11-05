import Link from "next/link";
import type { StatusBancoFalha } from "@/lib/banco";
import { Icon } from "./Icon";
import { RecarregarBotao } from "./RecarregarBotao";

const ETAPAS: Record<StatusBancoFalha["etapa"], string> = {
  variavel: "Variável de conexão",
  conexao: "Conexão com o banco",
  tabelas: "Tabelas do sistema",
};

/** Tela exibida no lugar da página quando o servidor não consegue usar o banco de dados. */
export function BancoIndisponivel({ status }: { status: StatusBancoFalha }) {
  return (
    <section className="mx-auto max-w-3xl">
      <div className="card overflow-hidden">
        <div className="relative overflow-hidden bg-ink px-5 py-6 text-white sm:px-7">
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(circle at 85% 15%, rgba(250,177,42,0.55) 0, transparent 45%)",
            }}
          />
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.18em] text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Configuração do servidor pendente
            </p>
            <h1 className="font-display mt-3 text-[26px] leading-tight sm:text-[30px]">{status.titulo}</h1>
            <p className="mt-2 max-w-[560px] text-[13.5px] leading-relaxed text-white/75">{status.mensagem}</p>
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-7">
          <div className="flex gap-3 rounded-xl border border-brand/40 bg-brand-soft px-4 py-3">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />
            <div>
              <p className="label !mb-0.5 !text-brand-dark">O que fazer</p>
              <p className="text-[13.5px] leading-relaxed text-ink">{status.acao}</p>
            </div>
          </div>

          <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
            <div className="rounded-lg bg-paper px-3 py-2">
              <dt className="label !mb-0">Etapa com problema</dt>
              <dd className="font-bold text-ink">{ETAPAS[status.etapa]}</dd>
            </div>
            <div className="rounded-lg bg-paper px-3 py-2">
              <dt className="label !mb-0">Variável lida</dt>
              <dd className="font-mono font-bold text-ink">{status.variavel ?? "nenhuma encontrada"}</dd>
            </div>
            {status.host ? (
              <div className="rounded-lg bg-paper px-3 py-2">
                <dt className="label !mb-0">Servidor</dt>
                <dd className="break-all font-mono text-ink">{status.host}</dd>
              </div>
            ) : null}
            {status.codigo ? (
              <div className="rounded-lg bg-paper px-3 py-2">
                <dt className="label !mb-0">Código técnico</dt>
                <dd className="font-mono text-ink">{status.codigo}</dd>
              </div>
            ) : null}
          </dl>

          <div className="rounded-xl border border-line p-4">
            <p className="label">Publicação com GitHub + Vercel + Neon (resumo)</p>
            <ol className="list-inside list-decimal space-y-1 text-[13px] leading-relaxed text-slate-600">
              <li>
                No Vercel, abra o projeto → <strong>Storage</strong> → conecte um banco{" "}
                <strong>Neon</strong> (cria a variável <code className="font-mono">DATABASE_URL</code>) — ou
                adicione a variável manualmente em <strong>Settings → Environment Variables</strong>.
              </li>
              <li>
                Faça um <strong>Redeploy</strong> (Deployments → ⋯ → Redeploy). Variáveis novas só valem
                para deploys novos.
              </li>
              <li>Recarregue esta página: as tabelas são criadas automaticamente no primeiro acesso.</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/guia-publicacao" className="btn btn-brand">
              <Icon name="file" className="h-4 w-4" /> Abrir guia de publicação completo
            </Link>
            <RecarregarBotao />
          </div>
          <p className="text-[11.5px] leading-relaxed text-slate-500">
            Esta tela aparece quando o servidor não consegue acessar o banco de dados. Nenhuma senha é
            exibida aqui. Depois de corrigir, recarregue a página.
          </p>
        </div>
      </div>
    </section>
  );
}
