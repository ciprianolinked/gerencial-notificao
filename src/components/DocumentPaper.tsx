"use client";

import type React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  MAX_BYTES_ORIGINAL,
  MAX_FOTOS,
  aceitaImagem,
  bytesDeDataUrl,
  prepararFoto,
  prepararLogo,
} from "@/lib/imagens";
import type { DocData } from "@/lib/types";
import { uid } from "@/lib/types";
import { Icon, Spinner } from "./Icon";

function Auto({
  value,
  onChange,
  className = "",
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const ajustar = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  };

  useLayoutEffect(ajustar, [value]);
  useEffect(() => {
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`inline-field ${className}`}
    />
  );
}

function Line({
  value,
  onChange,
  className = "",
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel: string;
}) {
  return (
    <input
      type="text"
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`inline-field ${className}`}
    />
  );
}

export function DocumentPaper({
  doc,
  onChange,
  logoUrl,
}: {
  doc: DocData;
  onChange: (patch: Partial<DocData>) => void;
  logoUrl?: string | null;
}) {
  const [logoErro, setLogoErro] = useState("");
  const logoExibida = doc.logoDataUrl || logoUrl;

  // ── Arrastar e soltar ────────────────────────────────────────────────────
  const [arrastandoSobre, setArrastandoSobre] = useState<"fotos" | "logo" | null>(null);
  const sobreProfundidade = useRef(0);
  const areaLogo = useRef<HTMLDivElement>(null);

  const arrastandoArquivos = (dt: DataTransfer | null) => {
    if (!dt) return false;
    // Chrome/Edge/Safari expõem "Files"; o Firefox pode listar apenas os itens.
    if (Array.from(dt.types ?? []).includes("Files")) return true;
    return Array.from(dt.items ?? []).some((item) => item.kind === "file");
  };

  const sobreLogo = (alvo: EventTarget | null) =>
    !!areaLogo.current && alvo instanceof Node && areaLogo.current.contains(alvo);

  function aoEntrarArrastando(e: React.DragEvent) {
    if (!arrastandoArquivos(e.dataTransfer)) return;
    e.preventDefault();
    sobreProfundidade.current += 1;
    setArrastandoSobre(sobreLogo(e.target) ? "logo" : "fotos");
  }

  function aoMoverArrastando(e: React.DragEvent) {
    if (!arrastandoArquivos(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setArrastandoSobre(sobreLogo(e.target) ? "logo" : "fotos");
  }

  function aoSairArrastando() {
    sobreProfundidade.current = Math.max(0, sobreProfundidade.current - 1);
    if (sobreProfundidade.current === 0) setArrastandoSobre(null);
  }

  function aoSoltar(e: React.DragEvent) {
    e.preventDefault();
    sobreProfundidade.current = 0;
    setArrastandoSobre(null);
    const arquivos = Array.from(e.dataTransfer.files ?? []);
    if (arquivos.length === 0) return;
    if (sobreLogo(e.target)) {
      void anexarLogo(arquivos[0]);
      if (arquivos.length > 1) {
        setLogoErro("A logo usa apenas o primeiro arquivo; as demais imagens não foram usadas.");
      }
      return;
    }
    void anexarFotos(arquivos);
  }

  async function anexarLogo(file?: File) {
    if (!file) return;
    setLogoErro("");
    try {
      onChange({ logoDataUrl: await prepararLogo(file) });
    } catch (e) {
      setLogoErro(e instanceof Error ? e.message : "Não foi possível ler a imagem. Tente outra.");
    }
  }

  const setCampo = (id: string, patch: Partial<{ label: string; value: string }>) =>
    onChange({ campos: doc.campos.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const setAss = (id: string, patch: Partial<{ nome: string; cargo: string }>) =>
    onChange({ assinaturas: doc.assinaturas.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const setDestaque = (patch: Partial<DocData["destaque"]>) =>
    onChange({ destaque: { ...doc.destaque, ...patch } });

  const [fotosErro, setFotosErro] = useState("");
  const fotosInput = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);

  async function anexarFotos(files: FileList | File[]) {
    const arquivos = Array.from(files);
    if (arquivos.length === 0) return;
    setFotosErro("");
    setProcessando(true);
    const novas: DocData["imagens"] = [];
    const recusadas: string[] = [];
    for (const arq of arquivos) {
      if (doc.imagens.length + novas.length >= MAX_FOTOS) {
        recusadas.push(`${arq.name} (limite de ${MAX_FOTOS} fotos)`);
        continue;
      }
      if (!aceitaImagem(arq) || arq.size > MAX_BYTES_ORIGINAL) {
        recusadas.push(`${arq.name} (use PNG, JPG ou WEBP de até 15 MB)`);
        continue;
      }
      try {
        const foto = await prepararFoto(arq);
        novas.push({ id: uid(), dataUrl: foto.dataUrl, legenda: "", largura: "inteira" });
      } catch {
        recusadas.push(`${arq.name} (não foi possível processar)`);
      }
    }
    setProcessando(false);
    if (novas.length > 0) onChange({ imagens: [...doc.imagens, ...novas] });
    if (recusadas.length > 0) setFotosErro(`Não anexadas: ${recusadas.join("; ")}.`);
    if (fotosInput.current) fotosInput.current.value = "";
  }

  const setImagem = (id: string, patch: Partial<DocData["imagens"][number]>) =>
    onChange({ imagens: doc.imagens.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const setGaleria = (patch: Partial<DocData["galeria"]>) =>
    onChange({ galeria: { ...doc.galeria, ...patch } });
  const totalFotosBytes = doc.imagens.reduce((s, i) => s + bytesDeDataUrl(i.dataUrl), 0);

  const galeria =
    doc.imagens.length > 0 ? (
      <div className="mt-6">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <Line
            value={doc.galeria.titulo}
            onChange={(v) => setGaleria({ titulo: v })}
            ariaLabel="Título do bloco de fotos"
            placeholder="Registro fotográfico"
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b6b7d]"
          />
          <label className="no-print flex items-center gap-1.5 text-[11px] text-slate-500">
            Posição:
            <select
              value={doc.galeria.posicao}
              onChange={(e) =>
                setGaleria({ posicao: e.target.value === "inicio" ? "inicio" : "fim" })
              }
              aria-label="Posição das fotos no documento"
              className="cursor-pointer rounded-md border border-line bg-white px-1.5 py-0.5 text-[11px] font-bold text-ink"
            >
              <option value="fim">Após o texto</option>
              <option value="inicio">Antes do texto</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          {doc.imagens.map((img, idx) => (
            <figure
              key={img.id}
              className={`group/foto relative ${img.largura === "meia" ? "" : "col-span-2"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.dataUrl}
                alt={img.legenda || `Foto ${idx + 1}`}
                className="mx-auto max-h-[420px] w-auto max-w-full border border-line object-contain"
              />
              <figcaption className="no-print mt-1 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400">Foto {idx + 1}</span>
                <Line
                  value={img.legenda}
                  onChange={(v) => setImagem(img.id, { legenda: v })}
                  ariaLabel={`Legenda da foto ${idx + 1}`}
                  placeholder="Legenda (ex.: fachada do bloco A)"
                  className="text-center text-[11.5px] text-slate-600"
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({ imagens: doc.imagens.filter((x) => x.id !== img.id) })
                  }
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remover foto ${idx + 1}`}
                  title="Remover foto"
                >
                  <Icon name="x" className="h-3.5 w-3.5" />
                </button>
              </figcaption>
              <div className="no-print mt-1 flex justify-center gap-1.5">
                {(["inteira", "meia"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setImagem(img.id, { largura: l })}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold transition ${
                      img.largura === l
                        ? "border-ink bg-ink text-white"
                        : "border-line text-slate-500 hover:bg-paper"
                    }`}
                  >
                    {l === "inteira" ? "Largura total" : "Meia largura"}
                  </button>
                ))}
              </div>
            </figure>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <article
      onDragEnter={aoEntrarArrastando}
      onDragOver={aoMoverArrastando}
      onDragLeave={aoSairArrastando}
      onDrop={aoSoltar}
      className={`relative mx-auto w-full max-w-[860px] border bg-white px-5 py-8 text-[#23233a] shadow-[0_1px_2px_rgba(24,20,71,0.06),0_30px_60px_-40px_rgba(24,20,71,0.45)] transition-colors sm:px-14 sm:py-12 ${
        arrastandoSobre === "fotos" ? "border-brand ring-2 ring-brand/40" : "border-line"
      }`}
    >
      {arrastandoSobre === "fotos" ? (
        <div className="no-print pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-[inherit] bg-brand-soft/85 p-6 text-center">
          <div>
            <Icon name="upload" className="mx-auto h-8 w-8 text-brand-dark" />
            <p className="mt-2 font-display text-[18px] text-ink">Solte as fotos aqui</p>
            <p className="mt-1 text-[12px] text-brand-dark">
              Elas entram no documento já reduzidas e com legenda editável.
            </p>
          </div>
        </div>
      ) : null}

      {/* Cabeçalho: Gerencial à esquerda, informações ao centro e logo anexada à direita. */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] items-start gap-2 sm:gap-4">
        <div className="flex min-h-[88px] items-start pt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/marca/logo-doc.png"
            alt="Gerencial — Governança Condominial"
            className="h-auto w-full max-w-[150px] object-contain"
          />
        </div>
        <div className="min-w-0 pt-1 text-center text-[11px] sm:text-[12px]">
          <div className="font-bold text-ink">
            <span>Nº</span>
            <Line
              value={doc.numero}
              onChange={(v) => onChange({ numero: v })}
              placeholder="gerado ao salvar"
              ariaLabel="Número do documento"
              className="mt-1 text-center font-mono text-[11px] font-bold sm:text-[12px]"
            />
          </div>
          <div className="mt-2 text-slate-500">
            <Line
              value={doc.local}
              onChange={(v) => onChange({ local: v })}
              placeholder="Cidade"
              ariaLabel="Cidade"
              className="text-center"
            />
            <Line
              value={doc.data}
              onChange={(v) => onChange({ data: v })}
              placeholder="Data"
              ariaLabel="Data"
              className="mt-1 text-center"
            />
          </div>
        </div>
        <div ref={areaLogo} className="flex min-w-0 flex-col items-end gap-1 text-right">
          <div
            className={`flex h-[60px] w-full items-center justify-end rounded-md p-1 transition sm:h-[70px] ${
              arrastandoSobre === "logo" ? "bg-brand-soft ring-2 ring-brand" : ""
            }`}
          >
            {logoExibida ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoExibida}
                alt={`Logo no documento — ${doc.condominio}`}
                className="max-h-full max-w-full object-contain object-right"
              />
            ) : (
              <span className="no-print flex h-full w-full flex-col items-center justify-center rounded-md border border-dashed border-line text-center text-[10px] leading-tight text-slate-400 sm:text-[11px]">
                <Icon name="upload" className="mb-0.5 h-3.5 w-3.5" />
                {arrastandoSobre === "logo" ? "Solte a logo" : "Arraste a logo aqui"}
              </span>
            )}
          </div>
          <label className="no-print cursor-pointer text-[10px] font-bold text-brand-dark hover:underline">
            {doc.logoDataUrl ? "Trocar logo" : "ou clique para anexar a logo"}
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              aria-label="Anexar logo ao documento (PNG ou JPG)"
              onChange={(e) => {
                void anexarLogo(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {doc.logoDataUrl ? (
            <button
              type="button"
              className="no-print text-[10px] text-slate-500 hover:text-red-600 hover:underline"
              onClick={() => onChange({ logoDataUrl: "" })}
            >
              Remover anexo{logoUrl ? " · usar logo do condomínio" : ""}
            </button>
          ) : null}
          {logoErro ? <span role="alert" className="no-print text-[10px] text-red-600">{logoErro}</span> : null}
        </div>
      </div>
      <div className="mt-3 flex h-[3px]">
        <div className="w-16 bg-brand" />
        <div className="flex-1 bg-ink" />
      </div>

      {/* Título */}
      <div className="mt-6">
        <Auto
          value={doc.titulo}
          onChange={(v) => onChange({ titulo: v })}
          ariaLabel="Título do documento"
          className="font-display text-[20px] uppercase leading-tight tracking-wide text-ink sm:text-[24px]"
        />
        <Auto
          value={doc.subtitulo}
          onChange={(v) => onChange({ subtitulo: v })}
          ariaLabel="Subtítulo"
          placeholder="Subtítulo (opcional)"
          className="mt-1 text-[13px] text-slate-500"
        />
      </div>

      {/* Condomínio */}
      <div className="mt-5 border-l-[3px] border-brand bg-paper px-4 py-2.5">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#6b6b7d]">Condomínio</p>
        <Line
          value={doc.condominio}
          onChange={(v) => onChange({ condominio: v })}
          ariaLabel="Nome do condomínio"
          placeholder="Nome do condomínio"
          className="mt-0.5 text-[15px] font-bold text-ink"
        />
        <Auto
          value={doc.condominioInfo}
          onChange={(v) => onChange({ condominioInfo: v })}
          ariaLabel="Dados do condomínio"
          placeholder="CNPJ · Endereço"
          className="text-[12px] text-slate-500"
        />
      </div>

      {/* Quadro de identificação */}
      <div className="mt-4 border border-line">
        {doc.campos.map((c) => (
          <div key={c.id} className="group/row flex border-b border-line">
            <div className="w-[36%] shrink-0 bg-paper px-3 py-2.5 sm:w-[32%]">
              <Auto
                value={c.label}
                onChange={(v) => setCampo(c.id, { label: v })}
                ariaLabel="Nome do campo"
                placeholder="Campo"
                className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b6b7d]"
              />
            </div>
            <div className="min-w-0 flex-1 px-3 py-2.5">
              <Auto
                value={c.value}
                onChange={(v) => setCampo(c.id, { value: v })}
                ariaLabel={`Valor: ${c.label}`}
                placeholder="Preencha"
                className="text-[13px] text-ink"
              />
            </div>
            <button
              type="button"
              onClick={() => onChange({ campos: doc.campos.filter((x) => x.id !== c.id) })}
              className="no-print w-0 shrink-0 overflow-hidden text-slate-400 opacity-0 transition-all hover:text-red-600 focus:w-8 focus:opacity-100 group-hover/row:w-8 group-hover/row:opacity-100"
              aria-label={`Remover campo ${c.label}`}
              title="Remover campo"
            >
              <Icon name="x" className="mx-auto h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({ campos: [...doc.campos, { id: uid(), label: "Novo campo", value: "" }] })
          }
          className="no-print flex w-full items-center justify-center gap-1.5 bg-white px-3 py-2 text-[11px] font-bold text-brand-dark transition hover:bg-brand-soft"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          Adicionar campo ao quadro
        </button>
      </div>

      {/* Destaque */}
      {doc.destaque.ativo ? (
        <div className="group/dest relative mt-4 rounded-md border border-brand bg-brand-soft px-4 py-3">
          <button
            type="button"
            onClick={() => setDestaque({ ativo: false })}
            className="no-print absolute right-2 top-2 rounded p-1 text-slate-400 opacity-0 transition hover:text-red-600 focus:opacity-100 group-hover/dest:opacity-100"
            aria-label="Remover quadro de destaque"
            title="Remover destaque"
          >
            <Icon name="x" className="h-3.5 w-3.5" />
          </button>
          <Line
            value={doc.destaque.label}
            onChange={(v) => setDestaque({ label: v })}
            ariaLabel="Rótulo do destaque"
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-dark"
          />
          <Line
            value={doc.destaque.value}
            onChange={(v) => setDestaque({ value: v })}
            ariaLabel="Valor do destaque"
            placeholder="R$ 0,00"
            className="mt-1 font-display text-[26px] leading-tight text-ink"
          />
          <Line
            value={doc.destaque.nota}
            onChange={(v) => setDestaque({ nota: v })}
            ariaLabel="Observação do destaque"
            placeholder="Observação (ex.: valor por extenso)"
            className="mt-0.5 text-[12px] text-slate-600"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDestaque({ ativo: true })}
          className="no-print mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-line px-3 py-1.5 text-[11px] font-bold text-slate-500 transition hover:border-brand hover:bg-brand-soft hover:text-brand-dark"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          Adicionar quadro de destaque (ex.: valor)
        </button>
      )}

      {/* Texto */}
      <div className="mt-6">
        <Auto
          value={doc.saudacao}
          onChange={(v) => onChange({ saudacao: v })}
          ariaLabel="Saudação"
          placeholder="Saudação"
          className="text-[14px]"
        />
        <Auto
          value={doc.corpo}
          onChange={(v) => onChange({ corpo: v })}
          ariaLabel="Texto do documento"
          placeholder="Texto do documento"
          className="mt-3 text-justify text-[14px] leading-[1.65]"
        />
        <Auto
          value={doc.fechamento}
          onChange={(v) => onChange({ fechamento: v })}
          ariaLabel="Fechamento"
          placeholder="Fechamento"
          className="mt-4 text-[14px]"
        />
      </div>

      {/* Fotos (após o texto, quando escolhido) */}
      {doc.galeria.posicao === "fim" ? galeria : null}

      {/* Anexar fotos */}
      <div className="no-print mt-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-line px-3.5 py-2.5">
        <label className={`btn btn-ghost btn-sm ${processando ? "pointer-events-none opacity-60" : ""}`}>
          {processando ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : (
            <Icon name="upload" className="h-3.5 w-3.5" />
          )}
          {processando ? "Processando fotos…" : "Anexar fotos"}
          <input
            ref={fotosInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="sr-only"
            aria-label="Anexar fotos ao documento"
            onChange={(e) => {
              void anexarFotos(e.target.files ?? []);
            }}
          />
        </label>
        <p className="text-[11px] leading-snug text-slate-500">
          Arraste as fotos para qualquer ponto desta folha ou clique em “Anexar fotos”. PNG, JPG ou
          WEBP até 15 MB · até {MAX_FOTOS} fotos
          {doc.imagens.length > 0
            ? ` · ${doc.imagens.length} anexada(s), ${(totalFotosBytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB no total`
            : ""}
        </p>
      </div>
      {fotosErro ? (
        <p role="alert" className="no-print mt-1.5 text-[11px] text-red-600">
          {fotosErro}
        </p>
      ) : null}

      {/* Assinaturas */}
      <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-3">
        {doc.assinaturas.map((a) => (
          <div key={a.id} className="group/ass relative pt-8">
            <button
              type="button"
              onClick={() => onChange({ assinaturas: doc.assinaturas.filter((x) => x.id !== a.id) })}
              className="no-print absolute right-0 top-0 rounded p-1 text-slate-400 opacity-0 transition hover:text-red-600 focus:opacity-100 group-hover/ass:opacity-100"
              aria-label="Remover assinatura"
              title="Remover assinatura"
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
            <div className="border-t border-ink pt-1.5 text-center">
              <Line
                value={a.nome}
                onChange={(v) => setAss(a.id, { nome: v })}
                ariaLabel="Nome do signatário"
                placeholder="Nome"
                className="text-center text-[12.5px] font-bold text-ink"
              />
              <Line
                value={a.cargo}
                onChange={(v) => setAss(a.id, { cargo: v })}
                ariaLabel="Cargo do signatário"
                placeholder="Cargo / observação"
                className="mt-0.5 text-center text-[11.5px] text-slate-500"
              />
            </div>
          </div>
        ))}
        <div className="no-print flex items-end">
          <button
            type="button"
            onClick={() =>
              onChange({
                assinaturas: [...doc.assinaturas, { id: uid(), nome: "[Nome]", cargo: "[Cargo]" }],
              })
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-line px-3 py-1.5 text-[11px] font-bold text-slate-500 transition hover:border-brand hover:bg-brand-soft hover:text-brand-dark"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Adicionar assinatura
          </button>
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-10 border-t border-line pt-3">
        <Auto
          value={doc.rodape}
          onChange={(v) => onChange({ rodape: v })}
          ariaLabel="Rodapé"
          placeholder="Rodapé"
          className="text-[11px] text-slate-500"
        />
      </div>
    </article>
  );
}
