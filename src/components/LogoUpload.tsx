"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { prepararLogo } from "@/lib/imagens";
import { Icon, Spinner } from "./Icon";

const LIMITE_MB = 2;

/** Aceita PNG, JPG, WEBP e SVG; tudo é convertido para PNG antes do envio. */
const ACEITOS = "image/png,image/jpeg,image/webp,image/svg+xml";

export function LogoUpload({
  condominioId,
  temLogo,
}: {
  condominioId: string;
  temLogo: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [nonce, setNonce] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function enviar(file: File) {
    setEnviando(true);
    setMsg(null);
    try {
      // Converte para PNG (o PDF só embute PNG/JPG) antes de subir.
      const png = await prepararLogo(file);
      if (png.size > LIMITE_MB * 1024 * 1024) {
        setMsg({
          ok: false,
          texto: `A logo convertida ficou com mais de ${LIMITE_MB} MB. Use uma imagem mais simples.`,
        });
        return;
      }

      const fd = new FormData();
      fd.append("arquivo", png);
      const r = await fetch(`/api/condominios/${condominioId}/logo`, {
        method: "POST",
        body: fd,
      });
      const j = (await r.json().catch(() => ({}))) as { erro?: string };
      if (!r.ok) {
        setMsg({ ok: false, texto: j.erro ?? "Não foi possível enviar a logo." });
        return;
      }
      setNonce((n) => n + 1);
      setMsg({
        ok: true,
        texto: "Logo atualizada. Ela entra automaticamente no cabeçalho dos documentos deste condomínio.",
      });
      router.refresh();
    } catch (e) {
      setMsg({
        ok: false,
        texto: e instanceof Error ? e.message : "Não foi possível ler esta imagem.",
      });
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remover() {
    if (!window.confirm("Remover a logo deste condomínio?")) return;
    setEnviando(true);
    const r = await fetch(`/api/condominios/${condominioId}/logo`, { method: "DELETE" });
    setEnviando(false);
    if (r.ok) {
      setNonce((n) => n + 1);
      setMsg({ ok: true, texto: "Logo removida. Os documentos voltam ao logo Gerencial." });
      router.refresh();
    } else {
      setMsg({ ok: false, texto: "Não foi possível remover." });
    }
  }

  const logoUrl = `/api/condominios/${condominioId}/logo?v=${nonce}`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <div
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            e.stopPropagation();
            setArrastando(false);
            const arquivo = e.dataTransfer.files?.[0];
            if (arquivo) void enviar(arquivo);
          }}
          className={`grid h-28 w-44 shrink-0 place-items-center overflow-hidden rounded-lg border-2 bg-white transition ${
            arrastando ? "border-brand bg-brand-soft" : "border-line"
          }`}
        >
          {temLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={nonce}
              src={logoUrl}
              alt="Logo do condomínio"
              className="max-h-full max-w-full object-contain p-2"
            />
          ) : (
            <span className="px-2 text-center text-[11px] text-slate-400">
              {arrastando ? "Solte a logo aqui" : "sem logo"}
            </span>
          )}
        </div>

        <div className="min-w-[220px] flex-1">
          <p className="text-[13px] font-bold text-ink">Logo do condomínio</p>
          <p className="mb-2 max-w-sm text-[11.5px] leading-snug text-slate-500">
            Arraste a imagem para a caixa ao lado ou selecione abaixo. Enviada a logo, ela aparece no
            cabeçalho de notificações, multas e comunicados desse condomínio — sem precisar ajustar
            nada mais. PNG, JPG, WEBP ou SVG, até {LIMITE_MB} MB.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={`btn btn-ghost btn-sm ${enviando ? "pointer-events-none opacity-60" : ""}`}
            >
              {enviando ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <Icon name="upload" className="h-3.5 w-3.5" />
              )}
              {temLogo ? "Trocar logo" : "Enviar logo"}
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={ACEITOS}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void enviar(f);
                }}
              />
            </label>
            {temLogo ? (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={remover}
                disabled={enviando}
              >
                <Icon name="trash" className="h-3.5 w-3.5" /> Remover
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {arrastando ? (
        <p className="mt-2 rounded-lg border border-brand bg-brand-soft px-3 py-1.5 text-[11.5px] font-bold text-brand-dark">
          Solte o arquivo para definir a logo do condomínio.
        </p>
      ) : null}

      {msg ? (
        <p
          role="status"
          className={`mt-3 rounded-lg px-3 py-2 text-[12px] font-semibold ${
            msg.ok ? "bg-success-soft text-success" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.texto}
        </p>
      ) : null}
    </div>
  );
}
