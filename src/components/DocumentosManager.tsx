"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { tamanhoLegivel } from "@/lib/format";
import { Icon, Spinner } from "./Icon";

export type DocItem = {
  id: string;
  nome: string;
  categoria: string;
  tamanho: number;
  status: string;
  aviso: string | null;
  caracteres: number;
  criadoEm: string;
};

const CATEGORIAS = [
  "Convenção",
  "Regimento Interno",
  "Ata de Assembleia",
  "Regulamento / Circular",
  "Contrato",
  "Outro",
];

export function DocumentosManager({
  condominioId,
  docs,
  iaAtiva,
}: {
  condominioId: string;
  docs: DocItem[];
  iaAtiva: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function enviar(files: FileList | File[]) {
    const arquivos = Array.from(files);
    if (arquivos.length === 0) return;
    setEnviando(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("categoria", categoria);
      arquivos.forEach((f) => fd.append("arquivos", f));
      const r = await fetch(`/api/condominios/${condominioId}/documentos`, {
        method: "POST",
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg({ ok: false, texto: j.erro ?? "Não foi possível enviar os arquivos." });
        return;
      }
      const criados = (j.criados ?? []) as { nome: string; status: string }[];
      const semTexto = criados.filter((c) => c.status !== "ok").length;
      const recusados = (j.recusados ?? []) as string[];
      setMsg({
        ok: recusados.length === 0 && semTexto === 0,
        texto:
          `${criados.length} arquivo(s) guardado(s) no banco de dados.` +
          (semTexto ? ` ${semTexto} sem texto lido (veja o aviso na lista).` : "") +
          (recusados.length ? ` Recusados: ${recusados.join(", ")}.` : ""),
      });
      router.refresh();
    } catch {
      setMsg({ ok: false, texto: "Falha de conexão durante o envio." });
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function excluir(d: DocItem) {
    if (!window.confirm(`Excluir “${d.nome}”?`)) return;
    setOcupado(d.id);
    const r = await fetch(`/api/documentos/${d.id}`, { method: "DELETE" });
    setOcupado(null);
    if (r.ok) router.refresh();
    else setMsg({ ok: false, texto: "Não foi possível excluir o documento." });
  }

  async function reprocessar(d: DocItem) {
    setOcupado(d.id);
    setMsg(null);
    try {
      const r = await fetch(`/api/documentos/${d.id}/reprocessar`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) setMsg({ ok: false, texto: j.erro ?? "Não foi possível reprocessar." });
      else {
        setMsg({
          ok: j.status === "ok",
          texto: j.status === "ok" ? `“${d.nome}” lido com sucesso.` : (j.aviso ?? "Sem texto lido."),
        });
        router.refresh();
      }
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          enviar(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed px-4 py-5 transition ${
          arrastando ? "border-brand bg-brand-soft" : "border-line bg-paper/60"
        }`}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="label" htmlFor="categoria">
              Tipo do documento
            </label>
            <select id="categoria" className="field" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <label className={`btn btn-brand ${enviando ? "pointer-events-none opacity-60" : ""}`}>
            {enviando ? <Spinner /> : <Icon name="upload" />}
            {enviando ? "Enviando e lendo…" : "Selecionar arquivos"}
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.docx,.txt,.md,image/png,image/jpeg,image/webp"
              onChange={(e) => e.target.files && enviar(e.target.files)}
            />
          </label>
        </div>
        <p className="mt-2 text-[11.5px] text-slate-500">
          Arraste arquivos para cá ou selecione. Aceita PDF, DOCX, TXT e imagens (até 25 MB cada). O
          arquivo e o texto lido ficam guardados no banco de dados deste condomínio.
          {!iaAtiva ? " PDFs escaneados e imagens só têm o texto lido com a IA configurada." : ""}
        </p>
      </div>

      {msg ? (
        <p
          role="status"
          className={`mt-3 rounded-lg px-3 py-2 text-[12px] font-semibold ${
            msg.ok ? "bg-success-soft text-success" : "bg-brand-soft text-brand-dark"
          }`}
        >
          {msg.texto}
        </p>
      ) : null}

      {docs.length === 0 ? (
        <p className="mt-4 text-center text-[13px] text-slate-500">
          Nenhum documento enviado ainda.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 px-3.5 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-paper text-ink">
                <Icon name="file" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/documentos/${d.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-[13px] font-bold text-ink hover:text-brand-dark hover:underline"
                >
                  {d.nome}
                </a>
                <p className="text-[11px] text-slate-500">
                  {d.categoria} · {tamanhoLegivel(d.tamanho)} · enviado em{" "}
                  {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(d.criadoEm))}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                  {d.status === "ok" ? (
                    <span className="rounded-full bg-success-soft px-2 py-0.5 font-bold text-success">
                      Texto lido · {d.caracteres.toLocaleString("pt-BR")} caracteres
                    </span>
                  ) : (
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 font-bold text-brand-dark">
                      {d.status === "erro" ? "Erro na leitura" : "Sem texto lido"}
                    </span>
                  )}
                  {d.aviso ? <span className="text-slate-500">{d.aviso}</span> : null}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {d.status !== "ok" ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => reprocessar(d)}
                    disabled={ocupado === d.id}
                  >
                    {ocupado === d.id ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="refresh" className="h-3.5 w-3.5" />}
                    Reprocessar
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => excluir(d)}
                  disabled={ocupado === d.id}
                  aria-label={`Excluir ${d.nome}`}
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
