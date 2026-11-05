"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, Spinner } from "./Icon";

export function IaForm({
  chaveMascarada,
  origem,
  modelo,
}: {
  chaveMascarada: string;
  origem: "banco" | "ambiente" | null;
  modelo: string;
}) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(modelo);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function salvar(extra?: { removerChave?: boolean }) {
    setSalvando(true);
    setMsg(null);
    try {
      const r = await fetch("/api/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, model, ...extra }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg({ ok: false, texto: j.erro ?? "Não foi possível salvar." });
        return false;
      }
      setApiKey("");
      setMsg({ ok: true, texto: extra?.removerChave ? "Chave removida." : "Configuração salva." });
      router.refresh();
      return true;
    } finally {
      setSalvando(false);
    }
  }

  async function testar() {
    if (apiKey.trim() || model !== modelo) {
      const ok = await salvar();
      if (!ok) return;
    }
    setTestando(true);
    setMsg(null);
    try {
      const r = await fetch("/api/ia/testar", { method: "POST" });
      const j = await r.json();
      setMsg(
        r.ok
          ? { ok: true, texto: `Conexão estabelecida com ${j.modelo}. A IA está pronta para redigir.` }
          : { ok: false, texto: j.erro ?? "Falha no teste da IA." },
      );
    } catch {
      setMsg({ ok: false, texto: "Falha de conexão ao testar a IA." });
    } finally {
      setTestando(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <label className="label" htmlFor="apikey">
          Chave de API do Gemini
        </label>
        <input
          id="apikey"
          type="password"
          autoComplete="off"
          className="field font-mono"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={chaveMascarada ? `Chave atual: ${chaveMascarada} — deixe em branco para manter` : "Cole aqui a chave (AIza…)"}
        />
        <p className="mt-1.5 text-[11.5px] text-slate-500">
          {origem === "ambiente"
            ? "Há uma chave configurada no ambiente do servidor (GEMINI_API_KEY). Informe outra aqui apenas se quiser substituí-la."
            : origem === "banco"
              ? "Chave salva no banco de dados."
              : "Nenhuma chave configurada ainda."}{" "}
          Gere uma chave gratuita em{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-brand-dark underline"
          >
            aistudio.google.com/apikey
          </a>
          .
        </p>
      </div>

      <div>
        <label className="label" htmlFor="modelo">
          Modelo
        </label>
        <input
          id="modelo"
          list="modelos-gemini"
          className="field font-mono"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <datalist id="modelos-gemini">
          <option value="gemini-2.5-flash" />
          <option value="gemini-2.5-flash-lite" />
          <option value="gemini-2.5-pro" />
          <option value="gemini-2.0-flash" />
        </datalist>
        <p className="mt-1.5 text-[11.5px] text-slate-500">
          Recomendado: <span className="font-mono">gemini-2.5-flash</span> (gratuito e com janela longa para
          ler convenções e regimentos).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary" onClick={() => salvar()} disabled={salvando || testando}>
          {salvando ? <Spinner /> : <Icon name="save" />} Salvar
        </button>
        <button type="button" className="btn btn-brand" onClick={testar} disabled={salvando || testando}>
          {testando ? <Spinner /> : <Icon name="sparkles" />} Testar conexão
        </button>
        {origem === "banco" ? (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => window.confirm("Remover a chave salva no banco?") && salvar({ removerChave: true })}
            disabled={salvando || testando}
          >
            <Icon name="trash" /> Remover chave salva
          </button>
        ) : null}
      </div>

      {msg ? (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-[12.5px] font-semibold ${
            msg.ok ? "bg-success-soft text-success" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.texto}
        </p>
      ) : null}
    </div>
  );
}
