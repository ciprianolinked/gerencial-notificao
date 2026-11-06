"use client";

import { useEffect, useState } from "react";
import { enquadrarLogoCabecalho } from "@/lib/logo-cabecalho";

/** As duas marcas ocupam caixas iguais; a proporção original sempre é mantida. */
export function LogoCabecalho({
  src,
  alt,
  lado,
  ajustarMargens = false,
}: {
  src: string;
  alt: string;
  lado: "esquerda" | "direita";
  ajustarMargens?: boolean;
}) {
  const [preparada, setPreparada] = useState<{ origem: string; url: string } | null>(null);

  useEffect(() => {
    if (!ajustarMargens) return;
    let ativo = true;
    void enquadrarLogoCabecalho(src).then((url) => {
      if (ativo) setPreparada({ origem: src, url });
    });
    return () => {
      ativo = false;
    };
  }, [src, ajustarMargens]);

  const imagem = ajustarMargens && preparada?.origem === src ? preparada.url : src;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imagem}
      alt={alt}
      draggable={false}
      className={`document-header-logo ${lado === "esquerda" ? "object-left" : "object-right"}`}
    />
  );
}
