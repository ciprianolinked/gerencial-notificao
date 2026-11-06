import { Font, pdf } from "@react-pdf/renderer";
import { slug } from "@/lib/format";
import { enquadrarLogoCabecalho } from "@/lib/logo-cabecalho";
import { normalizarDocumento } from "@/lib/padrao-documento";
import type { DocData, TipoDoc } from "@/lib/types";
import { SEGMENTOS } from "@/lib/types";
import { DocumentPdf } from "./DocumentPdf";

/** Lê a imagem e devolve data URL (evita problemas de CORS/cache no gerador de PDF). */
async function paraDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Gera o PDF no navegador e dispara o download. */
export async function baixarPdf(
  doc: DocData,
  tipo: TipoDoc,
  condoLogoUrl?: string | null,
): Promise<void> {
  Font.registerHyphenationCallback((palavra) => [palavra]);
  doc = normalizarDocumento(doc, tipo);
  const prefixoNome = SEGMENTOS[tipo].prefixo;

  const logoUrl =
    (await paraDataUrl("/marca/logo-doc.png")) ??
    `${window.location.origin}/marca/logo-doc.png`;
  const originalCondo = doc.logoDataUrl || (condoLogoUrl ? await paraDataUrl(condoLogoUrl) : null);
  const condoLogo = originalCondo ? await enquadrarLogoCabecalho(originalCondo) : null;

  const blob = await pdf(
    DocumentPdf({ doc, logoUrl, condoLogoUrl: condoLogo ?? undefined }),
  ).toBlob();

  const partes = [doc.numero || prefixoNome, doc.condominio].filter((p) => p && p.trim());
  const nome = `${slug(partes.join(" ")) || "documento"}.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
