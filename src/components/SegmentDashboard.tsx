"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { dataCurta } from "@/lib/format";
import type { StatusDoc, TipoDoc } from "@/lib/types";
import { SEGMENTOS, STATUS_DOC, statusLabel } from "@/lib/types";
import { Icon } from "./Icon";
import type { SalvoItem } from "./SegmentWorkspace";

const CORES_STATUS: Record<StatusDoc, string> = {
  rascunho: "bg-paper text-slate-600 border-line",
  a_enviar: "bg-brand-soft text-brand-dark border-brand/40",
  enviado: "bg-success-soft text-success border-success/20",
};

type Periodo = "todos" | "7" | "30" | "mes" | "ano";

export function SegmentDashboard({
  tipo,
  itens,
  condominios,
  atualId,
  onStatus,
  onExcluir,
}: {
  tipo: TipoDoc;
  itens: SalvoItem[];
  condominios: { id: string; nome: string }[];
  atualId: string | null;
  onStatus: (id: string, status: StatusDoc) => void;
  onExcluir: (id: string) => void;
}) {
  const seg = SEGMENTOS[tipo];
  const [aberto, setAberto] = useState(true);
  const [visao, setVisao] = useState<"kanban" | "lista">("kanban");
  const [busca, setBusca] = useState("");
  const [condo, setCondo] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("todos");
  const [statusFiltro, setStatusFiltro] = useState<"" | StatusDoc>("");
  const [arrastando, setArrastando] = useState<StatusDoc | null>(null);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const agora = new Date();
    return itens.filter((i) => {
      if (condo && i.condominioId !== condo) return false;
      if (visao === "lista" && statusFiltro && i.status !== statusFiltro) return false;
      if (q) {
        const alvo = `${i.numero} ${i.condominioNome} ${i.assunto} ${i.unidade}`.toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      if (periodo !== "todos") {
        const d = new Date(i.criadoEm);
        if (periodo === "mes") {
          if (d.getMonth() !== agora.getMonth() || d.getFullYear() !== agora.getFullYear()) return false;
        } else if (periodo === "ano") {
          if (d.getFullYear() !== agora.getFullYear()) return false;
        } else {
          const dias = Number(periodo);
          if (agora.getTime() - d.getTime() > dias * 86400000) return false;
        }
      }
      return true;
    });
  }, [itens, busca, condo, periodo, statusFiltro, visao]);

  const contagem = (s: StatusDoc) => itens.filter((i) => i.status === s).length;
  const limpar = () => {
    setBusca("");
    setCondo("");
    setPeriodo("todos");
    setStatusFiltro("");
  };

  function cartao(i: SalvoItem) {
    return (
      <div
        key={i.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", i.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className={`group rounded-xl border bg-white p-2.5 shadow-sm transition hover:border-brand ${
          i.id === atualId ? "border-brand ring-2 ring-brand/30" : "border-line"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <Link href={`/${seg.slug}?id=${i.id}`} className="min-w-0 flex-1">
            <span className="block font-mono text-[10.5px] font-bold text-slate-500">{i.numero}</span>
            <span className="block truncate text-[12.5px] font-bold text-ink group-hover:text-brand-dark">
              {i.condominioNome || "Sem condomínio"}
            </span>
            {i.unidade ? (
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-brand-dark">
                {i.unidade}
              </span>
            ) : null}
            <span className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-slate-500">
              {i.assunto}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => onExcluir(i.id)}
            className="rounded p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
            aria-label={`Excluir ${i.numero}`}
            title="Excluir"
          >
            <Icon name="trash" className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
          <span className="text-[10.5px] text-slate-400">
            {dataCurta(i.criadoEm)}
            {tipo === "multa" && i.valor ? ` · ${i.valor}` : ""}
          </span>
          <select
            aria-label={`Status de ${i.numero}`}
            value={i.status}
            onChange={(e) => onStatus(i.id, e.target.value as StatusDoc)}
            className="cursor-pointer rounded-md border border-line bg-white px-1.5 py-0.5 text-[10.5px] font-bold text-ink"
          >
            {STATUS_DOC.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <section className="no-print card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 className="font-display text-[18px] text-ink">Painel de {seg.plural.toLowerCase()}</h2>
          <p className="text-[12px] text-slate-500">
            Acompanhe o fluxo: rascunho → a enviar → enviado. Arraste os cartões ou altere o status na
            lista.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {aberto ? (
            <div className="flex overflow-hidden rounded-lg border border-line">
              {(["kanban", "lista"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisao(v)}
                  className={`px-3 py-1.5 text-[11.5px] font-bold capitalize ${
                    visao === v ? "bg-ink text-white" : "bg-white text-slate-500 hover:bg-paper"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          ) : null}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAberto((o) => !o)}>
            {aberto ? "Recolher" : "Expandir"}
          </button>
        </div>
      </div>

      {!aberto ? (
        <p className="px-4 py-2.5 text-[12px] text-slate-500">
          {itens.length} documento(s): {contagem("rascunho")} rascunho(s), {contagem("a_enviar")} a
          enviar, {contagem("enviado")} enviado(s).
        </p>
      ) : (
        <div className="p-4">
          {/* Indicadores */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-line bg-paper/60 p-3">
              <p className="label">Total no segmento</p>
              <p className="font-display text-[26px] text-ink">{itens.length}</p>
              <p className="text-[11px] text-slate-500">{filtrados.length} no filtro atual</p>
            </div>
            {STATUS_DOC.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setVisao("lista");
                  setStatusFiltro((f) => (f === s.id ? "" : s.id));
                }}
                title={s.dica}
                className={`rounded-xl border p-3 text-left transition hover:border-brand ${
                  statusFiltro === s.id && visao === "lista" ? "border-brand ring-2 ring-brand/25" : "border-line"
                } ${CORES_STATUS[s.id]}`}
              >
                <p className="label !text-current opacity-70">{s.label}</p>
                <p className="font-display text-[26px]">{contagem(s.id)}</p>
                <p className="text-[11px] opacity-80">{s.dica}</p>
              </button>
            ))}
          </div>

          {/* Filtros */}
          <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_170px_auto]">
            <input
              className="field"
              placeholder="Buscar por protocolo, condomínio, unidade ou assunto"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar documentos"
            />
            <select
              className="field"
              value={condo}
              onChange={(e) => setCondo(e.target.value)}
              aria-label="Filtrar por condomínio"
            >
              <option value="">Todos os condomínios</option>
              {condominios.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as Periodo)}
              aria-label="Filtrar por período"
            >
              <option value="todos">Todo o período</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="mes">Este mês</option>
              <option value="ano">Este ano</option>
            </select>
            <button type="button" className="btn btn-ghost" onClick={limpar}>
              Limpar filtros
            </button>
          </div>
          {visao === "lista" && statusFiltro ? (
            <p className="mt-2 text-[11.5px] text-slate-500">
              Mostrando apenas: <span className="font-bold text-ink">{statusLabel(statusFiltro)}</span>
            </p>
          ) : null}

          {/* Kanban */}
          {visao === "kanban" ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {STATUS_DOC.map((s) => {
                const cards = filtrados.filter((i) => i.status === s.id);
                return (
                  <div
                    key={s.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setArrastando(s.id);
                    }}
                    onDragLeave={() => setArrastando((a) => (a === s.id ? null : a))}
                    onDrop={(e) => {
                      e.preventDefault();
                      setArrastando(null);
                      const id = e.dataTransfer.getData("text/plain");
                      const item = itens.find((i) => i.id === id);
                      if (item && item.status !== s.id) onStatus(id, s.id);
                    }}
                    className={`rounded-xl border p-2.5 transition ${
                      arrastando === s.id ? "border-brand bg-brand-soft/50" : "border-line bg-paper/50"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between px-1">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink">
                        {s.label}
                      </p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-bold text-slate-500">
                        {cards.length}
                      </span>
                    </div>
                    <div className="max-h-[420px] space-y-2 overflow-y-auto pr-0.5">
                      {cards.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[11.5px] text-slate-400">
                          Nenhum cartão. Arraste para cá.
                        </p>
                      ) : (
                        cards.map(cartao)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-line">
              {filtrados.length === 0 ? (
                <p className="px-4 py-8 text-center text-[12.5px] text-slate-500">
                  Nenhum documento encontrado com os filtros atuais.
                </p>
              ) : (
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-paper/70 text-left">
                      {["Protocolo", "Condomínio / unidade", "Assunto", "Criado em", "Status", ""].map(
                        (h) => (
                          <th
                            key={h}
                            className="border-b border-line px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((i) => (
                      <tr key={i.id} className="transition hover:bg-brand-soft/40">
                        <td className="border-b border-line px-3 py-2 font-mono text-[10.5px] font-bold text-slate-600">
                          {i.numero}
                        </td>
                        <td className="border-b border-line px-3 py-2">
                          <span className="block font-bold text-ink">{i.condominioNome || "—"}</span>
                          <span className="block text-[11px] text-slate-500">{i.unidade || "—"}</span>
                        </td>
                        <td className="max-w-[280px] border-b border-line px-3 py-2">
                          <span className="block truncate text-slate-600">{i.assunto}</span>
                          {tipo === "multa" && i.valor ? (
                            <span className="text-[11px] font-bold text-brand-dark">{i.valor}</span>
                          ) : null}
                        </td>
                        <td className="border-b border-line px-3 py-2 text-slate-500">
                          {dataCurta(i.criadoEm)}
                        </td>
                        <td className="border-b border-line px-3 py-2">
                          <select
                            aria-label={`Status de ${i.numero}`}
                            value={i.status}
                            onChange={(e) => onStatus(i.id, e.target.value as StatusDoc)}
                            className={`cursor-pointer rounded-full border px-2 py-1 text-[11px] font-bold ${CORES_STATUS[i.status]}`}
                          >
                            {STATUS_DOC.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border-b border-line px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Link href={`/${seg.slug}?id=${i.id}`} className="btn btn-ghost btn-sm">
                              Abrir
                            </Link>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => onExcluir(i.id)}
                              aria-label={`Excluir ${i.numero}`}
                            >
                              <Icon name="trash" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
