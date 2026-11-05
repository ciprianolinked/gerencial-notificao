import Link from "next/link";
import { count, desc } from "drizzle-orm";
import { db } from "@/db";
import { condominioDocumentos, condominios, documentosEmitidos } from "@/db/schema";
import { Hero } from "@/components/Hero";
import { Icon } from "@/components/Icon";
import { TipoBadge } from "@/components/TipoBadge";
import { getIaConfig } from "@/lib/config";
import { dataCurta } from "@/lib/format";
import type { TipoDoc } from "@/lib/types";
import { SEGMENTOS, TIPOS, isTipo } from "@/lib/types";

export const dynamic = "force-dynamic";

const ICONES = { notificacao: "bell", multa: "gavel", comunicado: "megaphone" } as const;

export default async function Home() {
  const [porTipo, [{ nCondos }], [{ nDocs }], recentes, ia] = await Promise.all([
    db
      .select({ tipo: documentosEmitidos.tipo, n: count() })
      .from(documentosEmitidos)
      .groupBy(documentosEmitidos.tipo),
    db.select({ nCondos: count() }).from(condominios),
    db.select({ nDocs: count() }).from(condominioDocumentos),
    db
      .select({
        id: documentosEmitidos.id,
        tipo: documentosEmitidos.tipo,
        numero: documentosEmitidos.numero,
        condominioNome: documentosEmitidos.condominioNome,
        assunto: documentosEmitidos.assunto,
        atualizadoEm: documentosEmitidos.atualizadoEm,
      })
      .from(documentosEmitidos)
      .orderBy(desc(documentosEmitidos.atualizadoEm))
      .limit(20),
    getIaConfig(),
  ]);

  const contagem: Record<TipoDoc, number> = { notificacao: 0, multa: 0, comunicado: 0 };
  for (const r of porTipo) if (isTipo(r.tipo)) contagem[r.tipo] = r.n;
  const total = contagem.notificacao + contagem.multa + contagem.comunicado;
  const ultimo = recentes.find((r) => isTipo(r.tipo));

  return (
    <>
      <Hero
        eyebrow="Governança condominial · documentos"
        titulo="Notificações, multas e comunicados com o padrão Gerencial."
        texto="Cadastre a documentação de cada condomínio, deixe a IA analisar a convenção e o regimento para redigir o texto e salve o PDF pronto para assinatura — com todos os campos editáveis."
        actions={
          <>
            <Link href="/notificacao" className="btn btn-brand">
              <Icon name="sparkles" /> Criar documento com IA
            </Link>
            <Link href="/condominios" className="btn border-white/20 bg-white/10 text-white hover:bg-white/20">
              <Icon name="building" className="h-3.5 w-3.5" /> Condomínios e documentação
            </Link>
          </>
        }
        bullets={["Modelo padrão por segmento", "Documentação no banco de dados", "PDF no padrão Gerencial"]}
        aside={
          <div className="rounded-xl border border-brand/30 bg-white/[0.07] p-4 backdrop-blur-sm">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-brand">
              Último documento elaborado
            </p>
            {ultimo && isTipo(ultimo.tipo) ? (
              <>
                <p className="mt-1 text-[15px] font-extrabold leading-tight">
                  {ultimo.condominioNome || "Sem condomínio"}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-white/60">
                  {ultimo.assunto}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white/10 px-2.5 py-2">
                    <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/50">Tipo</p>
                    <p className="text-[13px] font-extrabold">{SEGMENTOS[ultimo.tipo].nome}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 px-2.5 py-2">
                    <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/50">Protocolo</p>
                    <p className="font-mono text-[12px] font-extrabold text-brand">{ultimo.numero}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-white/50">
                  <span>{dataCurta(ultimo.atualizadoEm)}</span>
                  <Link
                    href={`/${SEGMENTOS[ultimo.tipo].slug}?id=${ultimo.id}`}
                    className="font-bold text-brand hover:underline"
                  >
                    Abrir documento →
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-[15px] font-extrabold leading-tight">Nenhum documento ainda</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-white/60">
                  Escolha um segmento abaixo para criar a primeira notificação, multa ou comunicado.
                </p>
              </>
            )}
          </div>
        }
      />

      {/* Segmentos */}
      <section className="grid gap-4 md:grid-cols-3">
        {TIPOS.map((t) => {
          const s = SEGMENTOS[t];
          return (
            <Link
              key={t}
              href={`/${s.slug}`}
              className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand"
            >
              <div className="flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-brand">
                  <Icon name={ICONES[t]} className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-paper px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  {contagem[t]} salva(s)
                </span>
              </div>
              <h2 className="font-display mt-3 text-[20px] text-ink">{s.nome}</h2>
              <p className="mt-1 text-[12.5px] leading-snug text-slate-500">{s.descricao}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand-dark group-hover:underline">
                Criar {s.nome.toLowerCase()} <Icon name="arrow" className="h-3.5 w-3.5" />
              </span>
            </Link>
          );
        })}
      </section>

      {/* Indicadores */}
      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="label">Documentos elaborados</p>
          <p className="font-display text-[28px] text-ink">{total}</p>
          <p className="text-[11px] text-slate-500">
            {contagem.notificacao} notificação(ões) · {contagem.multa} multa(s) · {contagem.comunicado} comunicado(s)
          </p>
        </div>
        <div className="card p-4">
          <p className="label">Condomínios atendidos</p>
          <p className="font-display text-[28px] text-ink">{nCondos}</p>
          <p className="text-[11px] text-slate-500">Cada um com sua documentação própria</p>
        </div>
        <div className="card p-4">
          <p className="label">Documentos do condomínio</p>
          <p className="font-display text-[28px] text-ink">{nDocs}</p>
          <p className="text-[11px] text-slate-500">Convenções, regimentos e atas analisados pela IA</p>
        </div>
        <Link href="/configuracoes" className="card p-4 transition hover:border-brand">
          <p className="label">Leitura com IA</p>
          <p className={`font-display text-[28px] ${ia.apiKey ? "text-success" : "text-brand-dark"}`}>
            {ia.apiKey ? "Ativa" : "Configurar"}
          </p>
          <p className="text-[11px] text-slate-500">
            {ia.apiKey ? `Gemini conectado · ${ia.model}` : "Informe a chave gratuita do Gemini"}
          </p>
        </Link>
      </section>

      {/* Histórico */}
      <section id="documentos" className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-display text-[18px] text-ink">Documentos elaborados</h2>
            <p className="text-[12px] text-slate-500">{recentes.length} mais recente(s) · histórico por condomínio</p>
          </div>
        </div>
        {recentes.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-slate-500">
            Nada por aqui ainda. Crie uma notificação, multa ou comunicado e salve para ver o histórico.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-white text-left">
                  {["Protocolo", "Tipo", "Condomínio / assunto", "Atualizado em", ""].map((h) => (
                    <th
                      key={h}
                      className="border-b border-line px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentes
                  .filter((r) => isTipo(r.tipo))
                  .map((r) => {
                    const t = r.tipo as TipoDoc;
                    const href = `/${SEGMENTOS[t].slug}?id=${r.id}`;
                    return (
                      <tr key={r.id} className="group transition hover:bg-brand-soft/40">
                        <td className="border-b border-line px-3 py-2.5">
                          <span className="rounded-md bg-paper px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-slate-600">
                            {r.numero}
                          </span>
                        </td>
                        <td className="border-b border-line px-3 py-2.5">
                          <TipoBadge tipo={t} />
                        </td>
                        <td className="border-b border-line px-3 py-2.5">
                          <Link href={href} className="block">
                            <span className="block font-bold text-ink group-hover:text-brand-dark">
                              {r.condominioNome || "Sem condomínio"}
                            </span>
                            <span className="block max-w-[420px] truncate text-[11px] text-slate-500">
                              {r.assunto}
                            </span>
                          </Link>
                        </td>
                        <td className="border-b border-line px-3 py-2.5 text-slate-600">
                          {dataCurta(r.atualizadoEm)}
                        </td>
                        <td className="border-b border-line px-3 py-2.5 text-right">
                          <Link href={href} className="btn btn-ghost btn-sm">
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
