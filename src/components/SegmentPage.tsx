import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { condominioDocumentos, condominios, documentosEmitidos, modelosPadrao } from "@/db/schema";
import { ehUuid } from "@/lib/api";
import { verificarBanco } from "@/lib/banco";
import { getIaConfig } from "@/lib/config";
import { BancoIndisponivel } from "./BancoIndisponivel";
import { dataPorExtenso } from "@/lib/format";
import { modeloFabrica, resolverModelo } from "@/lib/modelos";
import { normalizarDocumento } from "@/lib/padrao-documento";
import type { StatusDoc, TipoDoc } from "@/lib/types";
import { SEGMENTOS, assuntoDe, isStatus, sanitizeDoc, unidadeDe } from "@/lib/types";
import { Hero } from "./Hero";
import { SegmentWorkspace } from "./SegmentWorkspace";
import type { SalvoItem } from "./SegmentWorkspace";

export async function SegmentPage({
  tipo,
  searchParams,
}: {
  tipo: TipoDoc;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const seg = SEGMENTOS[tipo];
  const sp = await searchParams;
  const idParam = typeof sp.id === "string" && ehUuid(sp.id) ? sp.id : null;
  const hoje = dataPorExtenso();

  const banco = await verificarBanco();
  if (!banco.ok) return <BancoIndisponivel status={banco} />;

  const [condos, modeloRow, salvos, selecionado, ia, [{ totalDocs }]] = await Promise.all([
    db
      .select({
        id: condominios.id,
        nome: condominios.nome,
        cnpj: condominios.cnpj,
        endereco: condominios.endereco,
        cidade: condominios.cidade,
        uf: condominios.uf,
        sindico: condominios.sindico,
        gestor: condominios.gestor,
        logoMime: condominios.logoMime,
        logoEm: condominios.logoEm,
      })
      .from(condominios)
      .orderBy(condominios.nome),
    db.select().from(modelosPadrao).where(eq(modelosPadrao.tipo, tipo)).limit(1),
    db
      .select({
        id: documentosEmitidos.id,
        numero: documentosEmitidos.numero,
        condominioId: documentosEmitidos.condominioId,
        condominioNome: documentosEmitidos.condominioNome,
        assunto: documentosEmitidos.assunto,
        status: documentosEmitidos.status,
        criadoEm: documentosEmitidos.criadoEm,
        atualizadoEm: documentosEmitidos.atualizadoEm,
        dados: documentosEmitidos.dados,
      })
      .from(documentosEmitidos)
      .where(eq(documentosEmitidos.tipo, tipo))
      .orderBy(desc(documentosEmitidos.atualizadoEm))
      .limit(300),
    idParam
      ? db
          .select()
          .from(documentosEmitidos)
          .where(and(eq(documentosEmitidos.id, idParam), eq(documentosEmitidos.tipo, tipo)))
          .limit(1)
      : Promise.resolve([]),
    getIaConfig(),
    db.select({ totalDocs: count() }).from(condominioDocumentos),
  ]);

  const modelo = resolverModelo(tipo, modeloRow[0]?.dados, hoje);
  const row = selecionado[0];
  const inicial = row
    ? {
        id: row.id,
        condominioId: row.condominioId,
        status: (isStatus(row.status) ? row.status : "rascunho") as StatusDoc,
        dados: normalizarDocumento(sanitizeDoc(row.dados, modeloFabrica(tipo, hoje)), tipo),
      }
    : null;

  const itens: SalvoItem[] = salvos.map((s) => {
    const d = normalizarDocumento(sanitizeDoc(s.dados, modeloFabrica(tipo, hoje)), tipo);
    return {
      id: s.id,
      numero: s.numero,
      condominioId: s.condominioId,
      condominioNome: s.condominioNome,
      assunto: assuntoDe(d),
      unidade: unidadeDe(d),
      valor: d.destaque.ativo ? d.destaque.value : "",
      status: isStatus(s.status) ? s.status : "rascunho",
      criadoEm: s.criadoEm.toISOString(),
      atualizadoEm: s.atualizadoEm.toISOString(),
    };
  });

  return (
    <>
      <Hero
        compact
        eyebrow={seg.eyebrow}
        titulo={seg.heroTitulo}
        texto={seg.heroTexto}
        bullets={[
          "Todos os campos editáveis",
          "Documentação por condomínio",
          "PDF no padrão Gerencial",
        ]}
        aside={
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-brand/30 bg-white/[0.07] p-3 backdrop-blur-sm">
            <div className="rounded-lg bg-white/10 px-2.5 py-2">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/50">
                {seg.plural} salvas
              </p>
              <p className="text-[18px] font-extrabold">{salvos.length}</p>
            </div>
            <div className="rounded-lg bg-white/10 px-2.5 py-2">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/50">
                Documentos do condomínio
              </p>
              <p className="text-[18px] font-extrabold">{totalDocs}</p>
            </div>
            <div className="rounded-lg bg-white/10 px-2.5 py-2">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/50">IA</p>
              <p className={`text-[18px] font-extrabold ${ia.apiKey ? "text-brand" : "text-white/70"}`}>
                {ia.apiKey ? "Ativa" : "Pendente"}
              </p>
            </div>
          </div>
        }
      />
      <SegmentWorkspace
        key={inicial?.id ?? "novo"}
        tipo={tipo}
        condominios={condos.map((c) => ({
          id: c.id,
          nome: c.nome,
          cnpj: c.cnpj,
          endereco: c.endereco,
          cidade: c.cidade,
          uf: c.uf,
          sindico: c.sindico,
          gestor: c.gestor,
          logoUrl: c.logoMime ? `/api/condominios/${c.id}/logo?v=${c.logoEm?.getTime() ?? 0}` : null,
        }))}
        modelo={modelo}
        modeloPersonalizado={!!modeloRow[0]}
        hoje={hoje}
        salvos={itens}
        inicial={inicial}
      />
    </>
  );
}
