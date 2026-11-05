"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DocData } from "@/lib/types";
import { uid } from "@/lib/types";
import { Icon } from "./Icon";

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
  const setAss = (id: string, patch: Partial<{ nome: string; cargo: string }>) =>
    onChange({ assinaturas: doc.assinaturas.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const setDestaque = (patch: Partial<DocData["destaque"]>) =>
    onChange({ destaque: { ...doc.destaque, ...patch } });

  return (
    <article className="mx-auto w-full max-w-[860px] border border-line bg-white px-5 py-8 text-[#23233a] shadow-[0_1px_2px_rgba(24,20,71,0.06),0_30px_60px_-40px_rgba(24,20,71,0.45)] sm:px-14 sm:py-12">
      {/* Cabeçalho: Gerencial à esquerda, informações ao centro e logo anexada à direita. */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] items-start gap-2 sm:gap-4">
        <div className="flex min-h-[88px] items-start pt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/identidade/logo-doc.png"
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
        <div className="flex min-w-0 flex-col items-end gap-1 text-right">
          <div className="flex h-[60px] w-full items-center justify-end sm:h-[70px]">
            {logoExibida ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoExibida}
                alt={`Logo no documento — ${doc.condominio}`}
                className="max-h-full max-w-full object-contain object-right"
              />
            ) : (
              <span className="no-print flex h-full w-full items-center justify-center rounded-md border border-dashed border-line text-center text-[10px] text-slate-400 sm:text-[11px]">
                Logo do documento
              </span>
            )}
          </div>
          <label className="no-print cursor-pointer text-[10px] font-bold text-brand-dark hover:underline">
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
