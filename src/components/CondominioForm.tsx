"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, Spinner } from "./Icon";

export type CondominioValores = {
  nome: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  uf: string;
  sindico: string;
  gestor: string;
  observacoes: string;
};

const VAZIO: CondominioValores = {
  nome: "",
  cnpj: "",
  endereco: "",
  cidade: "",
  uf: "",
  sindico: "",
  gestor: "",
  observacoes: "",
};

export function CondominioForm({
  id,
  inicial,
  logoUrl,
}: {
  id?: string;
  inicial?: CondominioValores;
  logoUrl?: string | null;
}) {
  const router = useRouter();
  const editando = !!id;
  const [v, setV] = useState<CondominioValores>(inicial ?? VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [logoAtual, setLogoAtual] = useState<string | null>(logoUrl ?? null);
  const [logoArquivo, setLogoArquivo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const set = (k: keyof CondominioValores) => (e: { target: { value: string } }) =>
    setV((s) => ({ ...s, [k]: e.target.value }));

  async function buscarCnpj() {
    setBuscandoCnpj(true);
    setMsg(null);
    try {
      const r = await fetch("/api/ia/cnpj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj: v.cnpj }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg({ ok: false, texto: j.erro ?? "Não foi possível consultar o CNPJ." });
        return;
      }
      const d = j.dados as Partial<CondominioValores>;
      setV((s) => ({
        ...s,
        nome: d.nome || s.nome,
        cnpj: d.cnpj || s.cnpj,
        endereco: d.endereco ?? s.endereco,
        cidade: d.cidade ?? s.cidade,
        uf: d.uf ?? s.uf,
      }));
      setMsg({
        ok: true,
        texto: `Dados preenchidos via ${j.fonte}${j.viaIA ? " e organizados pela IA" : ""}${
          j.situacao ? ` · Situação cadastral: ${j.situacao}` : ""
        }. Revise e edite antes de salvar.`,
      });
    } catch {
      setMsg({ ok: false, texto: "Falha de conexão ao consultar o CNPJ." });
    } finally {
      setBuscandoCnpj(false);
    }
  }

  function escolherLogo(file: File | undefined) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setMsg({ ok: false, texto: "A logo deve ter até 3 MB." });
      return;
    }
    setLogoArquivo(file);
    setLogoPreview(URL.createObjectURL(file));
    setMsg({ ok: true, texto: "Logo selecionada. Ela será enviada ao salvar o condomínio." });
  }

  async function enviarLogo(condoId: string): Promise<boolean> {
    if (!logoArquivo) return true;
    const fd = new FormData();
    fd.append("arquivo", logoArquivo);
    const r = await fetch(`/api/condominios/${condoId}/logo`, { method: "POST", body: fd });
    const j = await r.json();
    if (!r.ok) {
      setMsg({ ok: false, texto: j.erro ?? "Condomínio salvo, mas a logo não foi enviada." });
      return false;
    }
    setLogoAtual(j.logoUrl as string);
    setLogoArquivo(null);
    setLogoPreview(null);
    return true;
  }

  async function removerLogo() {
    if (!id) return;
    if (!window.confirm("Remover a logo deste condomínio?")) return;
    const r = await fetch(`/api/condominios/${id}/logo`, { method: "DELETE" });
    if (r.ok) {
      setLogoAtual(null);
      setLogoArquivo(null);
      setLogoPreview(null);
      router.refresh();
    } else {
      setMsg({ ok: false, texto: "Não foi possível remover a logo." });
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMsg(null);
    try {
      const r = await fetch(editando ? `/api/condominios/${id}` : "/api/condominios", {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg({ ok: false, texto: j.erro ?? "Não foi possível salvar." });
        return;
      }
      const condoId = (editando ? id : j.id) as string;
      const logoOk = await enviarLogo(condoId);
      if (editando) {
        if (logoOk) setMsg({ ok: true, texto: "Dados do condomínio atualizados." });
        router.refresh();
      } else {
        router.push(`/condominios/${condoId}`);
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, texto: "Falha de conexão. Tente novamente." });
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (
      !window.confirm(
        "Excluir este condomínio e TODA a documentação enviada para ele? Os documentos já elaborados continuam salvos, sem vínculo.",
      )
    ) {
      return;
    }
    const r = await fetch(`/api/condominios/${id}`, { method: "DELETE" });
    if (r.ok) {
      router.push("/condominios");
      router.refresh();
    } else {
      setMsg({ ok: false, texto: "Não foi possível excluir." });
    }
  }

  const preview = logoPreview ?? logoAtual;

  return (
    <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-6">
      <div className="sm:col-span-4">
        <label className="label" htmlFor="c-nome">
          Nome do condomínio *
        </label>
        <input
          id="c-nome"
          required
          className="field"
          value={v.nome}
          onChange={set("nome")}
          placeholder="Condomínio Residencial Alta Vista"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="c-cnpj">
          CNPJ
        </label>
        <input
          id="c-cnpj"
          className="field"
          value={v.cnpj}
          onChange={set("cnpj")}
          placeholder="00.000.000/0000-00"
          inputMode="numeric"
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm mt-1.5 w-full"
          onClick={buscarCnpj}
          disabled={buscandoCnpj || v.cnpj.replace(/\D/g, "").length !== 14}
          title="Consulta a Receita (BrasilAPI/ReceitaWS) e organiza os campos com a IA"
        >
          {buscandoCnpj ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="sparkles" className="h-3.5 w-3.5" />}
          {buscandoCnpj ? "Consultando…" : "Puxar dados do CNPJ"}
        </button>
      </div>

      {/* Logo do condomínio */}
      <div className="rounded-xl border border-line bg-paper/50 p-3 sm:col-span-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-16 w-28 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Logo do condomínio" className="max-h-14 max-w-[104px] object-contain" />
            ) : (
              <Icon name="building" className="h-6 w-6 text-slate-300" />
            )}
          </div>
          <div className="min-w-[220px] flex-1">
            <p className="label !mb-1">Logo do condomínio</p>
            <p className="text-[11.5px] leading-snug text-slate-500">
              PNG ou JPG, até 3 MB. Entra automaticamente no cabeçalho das notificações, multas e
              comunicados (tela e PDF) deste condomínio.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="btn btn-ghost btn-sm">
                <Icon name="upload" className="h-3.5 w-3.5" />
                {preview ? "Trocar imagem" : "Enviar logo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    escolherLogo(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {logoAtual && !logoArquivo && id ? (
                <button type="button" className="btn btn-danger btn-sm" onClick={removerLogo}>
                  <Icon name="trash" className="h-3.5 w-3.5" /> Remover logo
                </button>
              ) : null}
              {logoArquivo ? (
                <span className="self-center text-[11px] font-semibold text-brand-dark">
                  Nova imagem pendente de salvamento
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="sm:col-span-3">
        <label className="label" htmlFor="c-end">
          Endereço
        </label>
        <input id="c-end" className="field" value={v.endereco} onChange={set("endereco")} placeholder="Rua, número, bairro" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="c-cid">
          Cidade
        </label>
        <input id="c-cid" className="field" value={v.cidade} onChange={set("cidade")} />
      </div>
      <div className="sm:col-span-1">
        <label className="label" htmlFor="c-uf">
          UF
        </label>
        <input id="c-uf" maxLength={2} className="field uppercase" value={v.uf} onChange={set("uf")} />
      </div>
      <div className="sm:col-span-3">
        <label className="label" htmlFor="c-sin">
          Síndico(a)
        </label>
        <input id="c-sin" className="field" value={v.sindico} onChange={set("sindico")} />
      </div>
      <div className="sm:col-span-3">
        <label className="label" htmlFor="c-ges">
          Gestor(a) responsável na Gerencial
        </label>
        <input id="c-ges" className="field" value={v.gestor} onChange={set("gestor")} />
      </div>
      <div className="sm:col-span-6">
        <label className="label" htmlFor="c-obs">
          Observações internas
        </label>
        <textarea id="c-obs" rows={2} className="field" value={v.observacoes} onChange={set("observacoes")} />
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:col-span-6">
        <button type="submit" className="btn btn-primary" disabled={salvando}>
          {salvando ? <Spinner /> : <Icon name="save" />}
          {editando ? "Salvar alterações" : "Cadastrar condomínio"}
        </button>
        {editando ? (
          <button type="button" className="btn btn-danger" onClick={excluir}>
            <Icon name="trash" /> Excluir condomínio
          </button>
        ) : null}
      </div>
      {msg ? (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-[12px] font-semibold sm:col-span-6 ${
            msg.ok ? "bg-success-soft text-success" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.texto}
        </p>
      ) : null}
    </form>
  );
}
