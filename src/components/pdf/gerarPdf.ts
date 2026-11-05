import { Font, pdf } from "@react-pdf/renderer";
import { slug } from "@/lib/format";
import type { DocData } from "@/lib/types";
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
  prefixoNome: string,
  condoLogoUrl?: string | null,
): Promise<void> {
  Font.registerHyphenationCallback((palavra) => [palavra]);

  const logoUrl =
    (await paraDataUrl("/marca/logo-doc.png")) ??
    `${window.location.origin}/marca/logo-doc.png`;
  const condoLogo = doc.logoDataUrl || (condoLogoUrl ? await paraDataUrl(condoLogoUrl) : null);

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
