import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { condominioDocumentos, condominios, documentosEmitidos } from "@/db/schema";
import { CondominioForm } from "@/components/CondominioForm";
import { DocumentosManager } from "@/components/DocumentosManager";
import { Hero } from "@/components/Hero";
import { TipoBadge } from "@/components/TipoBadge";
import { ehUuid } from "@/lib/api";
import { getIaConfig } from "@/lib/config";
import { dataCurta } from "@/lib/format";
import { SEGMENTOS, isTipo } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Condomínio · Gerencial" };

export default async function CondominioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ehUuid(id)) notFound();

  const [condo] = await db
    .select({
      id: condominios.id,
      nome: condominios.nome,
      cnpj: condominios.cnpj,
      endereco: condominios.endereco,
      cidade: condominios.cidade,
      uf: condominios.uf,
      sindico: condominios.sindico,
      gestor: condominios.gestor,
      observacoes: condominios.observacoes,
      logoMime: condominios.logoMime,
      logoEm: condominios.logoEm,
    })
    .from(condominios)
    .where(eq(condominios.id, id))
    .limit(1);
  if (!condo) notFound();

  const [docs, emitidos, ia] = await Promise.all([
    db
      .select({
        id: condominioDocumentos.id,
        nome: condominioDocumentos.nome,
        categoria: condominioDocumentos.categoria,
        tamanho: condominioDocumentos.tamanho,
        status: condominioDocumentos.status,
        aviso: condominioDocumentos.aviso,
        caracteres: sql<number>`length(${condominioDocumentos.texto})`.mapWith(Number),
        criadoEm: condominioDocumentos.criadoEm,
      })
      .from(condominioDocumentos)
      .where(eq(condominioDocumentos.condominioId, id))
      .orderBy(desc(condominioDocumentos.criadoEm)),
    db
      .select({
        id: documentosEmitidos.id,
        tipo: documentosEmitidos.tipo,
        numero: documentosEmitidos.numero,
        assunto: documentosEmitidos.assunto,
        atualizadoEm: documentosEmitidos.atualizadoEm,
      })
      .from(documentosEmitidos)
      .where(eq(documentosEmitidos.condominioId, id))
      .orderBy(desc(documentosEmitidos.atualizadoEm))
      .limit(30),
    getIaConfig(),
  ]);

  return (
    <>
      <Hero
        compact
        eyebrow="Condomínio"
        titulo={condo.nome}
        texto={`${condo.cnpj ? `CNPJ ${condo.cnpj} · ` : ""}${condo.cidade ?? "Cidade não informada"}${
          condo.uf ? `/${condo.uf}` : ""
        }. Envie a documentação abaixo para a IA fundamentar os textos deste condomínio.`}
        actions={
          <>
            {(["notificacao", "multa", "comunicado"] as const).map((t) => (
              <Link
                key={t}
                href={`/${SEGMENTOS[t].slug}`}
                className="btn border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                Nova {SEGMENTOS[t].nome.toLowerCase()}
              </Link>
            ))}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5">
          <section className="card p-4 sm:p-5">
            <h2 className="font-display text-[18px] text-ink">Documentação do condomínio</h2>
            <p className="mb-4 text-[12px] text-slate-500">
              Convenção, regimento interno, atas e demais regras usadas pela IA ({docs.length}{" "}
              arquivo(s)).
            </p>
            <DocumentosManager
              condominioId={id}
              iaAtiva={!!ia.apiKey}
              docs={docs.map((d) => ({ ...d, criadoEm: d.criadoEm.toISOString() }))}
            />
          </section>
        </div>

        <div className="space-y-5">
          <section className="card p-4 sm:p-5">
            <h2 className="font-display mb-3 text-[18px] text-ink">Dados do condomínio</h2>
            <CondominioForm
              id={id}
              logoUrl={
                condo.logoMime
                  ? `/api/condominios/${id}/logo?v=${condo.logoEm?.getTime() ?? 0}`
                  : null
              }
              inicial={{
                nome: condo.nome,
                cnpj: condo.cnpj ?? "",
                endereco: condo.endereco ?? "",
                cidade: condo.cidade ?? "",
                uf: condo.uf ?? "",
                sindico: condo.sindico ?? "",
                gestor: condo.gestor ?? "",
                observacoes: condo.observacoes ?? "",
              }}
            />
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h2 className="font-display text-[18px] text-ink">Documentos elaborados</h2>
            </div>
            {emitidos.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12.5px] text-slate-500">
                Nenhuma notificação, multa ou comunicado para este condomínio ainda.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {emitidos
                  .filter((e) => isTipo(e.tipo))
                  .map((e) => {
                    const t = e.tipo as "notificacao" | "multa" | "comunicado";
                    return (
                      <li key={e.id}>
                        <Link
                          href={`/${SEGMENTOS[t].slug}?id=${e.id}`}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-brand-soft/40"
                        >
                          <TipoBadge tipo={t} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-mono text-[10.5px] font-bold text-slate-600">
                              {e.numero}
                            </span>
                            <span className="block truncate text-[12px] text-ink">{e.assunto}</span>
                          </span>
                          <span className="text-[11px] text-slate-400">{dataCurta(e.atualizadoEm)}</span>
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
