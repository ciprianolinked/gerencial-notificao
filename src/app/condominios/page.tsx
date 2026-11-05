import type { Metadata } from "next";
import Link from "next/link";
import { count, sql } from "drizzle-orm";
import { db } from "@/db";
import { condominioDocumentos, condominios, documentosEmitidos } from "@/db/schema";
import { BancoIndisponivel } from "@/components/BancoIndisponivel";
import { Hero } from "@/components/Hero";
import { NovoCondominio } from "@/components/NovoCondominio";
import { verificarBanco } from "@/lib/banco";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Condomínios · Gerencial" };

export default async function CondominiosPage() {
  const banco = await verificarBanco();
  if (!banco.ok) return <BancoIndisponivel status={banco} />;

  const [lista, docs, emitidos] = await Promise.all([
    db
      .select({
        id: condominios.id,
        nome: condominios.nome,
        cnpj: condominios.cnpj,
        cidade: condominios.cidade,
        uf: condominios.uf,
        sindico: condominios.sindico,
        logoMime: condominios.logoMime,
      })
      .from(condominios)
      .orderBy(condominios.nome),
    db
      .select({
        id: condominioDocumentos.condominioId,
        n: count(),
        lidos: sql<number>`count(*) filter (where length(${condominioDocumentos.texto}) > 0)`.mapWith(Number),
      })
      .from(condominioDocumentos)
      .groupBy(condominioDocumentos.condominioId),
    db
      .select({ id: documentosEmitidos.condominioId, n: count() })
      .from(documentosEmitidos)
      .groupBy(documentosEmitidos.condominioId),
  ]);

  const docsPor = new Map(docs.map((d) => [d.id, d]));
  const emitidosPor = new Map(emitidos.map((d) => [d.id, d.n]));

  return (
    <>
      <Hero
        compact
        eyebrow="Governança condominial · carteira"
        titulo="Condomínios e documentação."
        texto="Cada condomínio tem a sua própria documentação guardada no banco de dados. A IA lê esses arquivos para fundamentar notificações, multas e comunicados."
      />
      <NovoCondominio aberto={lista.length === 0} />

      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-display text-[18px] text-ink">Carteira de condomínios</h2>
          <p className="text-[12px] text-slate-500">{lista.length} condomínio(s) cadastrado(s)</p>
        </div>
        {lista.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-slate-500">
            Nenhum condomínio cadastrado. Use o formulário acima para começar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-white text-left">
                  {["Condomínio", "CNPJ", "Cidade", "Documentação", "Docs. elaborados", ""].map((h) => (
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
                {lista.map((c) => {
                  const d = docsPor.get(c.id);
                  return (
                    <tr key={c.id} className="group transition hover:bg-brand-soft/40">
                      <td className="border-b border-line px-3 py-2.5">
                        <Link href={`/condominios/${c.id}`} className="block">
                          <span className="block font-bold text-ink group-hover:text-brand-dark">{c.nome}</span>
                          <span className="block text-[11px] text-slate-500">
                            {c.sindico ? `Síndico(a): ${c.sindico}` : "Síndico(a) não informado"}
                          </span>
                        </Link>
                      </td>
                      <td className="border-b border-line px-3 py-2.5 font-mono text-[11px] text-slate-600">
                        {c.cnpj ?? "—"}
                      </td>
                      <td className="border-b border-line px-3 py-2.5 text-slate-600">
                        {c.cidade ? `${c.cidade}${c.uf ? `/${c.uf}` : ""}` : "—"}
                      </td>
                      <td className="border-b border-line px-3 py-2.5">
                        {d ? (
                          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10.5px] font-bold text-success">
                            {d.n} arquivo(s) · {d.lidos} lido(s)
                          </span>
                        ) : (
                          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10.5px] font-bold text-brand-dark">
                            Sem documentos
                          </span>
                        )}
                      </td>
                      <td className="border-b border-line px-3 py-2.5 text-slate-600">
                        {emitidosPor.get(c.id) ?? 0}
                      </td>
                      <td className="border-b border-line px-3 py-2.5 text-right">
                        <Link href={`/condominios/${c.id}`} className="btn btn-ghost btn-sm">
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
