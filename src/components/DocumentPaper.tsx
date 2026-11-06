"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  MAX_BYTES_ORIGINAL,
  MAX_FOTOS,
  aceitaImagem,
  bytesDeDataUrl,
  prepararFoto,
} from "@/lib/imagens";
import { dimensoesImagem } from "@/lib/imagem-dimensoes";
import { FOTO_GAP_MM, linhasDeFotos } from "@/lib/documento-layout";
import {
  assuntoEmCaixaDeFrase,
  CANAIS_COMUNICACAO,
  FECHAMENTO_PADRAO,
  NOME_GERENCIAL,
} from "@/lib/padrao-documento";
import type { DocData, TipoDoc } from "@/lib/types";
import { normalizarTexto, uid } from "@/lib/types";
import { Icon, Spinner } from "./Icon";
import { LogoCabecalho } from "./LogoCabecalho";

function Auto({
  value,
  onChange,
  className = "",
  placeholder,
  ariaLabel,
  onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel: string;
  onBlur?: () => void;
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
      onBlur={onBlur}
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
  tipo,
  onChange,
  logoUrl,
}: {
  doc: DocData;
  tipo: TipoDoc;
  onChange: (patch: Partial<DocData>) => void;
  logoUrl?: string | null;
}) {
  const [logoErro, setLogoErro] = useState("");
  const logoExibida = doc.logoDataUrl || logoUrl;

  async function anexarLogo(file?: File) {
    if (!file) return;
    setLogoErro("");
    if (!(["image/png", "image/jpeg"].includes(file.type)) || file.size > 2 * 1024 * 1024) {
      setLogoErro("Envie um PNG ou JPG de até 2 MB.");
      return;
    }
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () =>
          typeof leitor.result === "string" ? resolve(leitor.result) : reject(new Error("Formato inválido"));
        leitor.onerror = () => reject(new Error("Falha ao ler a imagem"));
        leitor.readAsDataURL(file);
      });
      onChange({ logoDataUrl: url });
    } catch {
      setLogoErro("Não foi possível ler a imagem. Tente outra.");
    }
  }

  const setCampo = (id: string, patch: Partial<{ label: string; value: string }>) =>
    onChange({ campos: doc.campos.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const setDestaque = (patch: Partial<DocData["destaque"]>) =>
    onChange({ destaque: { ...doc.destaque, ...patch } });

  const [fotosErro, setFotosErro] = useState("");
  const fotosInput = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const [arrastandoFoto, setArrastandoFoto] = useState(false);

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
      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Line
            value={doc.galeria.titulo}
            onChange={(v) => setGaleria({ titulo: v })}
            ariaLabel="Título do bloco de fotos"
            placeholder="Registro fotográfico"
            className="text-[7.5pt] font-bold uppercase tracking-[0.08em] text-[#6b6b7d]"
          />
          <span className="no-print text-[10px] text-slate-400">Após o texto</span>
        </div>

        <div className="flex flex-col" style={{ gap: `${FOTO_GAP_MM}mm` }}>
          {linhasDeFotos(doc.imagens).map((linha, linhaIdx) => (
            <div
              key={linhaIdx}
              className="document-photo-row grid grid-cols-2"
              style={{ gap: `${FOTO_GAP_MM}mm` }}
            >
              {linha.map((img) => {
                const idx = doc.imagens.findIndex((x) => x.id === img.id);
                const dim = dimensoesImagem(img.dataUrl);
                return (
                  <figure
                    key={img.id}
                    className={`group/foto relative min-w-0 ${img.largura === "meia" ? "" : "col-span-2"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.dataUrl}
                      alt={img.legenda || `Foto ${idx + 1}`}
                      style={{ aspectRatio: `${dim.largura} / ${dim.altura}` }}
                      className="document-photo mx-auto border border-line"
                    />
                    <figcaption className="mt-1 text-center text-[8.5pt] leading-snug text-slate-500">
                      <span className="print-only">
                        {img.legenda.trim() ? `Foto ${idx + 1} — ${img.legenda}` : `Foto ${idx + 1}`}
                      </span>
                      <div className="no-print flex items-center gap-1.5">
                        <span className="shrink-0 text-[10px] font-bold text-slate-400">Foto {idx + 1}</span>
                        <Line
                          value={img.legenda}
                          onChange={(v) => setImagem(img.id, { legenda: v })}
                          ariaLabel={`Legenda da foto ${idx + 1}`}
                          placeholder="Legenda (ex.: fachada do bloco A)"
                          className="text-center"
                        />
                        <button
                          type="button"
                          onClick={() => onChange({ imagens: doc.imagens.filter((x) => x.id !== img.id) })}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Remover foto ${idx + 1}`}
                          title="Remover foto"
                        >
                          <Icon name="x" className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
                );
              })}
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="document-paper-frame">
    <article
      data-tipo={tipo}
      onDragOver={(e) => {
        // Só intercepta arquivos: arrastar texto dentro do documento continua normal.
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setArrastandoFoto(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setArrastandoFoto(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setArrastandoFoto(false);
        const arquivos = Array.from(e.dataTransfer.files ?? []);
        if (arquivos.length > 0) void anexarFotos(arquivos);
      }}
      className={`document-paper relative mx-auto border bg-white text-[#23233a] shadow-[0_1px_2px_rgba(24,20,71,0.06),0_30px_60px_-40px_rgba(24,20,71,0.45)] ${
        arrastandoFoto ? "border-brand ring-2 ring-brand/60" : "border-line"
      }`}
    >
      {arrastandoFoto ? (
        <div className="pointer-events-none sticky top-24 z-20 mx-auto mb-4 flex w-max max-w-[90%] items-center gap-2 rounded-full bg-brand px-4 py-2 text-[12.5px] font-bold text-ink-deep shadow-lg">
          <Icon name="upload" className="h-4 w-4" />
          Solte as fotos aqui para anexar ao documento
        </div>
      ) : null}
      {/* Logos com caixas iguais, alinhadas no mesmo eixo, sem esticar a marca. */}
      <div className="document-header">
        <div className="min-w-0">
          <LogoCabecalho
            src="/marca/logo-doc.png"
            alt="Gerencial — Governança Condominial"
            lado="esquerda"
          />
        </div>
        <div className="document-header-identity text-[11px] sm:text-[12px]">
          <div className="font-bold text-ink">
            <span>Nº</span>
            <Auto
              value={doc.numero}
              onChange={(v) => onChange({ numero: v })}
              placeholder="gerado ao salvar"
              ariaLabel="Número do documento"
              className="mt-1 text-center font-mono text-[11px] font-bold sm:text-[12px]"
            />
          </div>
          <div className="mt-2 text-slate-500">
            <Auto
              value={doc.local}
              onChange={(v) => onChange({ local: v })}
              placeholder="Cidade"
              ariaLabel="Cidade"
              className="text-center"
            />
            <Auto
              value={doc.data}
              onChange={(v) => onChange({ data: v })}
              placeholder="Data"
              ariaLabel="Data"
              className="mt-1 text-center"
            />
          </div>
        </div>
        <div className="flex min-w-0 justify-end">
          {logoExibida ? (
            <LogoCabecalho
              src={logoExibida}
              alt={`Logo no documento — ${doc.condominio}`}
              lado="direita"
              ajustarMargens
            />
          ) : (
            <span className="document-header-logo no-print flex items-center justify-center rounded-md border border-dashed border-line text-center text-[10px] text-slate-400 sm:text-[11px]">
              Logo do documento
            </span>
          )}
        </div>
        <div className="document-header-controls no-print flex flex-wrap justify-end gap-x-3 gap-y-1 text-right">
          <label className="cursor-pointer text-[10px] font-bold text-brand-dark hover:underline">
            {doc.logoDataUrl ? "Trocar logo" : "Anexar logo"}
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
              className="text-[10px] text-slate-500 hover:text-red-600 hover:underline"
              onClick={() => onChange({ logoDataUrl: "" })}
            >
              Remover anexo{logoUrl ? " · usar logo do condomínio" : ""}
            </button>
          ) : null}
          {logoErro ? <span role="alert" className="text-[10px] text-red-600">{logoErro}</span> : null}
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
          className="font-display text-[16pt] uppercase leading-tight tracking-wide text-ink"
        />
        <Auto
          value={doc.subtitulo}
          onChange={(v) => onChange({ subtitulo: v })}
          ariaLabel="Subtítulo"
          placeholder="Subtítulo (opcional)"
          className="mt-1 text-[9.5pt] text-slate-500"
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
          className="mt-0.5 text-[11pt] font-bold text-ink"
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
                onBlur={() => {
                  if (/^(assunto|infracao)$/.test(normalizarTexto(c.label))) {
                    setCampo(c.id, { value: assuntoEmCaixaDeFrase(c.value) });
                  }
                }}
                ariaLabel={`Valor: ${c.label}`}
                placeholder="Preencha"
                className="text-[9.5pt] text-ink"
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
      <div className="document-body mt-4">
        <Auto
          value={doc.saudacao}
          onChange={(v) => onChange({ saudacao: v })}
          ariaLabel="Saudação"
          placeholder="Saudação"
          className="text-[10.5pt]"
        />
        <Auto
          value={doc.corpo}
          onChange={(v) => onChange({ corpo: v })}
          ariaLabel="Texto do documento"
          placeholder="Texto do documento"
          className="mt-2 text-justify text-[10pt] leading-[1.5]"
        />
      </div>

      {/* Fotos sempre após o texto, antes do fechamento institucional. */}
      {galeria}

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
        <p className="text-[11px] text-slate-500">
          Arraste as fotos para a folha ou selecione abaixo · PNG, JPG ou WEBP até 15 MB · até{" "}
          {MAX_FOTOS} fotos
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

      {/* Fechamento, canais e assinatura única permanecem juntos na página. */}
      <div className="document-signature-block mt-5">
        <p className="text-[10pt]">{FECHAMENTO_PADRAO}</p>

        <div className="mt-4 text-[9pt] leading-[1.5] text-slate-600">
          <p className="text-[7.5pt] font-bold uppercase tracking-[0.08em] text-[#6b6b7d]">
            Canais de comunicação
          </p>
          {CANAIS_COMUNICACAO.map((canal) => (
            <p key={canal.rotulo}>
              <span className="font-bold text-ink">{canal.rotulo}:</span>{" "}
              {"href" in canal && canal.href ? (
                <a href={canal.href} target="_blank" rel="noreferrer" className="break-all text-ink underline">
                  {canal.valor}
                </a>
              ) : (
                canal.valor
              )}
            </p>
          ))}
        </div>

        <div className="mx-auto mt-7 max-w-[380px] border-t border-ink pt-1.5 text-center">
          <p className="text-[10pt] font-bold text-ink">{NOME_GERENCIAL}</p>
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-10 border-t border-line pt-3">
        <Auto
          value={doc.rodape}
          onChange={(v) => onChange({ rodape: v })}
          ariaLabel="Rodapé"
          placeholder="Rodapé"
          className="text-[7.5pt] text-slate-500"
        />
      </div>
    </article>
    </div>
  );
}
