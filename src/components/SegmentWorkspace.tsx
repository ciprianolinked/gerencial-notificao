"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { tamanhoLegivel } from "@/lib/format";
import { modeloFabrica } from "@/lib/modelos";
import type { DocData, StatusDoc, TipoDoc } from "@/lib/types";
import {
  SEGMENTOS,
  STATUS_DOC,
  assuntoDe,
  contarPendencias,
  destinatarioDe,
  normalizarTexto,
  uid,
  unidadeDe,
} from "@/lib/types";
import type { HistoricoItem } from "@/lib/historico";
import type { AnaliseViabilidade } from "@/lib/ia-analise";
import { DocumentPaper } from "./DocumentPaper";
import { Icon, Spinner } from "./Icon";
import { SegmentDashboard } from "./SegmentDashboard";

export type CondoOpt = {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  sindico: string | null;
  gestor: string | null;
  logoUrl: string | null;
};

export type SalvoItem = {
  id: string;
  numero: string;
  condominioId: string | null;
  condominioNome: string;
  assunto: string;
  unidade: string;
  valor: string;
  status: StatusDoc;
  criadoEm: string;
  atualizadoEm: string;
};

type DocInfo = {
  id: string;
  nome: string;
  categoria: string;
  tamanho: number;
  status: string;
  caracteres: number;
};

type Props = {
  tipo: TipoDoc;
  condominios: CondoOpt[];
  modelo: DocData;
  modeloPersonalizado: boolean;
  hoje: string;
  salvos: SalvoItem[];
  inicial: { id: string; condominioId: string | null; status: StatusDoc; dados: DocData } | null;
};

type AnaliseResp = {
  analise: AnaliseViabilidade;
  historico: HistoricoItem[];
  documentosUsados: string[];
};

function aplicarCondo(d: DocData, c: CondoOpt): DocData {
  const cidadeUf = c.cidade ? `${c.cidade}${c.uf ? `/${c.uf}` : ""}` : "";
  const endereco = c.endereco ? (cidadeUf ? `${c.endereco} — ${cidadeUf}` : c.endereco) : cidadeUf;
  const info = [c.cnpj ? `CNPJ ${c.cnpj}` : null, endereco || null].filter(Boolean).join(" · ");
  return {
    ...d,
    condominio: c.nome,
    condominioInfo: info || d.condominioInfo,
    local: c.cidade || d.local,
    assinaturas: d.assinaturas.map((a) => {
      if (a.id === "ass-gestor" && c.gestor) return { ...a, nome: c.gestor };
      if (a.id === "ass-sindico" && c.sindico) {
        return { ...a, nome: c.sindico, cargo: `Síndico(a) — ${c.nome}` };
      }
      return a;
    }),
  };
}

const json = { "Content-Type": "application/json" };
const VEREDITO = {
  sim: { rotulo: "Multa cabível", classe: "bg-success-soft text-success" },
  ressalvas: { rotulo: "Cabível com ressalvas", classe: "bg-brand-soft text-brand-dark" },
  nao: { rotulo: "Multa não recomendada", classe: "bg-red-50 text-red-700" },
} as const;

export function SegmentWorkspace({
  tipo,
  condominios,
  modelo,
  modeloPersonalizado,
  hoje,
  salvos,
  inicial,
}: Props) {
  const seg = SEGMENTOS[tipo];

  const [doc, setDoc] = useState<DocData>(inicial?.dados ?? modelo);
  const [docId, setDocId] = useState<string | null>(inicial?.id ?? null);
  const [status, setStatus] = useState<StatusDoc>(inicial?.status ?? "rascunho");
  const [condominioId, setCondominioId] = useState<string>(inicial?.condominioId ?? "");
  const [modeloAtual, setModeloAtual] = useState<DocData>(modelo);
  const [personalizado, setPersonalizado] = useState(modeloPersonalizado);
  const [lista, setLista] = useState<SalvoItem[]>(salvos);
  const [alterado, setAlterado] = useState(false);

  const [docsInfo, setDocsInfo] = useState<{ id: string; docs: DocInfo[] } | null>(null);
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());

  const [briefing, setBriefing] = useState("");
  const [dadosIA, setDadosIA] = useState<Record<string, string>>({});
  const [iaCarregando, setIaCarregando] = useState(false);
  const [iaErro, setIaErro] = useState<string | null>(null);
  const [iaInfo, setIaInfo] = useState<{
    fundamentos: string[];
    alertas: string[];
    usados: string[];
  } | null>(null);
  const [anterior, setAnterior] = useState<DocData | null>(null);

  const [analisando, setAnalisando] = useState(false);
  const [analiseErro, setAnaliseErro] = useState<string | null>(null);
  const [analise, setAnalise] = useState<AnaliseResp | null>(null);
  const [assuntosHist, setAssuntosHist] = useState<string[]>([]);

  const [salvando, setSalvando] = useState(false);
  const [pdfCarregando, setPdfCarregando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [toast, setToast] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avisar = useCallback((t: "ok" | "erro", texto: string) => {
    setToast({ tipo: t, texto });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), t === "erro" ? 8000 : 4500);
  }, []);

  const alterar = useCallback((patch: Partial<DocData>) => {
    setDoc((d) => ({ ...d, ...patch }));
    setAlterado(true);
  }, []);

  useEffect(() => {
    if (!condominioId) return;
    const ctrl = new AbortController();
    fetch(`/api/condominios/${condominioId}/documentos`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => setDocsInfo({ id: condominioId, docs: (j.documentos ?? []) as DocInfo[] }))
      .catch(() => {});
    return () => ctrl.abort();
  }, [condominioId]);

  const docsCondo = condominioId && docsInfo?.id === condominioId ? docsInfo.docs : null;
  const docsUsaveis = (docsCondo ?? []).filter((d) => d.caracteres > 0 && !excluidos.has(d.id));
  const pendencias = contarPendencias(doc);
  const condoSelecionado = condominios.find((c) => c.id === condominioId);
  const efetivo = (manual: string | undefined, fallback: string) => {
    const m = manual?.trim() ?? "";
    if (m) return m;
    const f = fallback.trim();
    if (!f || /^\[[^\]]+\]$/.test(f)) return "";
    return f;
  };
  const unidadeAtual = efetivo(dadosIA.unidade, unidadeDe(doc));
  const destAtual = efetivo(dadosIA.destinatario, destinatarioDe(doc));
  const assuntoAtual = efetivo(dadosIA.assunto, assuntoDe(doc));

  useEffect(() => {
    if (!condominioId) {
      setAssuntosHist([]);
      return;
    }
    const ctrl = new AbortController();
    const q = new URLSearchParams({ condominioId });
    if (unidadeAtual.trim()) q.set("unidade", unidadeAtual.trim());
    fetch(`/api/historico?${q}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => setAssuntosHist(Array.isArray(j.assuntos) ? (j.assuntos as string[]) : []))
      .catch(() => {});
    return () => ctrl.abort();
  }, [condominioId, unidadeAtual]);

  function itemDe(d: DocData, id: string, numero: string, st: StatusDoc): SalvoItem {
    const antigo = lista.find((x) => x.id === id);
    return {
      id,
      numero,
      condominioId: condominioId || null,
      condominioNome: d.condominio,
      assunto: assuntoDe(d),
      unidade: unidadeDe(d),
      valor: d.destaque.ativo ? d.destaque.value : "",
      status: st,
      criadoEm: antigo?.criadoEm ?? new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
  }

  function escolherCondominio(id: string) {
    setCondominioId(id);
    setExcluidos(new Set());
    setAnalise(null);
    const c = condominios.find((x) => x.id === id);
    if (c) {
      setDoc((d) => aplicarCondo(d, c));
      setAlterado(true);
    }
  }

  function novoDocumento() {
    if (alterado && !window.confirm("Descartar as alterações não salvas e começar um novo documento?")) {
      return;
    }
    const base = { ...modeloAtual, data: hoje, numero: "" };
    setDoc(condoSelecionado ? aplicarCondo(base, condoSelecionado) : base);
    setDocId(null);
    setStatus("rascunho");
    setAlterado(false);
    setAnterior(null);
    setIaInfo(null);
    setIaErro(null);
    setAnalise(null);
    window.history.replaceState(null, "", `/${seg.slug}`);
  }

  async function redigir() {
    setIaCarregando(true);
    setIaErro(null);
    try {
      const r = await fetch("/api/ia/gerar", {
        method: "POST",
        headers: json,
        body: JSON.stringify({
          tipo,
          condominioId: condominioId || null,
          briefing,
          dados: dadosIA,
          doc,
          documentoIds: condominioId ? docsUsaveis.map((d) => d.id) : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setIaErro(j.erro ?? "Não foi possível redigir com a IA.");
        return;
      }
      const res = j.resultado as Partial<DocData> & { fundamentos: string[]; alertas: string[] };
      setAnterior(doc);
      setDoc((d) => ({
        ...d,
        titulo: res.titulo ?? d.titulo,
        subtitulo: res.subtitulo ?? d.subtitulo,
        campos: res.campos ?? d.campos,
        destaque: res.destaque ?? d.destaque,
        saudacao: res.saudacao ?? d.saudacao,
        corpo: res.corpo ?? d.corpo,
        fechamento: res.fechamento ?? d.fechamento,
      }));
      setAlterado(true);
      setIaInfo({
        fundamentos: res.fundamentos ?? [],
        alertas: res.alertas ?? [],
        usados: (j.documentosUsados ?? []) as string[],
      });
      avisar("ok", "Texto redigido pela IA. Revise e edite o que for necessário.");
    } catch {
      setIaErro("Falha de conexão ao consultar a IA. Tente novamente.");
    } finally {
      setIaCarregando(false);
    }
  }

  async function analisar() {
    if (!condominioId) {
      setAnaliseErro("Selecione o condomínio para analisar o histórico.");
      setAnalise(null);
      return;
    }
    if (!unidadeAtual) {
      setAnaliseErro("Informe a unidade. A reincidência é apurada por unidade.");
      setAnalise(null);
      return;
    }
    if (tipo === "multa" && !assuntoAtual) {
      setAnaliseErro("Informe o assunto / infração. A multa, em geral, exige reincidência do mesmo tema.");
      setAnalise(null);
      return;
    }
    setAnalisando(true);
    setAnaliseErro(null);
    try {
      const r = await fetch("/api/ia/analisar", {
        method: "POST",
        headers: json,
        body: JSON.stringify({
          tipo,
          condominioId,
          unidade: unidadeAtual,
          assunto: assuntoAtual,
          destinatario: destAtual,
          doc,
          docId,
          briefing,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setAnaliseErro(j.erro ?? "Não foi possível analisar.");
        setAnalise(null);
        return;
      }
      setAnalise(j as AnaliseResp);
    } catch {
      setAnaliseErro("Falha de conexão ao analisar. Tente novamente.");
    } finally {
      setAnalisando(false);
    }
  }

  function aplicarSugestoes() {
    const sugestoes = analise?.analise.sugestoesCampos ?? [];
    if (sugestoes.length === 0) return;
    setDoc((d) => {
      const campos = [...d.campos];
      for (const s of sugestoes) {
        const alvo = normalizarTexto(s.label);
        if (!alvo) continue;
        const i = campos.findIndex((c) => {
          const cl = normalizarTexto(c.label);
          return cl === alvo || cl.includes(alvo) || alvo.includes(cl);
        });
        if (i >= 0) campos[i] = { ...campos[i], value: s.value };
        else campos.push({ id: uid(), label: s.label, value: s.value });
      }
      return { ...d, campos };
    });
    setAlterado(true);
    avisar("ok", "Sugestões da análise aplicadas no quadro. Revise os valores.");
  }

  async function salvar() {
    setSalvando(true);
    try {
      const payload = JSON.stringify({
        tipo,
        condominioId: condominioId || null,
        status,
        dados: doc,
      });
      const r = await fetch(docId ? `/api/emitidos/${docId}` : "/api/emitidos", {
        method: docId ? "PUT" : "POST",
        headers: json,
        body: payload,
      });
      const j = await r.json();
      if (!r.ok) {
        avisar("erro", j.erro ?? "Não foi possível salvar.");
        return;
      }
      const id = (j.id ?? docId) as string;
      setDoc((d) => ({ ...d, numero: j.numero }));
      setDocId(id);
      setAlterado(false);
      setLista((l) => [itemDe({ ...doc, numero: j.numero }, id, j.numero, status), ...l.filter((x) => x.id !== id)]);
      window.history.replaceState(null, "", `/${seg.slug}?id=${id}`);
      avisar("ok", `${seg.nome} ${j.numero} salva.`);
    } catch {
      avisar("erro", "Falha de conexão ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(id: string, novo: StatusDoc) {
    const antes = lista;
    setLista((l) => l.map((i) => (i.id === id ? { ...i, status: novo } : i)));
    if (id === docId) setStatus(novo);
    try {
      const r = await fetch(`/api/emitidos/${id}`, {
        method: "PATCH",
        headers: json,
        body: JSON.stringify({ status: novo }),
      });
      if (!r.ok) {
        setLista(antes);
        avisar("erro", "Não foi possível alterar o status.");
      }
    } catch {
      setLista(antes);
      avisar("erro", "Falha de conexão ao alterar o status.");
    }
  }

  async function excluirSalvo(id: string) {
    if (!window.confirm("Excluir este documento salvo? Esta ação não pode ser desfeita.")) return;
    const r = await fetch(`/api/emitidos/${id}`, { method: "DELETE" });
    if (!r.ok) {
      avisar("erro", "Não foi possível excluir.");
      return;
    }
    setLista((l) => l.filter((x) => x.id !== id));
    if (id === docId) {
      const base = { ...modeloAtual, data: hoje, numero: "" };
      setDoc(condoSelecionado ? aplicarCondo(base, condoSelecionado) : base);
      setDocId(null);
      setStatus("rascunho");
      setAlterado(false);
      window.history.replaceState(null, "", `/${seg.slug}`);
    }
    avisar("ok", "Documento excluído.");
  }

  async function gerarPdf() {
    if (
      pendencias > 0 &&
      !window.confirm(
        `Ainda há ${pendencias} trecho(s) entre [colchetes] sem preencher. Gerar o PDF mesmo assim?`,
      )
    ) {
      return;
    }
    setPdfCarregando(true);
    try {
      const { baixarPdf } = await import("@/components/pdf/gerarPdf");
      await baixarPdf(doc, seg.prefixo, condoSelecionado?.logoUrl ?? null);
      avisar("ok", "PDF gerado e salvo no seu dispositivo.");
    } catch (e) {
      console.error(e);
      avisar("erro", "Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setPdfCarregando(false);
    }
  }

  async function salvarLogoComoPadrao() {
    if (!doc.logoDataUrl) {
      avisar("erro", "Anexe uma logo no canto superior direito da folha antes de defini-la como padrão.");
      return;
    }
    const novoModelo = { ...modeloAtual, logoDataUrl: doc.logoDataUrl };
    try {
      const r = await fetch(`/api/modelos/${tipo}`, {
        method: "PUT",
        headers: json,
        body: JSON.stringify({ dados: novoModelo }),
      });
      if (!r.ok) throw new Error("Falha ao salvar a logo");
      setModeloAtual(novoModelo);
      setPersonalizado(true);
      avisar("ok", `Logo definida como padrão de ${seg.plural.toLowerCase()}.`);
    } catch {
      avisar("erro", "Não foi possível salvar a logo padrão. Tente novamente.");
    }
  }

  async function salvarComoPadrao() {
    if (
      !window.confirm(
        `Salvar o conteúdo atual como modelo padrão de ${seg.plural.toLowerCase()}? Todo novo documento começará a partir dele.`,
      )
    ) {
      return;
    }
    const r = await fetch(`/api/modelos/${tipo}`, {
      method: "PUT",
      headers: json,
      body: JSON.stringify({ dados: doc }),
    });
    if (!r.ok) {
      avisar("erro", "Não foi possível salvar o modelo padrão.");
      return;
    }
    setModeloAtual({ ...doc, numero: "" });
    setPersonalizado(true);
    avisar("ok", "Modelo padrão atualizado.");
  }

  async function restaurarFabrica() {
    if (!window.confirm("Voltar ao modelo de fábrica da Gerencial? O modelo personalizado será removido.")) {
      return;
    }
    const r = await fetch(`/api/modelos/${tipo}`, { method: "DELETE" });
    if (!r.ok) {
      avisar("erro", "Não foi possível restaurar o modelo.");
      return;
    }
    const fabrica = modeloFabrica(tipo, hoje);
    setModeloAtual(fabrica);
    setPersonalizado(false);
    setDoc(condoSelecionado ? aplicarCondo(fabrica, condoSelecionado) : fabrica);
    setDocId(null);
    setStatus("rascunho");
    setAlterado(false);
    window.history.replaceState(null, "", `/${seg.slug}`);
    avisar("ok", "Modelo de fábrica restaurado.");
  }

  async function importarModelo(file: File) {
    setImportando(true);
    try {
      const fd = new FormData();
      fd.append("tipo", tipo);
      fd.append("arquivo", file);
      const r = await fetch("/api/modelos/importar", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) {
        avisar("erro", j.erro ?? "Não foi possível ler o modelo.");
        return;
      }
      const p = (j.parcial ?? {}) as Partial<DocData>;
      setDoc((d) => ({
        ...d,
        ...p,
        campos: p.campos ?? d.campos,
        destaque: p.destaque ?? d.destaque,
      }));
      setAlterado(true);
      avisar(
        "ok",
        j.aviso ??
          "Modelo carregado no editor. Revise e use “Salvar documento atual como modelo padrão”.",
      );
    } catch {
      avisar("erro", "Falha de conexão ao enviar o modelo.");
    } finally {
      setImportando(false);
    }
  }

  return (
    <>
      <SegmentDashboard
        tipo={tipo}
        itens={lista}
        condominios={condominios}
        atualId={docId}
        onStatus={mudarStatus}
        onExcluir={excluirSalvo}
      />

      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
        {/* ───────── Painel lateral ───────── */}
        <aside className="no-print space-y-4 lg:sticky lg:top-[84px] lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto lg:pb-2 lg:pr-1">
          {/* Condomínio */}
          <div className="card p-4">
            <label htmlFor="condominio" className="label">
              Condomínio
            </label>
            <select
              id="condominio"
              className="field"
              value={condominioId}
              onChange={(e) => escolherCondominio(e.target.value)}
            >
              <option value="">Selecione o condomínio…</option>
              {condominios.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            {condominios.length === 0 ? (
              <p className="mt-2 text-[12px] text-slate-500">
                Nenhum condomínio cadastrado.{" "}
                <Link href="/condominios" className="font-bold text-brand-dark underline">
                  Cadastrar condomínio
                </Link>
              </p>
            ) : null}

            {condoSelecionado ? (
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className="label !mb-0">Documentação lida pela IA</p>
                  <Link
                    href={`/condominios/${condoSelecionado.id}`}
                    className="text-[11px] font-bold text-brand-dark hover:underline"
                  >
                    Gerenciar
                  </Link>
                </div>
                {docsCondo === null ? (
                  <p className="mt-2 flex items-center gap-2 text-[12px] text-slate-500">
                    <Spinner className="h-3.5 w-3.5" /> Carregando documentos…
                  </p>
                ) : docsCondo.length === 0 ? (
                  <p className="mt-2 rounded-lg bg-brand-soft px-3 py-2 text-[12px] text-brand-dark">
                    Nenhum documento enviado para este condomínio. Envie a Convenção e o Regimento
                    Interno para a IA fundamentar o texto.{" "}
                    <Link href={`/condominios/${condoSelecionado.id}`} className="font-bold underline">
                      Enviar agora
                    </Link>
                  </p>
                ) : (
                  <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                    {docsCondo.map((d) => {
                      const semTexto = d.caracteres === 0;
                      return (
                        <li key={d.id}>
                          <label
                            className={`flex items-start gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[12px] ${
                              semTexto ? "opacity-60" : "cursor-pointer hover:bg-paper"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 accent-[#181447]"
                              disabled={semTexto}
                              checked={!semTexto && !excluidos.has(d.id)}
                              onChange={(e) =>
                                setExcluidos((s) => {
                                  const n = new Set(s);
                                  if (e.target.checked) n.delete(d.id);
                                  else n.add(d.id);
                                  return n;
                                })
                              }
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-ink">{d.nome}</span>
                              <span className="block text-[10.5px] text-slate-500">
                                {d.categoria} · {tamanhoLegivel(d.tamanho)}
                                {semTexto ? " · sem texto lido" : ""}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}
          </div>

          {/* IA */}
          <div className="card p-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-brand">
                <Icon name="sparkles" className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[14px] font-extrabold leading-tight text-ink">Redigir com IA</h2>
                <p className="text-[11px] leading-snug text-slate-500">
                  Analisa a documentação do condomínio e o histórico da unidade.
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-2.5">
              {seg.camposIA.map((f) => (
                <div key={f.key}>
                  <label className="label" htmlFor={`ia-${f.key}`}>
                    {f.label}
                  </label>
                  <input
                    id={`ia-${f.key}`}
                    className="field"
                    value={dadosIA[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => setDadosIA((d) => ({ ...d, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="label" htmlFor="ia-briefing">
                  Relato do caso / instruções
                </label>
                <textarea
                  id="ia-briefing"
                  rows={5}
                  className="field"
                  value={briefing}
                  placeholder={seg.briefingPlaceholder}
                  onChange={(e) => setBriefing(e.target.value)}
                />
              </div>
            </div>

            <button
              type="button"
              className="btn btn-brand mt-3 w-full"
              onClick={redigir}
              disabled={iaCarregando || analisando}
            >
              {iaCarregando ? (
                <>
                  <Spinner /> Analisando documentos e redigindo…
                </>
              ) : (
                <>
                  <Icon name="sparkles" /> Redigir {seg.nome.toLowerCase()} com IA
                </>
              )}
            </button>

            <p className="mt-1.5 text-[10.5px] leading-snug text-slate-500">
              A redação substitui o texto atual do documento. Você pode desfazer e editar qualquer
              campo depois.
            </p>

            {iaErro ? (
              <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                {iaErro}
                {/configurar ia/i.test(iaErro) ? (
                  <>
                    {" "}
                    <Link href="/configuracoes" className="font-bold underline">
                      Abrir configuração
                    </Link>
                  </>
                ) : null}
              </p>
            ) : null}

            {anterior ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm mt-3"
                onClick={() => {
                  setDoc(anterior);
                  setAnterior(null);
                  setIaInfo(null);
                }}
              >
                <Icon name="undo" className="h-3.5 w-3.5" /> Desfazer redação da IA
              </button>
            ) : null}

            {iaInfo ? (
              <div className="mt-3 space-y-3 text-[12px]">
                {iaInfo.usados.length > 0 ? (
                  <p className="text-slate-500">
                    <span className="font-bold text-ink">Documentos analisados:</span>{" "}
                    {iaInfo.usados.join(", ")}
                  </p>
                ) : (
                  <p className="rounded-lg bg-brand-soft px-3 py-2 text-brand-dark">
                    Nenhum documento do condomínio foi analisado — confira o fundamento citado.
                  </p>
                )}
                {iaInfo.fundamentos.length > 0 ? (
                  <div>
                    <p className="label">Fundamentos utilizados</p>
                    <ul className="space-y-1.5">
                      {iaInfo.fundamentos.map((f, i) => (
                        <li key={i} className="rounded-lg bg-success-soft px-3 py-1.5 leading-snug text-success">
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {iaInfo.alertas.length > 0 ? (
                  <div>
                    <p className="label">Pontos para conferir</p>
                    <ul className="space-y-1.5">
                      {iaInfo.alertas.map((a, i) => (
                        <li
                          key={i}
                          className="flex gap-1.5 rounded-lg bg-brand-soft px-3 py-1.5 leading-snug text-brand-dark"
                        >
                          <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {tipo !== "comunicado" ? (
            <div className="card p-4">
              <div className="flex items-start gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-dark">
                  <Icon name="edit" className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[14px] font-extrabold leading-tight text-ink">
                    Histórico e reincidência
                  </h2>
                  <p className="text-[11px] leading-snug text-slate-500">
                    A IA confere o histórico de notificações e multas da unidade e o regulamento do
                    condomínio. A reincidência, na maioria dos regulamentos, vale para o{" "}
                    <span className="font-bold text-ink">mesmo assunto</span>.
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-2.5">
                <div>
                  <label className="label" htmlFor="hist-condo">
                    Condomínio
                  </label>
                  <select
                    id="hist-condo"
                    className="field"
                    value={condominioId}
                    onChange={(e) => escolherCondominio(e.target.value)}
                  >
                    <option value="">Selecione o condomínio…</option>
                    {condominios.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="hist-unidade">
                    Unidade
                  </label>
                  <input
                    id="hist-unidade"
                    className="field"
                    value={dadosIA.unidade ?? ""}
                    placeholder={unidadeDe(doc) || "[Bloco / Apartamento]"}
                    onChange={(e) => setDadosIA((d) => ({ ...d, unidade: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="hist-dest">
                    Destinatário
                  </label>
                  <input
                    id="hist-dest"
                    className="field"
                    value={dadosIA.destinatario ?? ""}
                    placeholder={destinatarioDe(doc) || "[Nome do condômino / morador]"}
                    onChange={(e) => setDadosIA((d) => ({ ...d, destinatario: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="hist-assunto">
                    Assunto / infração
                  </label>
                  <input
                    id="hist-assunto"
                    className="field"
                    list="hist-assuntos"
                    value={dadosIA.assunto ?? ""}
                    placeholder={assuntoDe(doc) || "Ex.: perturbação do sossego, animais, lixo"}
                    onChange={(e) => setDadosIA((d) => ({ ...d, assunto: e.target.value }))}
                  />
                  <datalist id="hist-assuntos">
                    {assuntosHist.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
                    {assuntosHist.length > 0
                      ? `${assuntosHist.length} assunto(s) já registrados neste condomínio${unidadeAtual ? " / unidade" : ""}. Escolha um da lista ou digite.`
                      : "Digite o assunto. A multa só se configura, em geral, na reincidência do mesmo tema."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary mt-3 w-full"
                onClick={analisar}
                disabled={analisando || iaCarregando}
              >
                {analisando ? (
                  <>
                    <Spinner /> Cruzando regulamento e histórico…
                  </>
                ) : (
                  <>
                    <Icon name="sparkles" /> Analisar histórico
                  </>
                )}
              </button>
              <p className="mt-1.5 text-[10.5px] leading-snug text-slate-500">
                Deixe em branco para usar os valores já preenchidos no documento.
              </p>
            </div>
          ) : null}

          {/* Análise de viabilidade / reincidência */}
          {tipo !== "comunicado" && (analiseErro || analise) ? (
            <div className="card p-4">
              <h2 className="text-[14px] font-extrabold text-ink">Viabilidade da multa</h2>
              <p className="text-[11px] text-slate-500">
                {condoSelecionado?.nome ? (
                  <>
                    <span className="font-bold text-ink">{condoSelecionado.nome}</span>
                    {" · "}
                  </>
                ) : null}
                Unidade: <span className="font-bold text-ink">{unidadeAtual || "—"}</span>
                {assuntoAtual ? (
                  <>
                    {" · "}Assunto: <span className="font-bold text-ink">{assuntoAtual}</span>
                  </>
                ) : null}
              </p>
              {analiseErro ? (
                <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                  {analiseErro}
                </p>
              ) : null}
              {analise ? (
                <div className="mt-3 space-y-3 text-[12px]">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${VEREDITO[analise.analise.podeMultar].classe}`}
                  >
                    {VEREDITO[analise.analise.podeMultar].rotulo}
                  </span>
                  {analise.analise.resumo ? (
                    <p className="leading-snug text-slate-600">{analise.analise.resumo}</p>
                  ) : null}

                  <div className="rounded-lg border border-line bg-paper/60 p-3">
                    <p className="label">Reincidência</p>
                    <p className="font-bold text-ink">
                      {analise.analise.reincidencia.reincidente
                        ? "Reincidente no mesmo assunto"
                        : "Sem reincidência do mesmo assunto"}{" "}
                      · {analise.historico.filter((h) => h.mesmoAssunto).length} do mesmo assunto
                      {" · "}
                      {analise.historico.length} registro(s) da unidade
                    </p>
                    {analise.analise.reincidencia.ultimaOcorrencia ? (
                      <p className="mt-0.5 text-slate-600">
                        Última: {analise.analise.reincidencia.ultimaOcorrencia}
                      </p>
                    ) : null}
                    {analise.analise.reincidencia.criterio ? (
                      <p className="mt-1 leading-snug text-slate-500">
                        {analise.analise.reincidencia.criterio}
                      </p>
                    ) : null}
                  </div>

                  {analise.analise.requisitos.length > 0 ? (
                    <div>
                      <p className="label">Checklist do regulamento</p>
                      <ul className="space-y-1.5">
                        {analise.analise.requisitos.map((r, i) => (
                          <li key={i} className="rounded-lg border border-line px-3 py-2">
                            <p className="flex items-center justify-between gap-2">
                              <span className="font-bold text-ink">{r.item}</span>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  r.situacao === "atendido"
                                    ? "bg-success-soft text-success"
                                    : r.situacao === "pendente"
                                      ? "bg-brand-soft text-brand-dark"
                                      : "bg-paper text-slate-500"
                                }`}
                              >
                                {r.situacao === "atendido"
                                  ? "Atendido"
                                  : r.situacao === "pendente"
                                    ? "Pendente"
                                    : "Não identificado"}
                              </span>
                            </p>
                            {r.detalhe ? <p className="mt-0.5 leading-snug text-slate-500">{r.detalhe}</p> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {analise.historico.length > 0 ? (
                    <div>
                      <p className="label">Histórico encontrado no sistema</p>
                      <ul className="space-y-1.5">
                        {analise.historico.map((h) => (
                          <li key={h.id} className="rounded-lg bg-paper px-3 py-2">
                            <Link
                              href={`/${h.tipo === "multa" ? "multa" : "notificacao"}?id=${h.id}`}
                              className="font-mono text-[10.5px] font-bold text-brand-dark hover:underline"
                            >
                              {h.numero}
                            </Link>
                            <span className="ml-2 text-[10.5px] text-slate-400">
                              {h.tipo === "multa" ? "Multa" : "Notificação"} · {h.data} · {h.status}
                            </span>
                            {h.mesmoAssunto ? (
                              <span className="ml-2 rounded-full bg-brand-soft px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-brand-dark">
                                Mesmo assunto
                              </span>
                            ) : null}
                            <p className="mt-0.5 leading-snug text-slate-600">{h.assunto}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-paper px-3 py-2 text-slate-500">
                      Nenhuma notificação ou multa anterior registrada para esta unidade.
                    </p>
                  )}

                  {analise.analise.fundamentos.length > 0 ? (
                    <div>
                      <p className="label">Fundamentos</p>
                      <ul className="space-y-1.5">
                        {analise.analise.fundamentos.map((f, i) => (
                          <li key={i} className="rounded-lg bg-success-soft px-3 py-1.5 leading-snug text-success">
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {analise.analise.alertas.length > 0 ? (
                    <ul className="space-y-1.5">
                      {analise.analise.alertas.map((a, i) => (
                        <li
                          key={i}
                          className="flex gap-1.5 rounded-lg bg-brand-soft px-3 py-1.5 leading-snug text-brand-dark"
                        >
                          <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {analise.analise.proximosPassos.length > 0 ? (
                    <div>
                      <p className="label">Próximos passos</p>
                      <ul className="list-inside list-disc space-y-1 text-slate-600">
                        {analise.analise.proximosPassos.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {analise.analise.sugestoesCampos.length > 0 ? (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={aplicarSugestoes}>
                      <Icon name="check" className="h-3.5 w-3.5" /> Aplicar sugestões no quadro do
                      documento
                    </button>
                  ) : null}
                  <p className="text-[10.5px] leading-snug text-slate-400">
                    Análise de apoio gerada por IA a partir dos documentos e registros do sistema.
                    Confirme com o responsável jurídico antes de aplicar a penalidade.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Modelo padrão */}
          <div className="card p-4">
            <h2 className="text-[14px] font-extrabold text-ink">Modelo padrão</h2>
            <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">
              {personalizado
                ? "Modelo personalizado da Gerencial em uso."
                : "Modelo de fábrica da Gerencial em uso."}{" "}
              Todo novo documento de {seg.plural.toLowerCase()} começa a partir dele.
            </p>
            <div className="mt-3 grid gap-2">
              <p className="text-[11px] leading-snug text-slate-500">
                Anexe a logo diretamente no canto superior direito da folha. A logo escolhida aparecerá
                no PDF e pode ser usada como padrão apenas deste segmento.
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm justify-start"
                onClick={salvarLogoComoPadrao}
                disabled={!doc.logoDataUrl}
                title="Salva somente a logo, sem alterar os textos e campos do modelo"
              >
                <Icon name="save" className="h-3.5 w-3.5" /> Definir logo como padrão de {seg.plural.toLowerCase()}
              </button>
              <button type="button" className="btn btn-ghost btn-sm justify-start" onClick={salvarComoPadrao}>
                <Icon name="save" className="h-3.5 w-3.5" /> Salvar documento atual como modelo padrão
              </button>
              <label
                className={`btn btn-ghost btn-sm justify-start ${importando ? "pointer-events-none opacity-60" : ""}`}
              >
                {importando ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="upload" className="h-3.5 w-3.5" />}
                {importando ? "Lendo modelo…" : "Subir modelo (PDF, DOCX, TXT)"}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt,.md,image/png,image/jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) importarModelo(f);
                  }}
                />
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm justify-start"
                onClick={restaurarFabrica}
                disabled={!personalizado}
              >
                <Icon name="refresh" className="h-3.5 w-3.5" /> Restaurar modelo de fábrica
              </button>
            </div>
          </div>
        </aside>

        {/* ───────── Documento ───────── */}
        <section className="min-w-0">
          <div className="no-print card mb-4 flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 md:sticky md:top-[76px] md:z-30">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="rounded-md bg-paper px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-slate-600">
                {doc.numero || "Novo rascunho"}
              </span>
              <select
                aria-label="Status do documento"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as StatusDoc);
                  setAlterado(true);
                }}
                className="cursor-pointer rounded-md border border-line bg-white px-2 py-1 text-[11px] font-bold text-ink"
                title="Etapa do fluxo (salve para gravar, ou arraste o cartão no painel)"
              >
                {STATUS_DOC.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500">
                {docId ? (alterado ? "Alterações não salvas" : "Salvo") : "Ainda não salvo"}
              </span>
              {pendencias > 0 ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10.5px] font-bold text-brand-dark"
                  title="Trechos entre [colchetes] precisam ser preenchidos antes de emitir"
                >
                  <Icon name="alert" className="h-3 w-3" />
                  {pendencias} lacuna(s)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10.5px] font-bold text-success">
                  <Icon name="check" className="h-3 w-3" />
                  Sem lacunas
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={novoDocumento}>
                <Icon name="plus" className="h-3.5 w-3.5" /> Novo
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={salvar} disabled={salvando}>
                {salvando ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="save" className="h-3.5 w-3.5" />}
                Salvar
              </button>
              <button type="button" className="btn btn-brand" onClick={gerarPdf} disabled={pdfCarregando}>
                {pdfCarregando ? <Spinner /> : <Icon name="download" />}
                Salvar PDF
              </button>
            </div>
          </div>

          <p className="no-print mb-3 text-[11.5px] text-slate-500">
            Todos os campos do documento são editáveis: clique diretamente no texto da folha para
            alterar títulos, rótulos, valores, parágrafos e assinaturas.
            {condoSelecionado?.logoUrl ? " A logo do condomínio já está no cabeçalho." : ""}
          </p>

          <DocumentPaper doc={doc} onChange={alterar} logoUrl={condoSelecionado?.logoUrl ?? null} />
        </section>
      </div>

      {toast ? (
        <div
          role="status"
          className={`no-print fixed bottom-4 right-4 z-50 max-w-sm rounded-xl px-4 py-3 text-[13px] font-semibold shadow-2xl ${
            toast.tipo === "ok" ? "bg-ink text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.texto}
        </div>
      ) : null}
    </>
  );
}
