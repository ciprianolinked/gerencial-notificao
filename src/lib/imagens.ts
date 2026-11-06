/**
 * Reduz as fotos antes de guardar no documento.
 *
 * Objetivo: o PDF e o banco ficarem leves sem perder legibilidade. Uma foto de
 * câmera/celular costuma ter 3-8 MB e 4000+ px de largura; numa folha A4 a área
 * útil de texto tem ~180 mm, então 1500 px já dá boa definição (≈210 dpi) e um
 * arquivo de algumas dezenas de KB.
 */

export const MAX_FOTOS = 6;
export const MAX_BYTES_ORIGINAL = 15 * 1024 * 1024;
export const MAX_LARGURA_PX = 1500;
export const MAX_ALTURA_PX = 1500;
export const QUALIDADE = 0.78;
export const MAX_BYTES_FINAL = 900 * 1024;

export type FotoPreparada = {
  dataUrl: string;
  larguraPx: number;
  alturaPx: number;
  bytes: number;
};

export function aceitaImagem(file: File): boolean {
  return ["image/png", "image/jpeg", "image/webp"].includes(file.type);
}

export const MAX_BYTES_LOGO = 5 * 1024 * 1024;
const MAX_LOGO_PX = 900;

/**
 * Prepara a logo do cabeçalho: mantém PNG pequeno intacto (transparência) e
 * converte JPG/WEBP ou arquivos grandes em PNG/JPEG (até 900 px) para o PDF.
 */
export async function prepararLogo(file: File): Promise<string> {
  if (!aceitaImagem(file)) {
    throw new Error("Formato não aceito. Arraste um arquivo PNG, JPG ou WEBP.");
  }
  if (file.size > MAX_BYTES_LOGO) {
    throw new Error("A logo deve ter até 5 MB.");
  }

  if (file.type === "image/png" && file.size <= 2_000_000) {
    return await new Promise<string>((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () =>
        typeof leitor.result === "string" ? resolve(leitor.result) : reject(new Error("Formato inválido"));
      leitor.onerror = () => reject(new Error("Falha ao ler a imagem"));
      leitor.readAsDataURL(file);
    });
  }

  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, MAX_LOGO_PX / bitmap.width, MAX_LOGO_PX / bitmap.height);
  const largura = Math.max(1, Math.round(bitmap.width * escala));
  const altura = Math.max(1, Math.round(bitmap.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close?.();

  const png = canvas.toDataURL("image/png");
  if (bytesDeDataUrl(png) <= 2_000_000) return png;
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function bytesDeDataUrl(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  const base64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.round((base64.length * 3) / 4);
}

/** Reduz e comprime a imagem (JPEG). Mantém a proporção e a orientação. */
export async function prepararFoto(file: File): Promise<FotoPreparada> {
  if (!aceitaImagem(file)) {
    throw new Error("Formato não aceito. Use PNG, JPG ou WEBP.");
  }
  if (file.size > MAX_BYTES_ORIGINAL) {
    throw new Error("A foto deve ter até 15 MB.");
  }

  const bitmap = await createImageBitmap(file);
  const escala = Math.min(
    1,
    MAX_LARGURA_PX / bitmap.width,
    MAX_ALTURA_PX / bitmap.height,
  );
  const largura = Math.max(1, Math.round(bitmap.width * escala));
  const altura = Math.max(1, Math.round(bitmap.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close?.();

  let qualidade = QUALIDADE;
  let dataUrl = canvas.toDataURL("image/jpeg", qualidade);

  // Se ainda ficou grande, reduz a qualidade (e depois o tamanho) até caber.
  while (bytesDeDataUrl(dataUrl) > MAX_BYTES_FINAL && qualidade > 0.4) {
    qualidade -= 0.12;
    dataUrl = canvas.toDataURL("image/jpeg", qualidade);
  }
  while (bytesDeDataUrl(dataUrl) > MAX_BYTES_FINAL && largura > 640) {
    const escalaMenor = Math.max(0.6, Math.sqrt(MAX_BYTES_FINAL / bytesDeDataUrl(dataUrl)));
    const novaLargura = Math.max(320, Math.round(largura * escalaMenor));
    const novaAltura = Math.max(1, Math.round((novaLargura / largura) * altura));
    const c2 = document.createElement("canvas");
    c2.width = novaLargura;
    c2.height = novaAltura;
    c2.getContext("2d")?.drawImage(canvas, 0, 0, novaLargura, novaAltura);
    const novo = c2.toDataURL("image/jpeg", QUALIDADE);
    if (bytesDeDataUrl(novo) >= bytesDeDataUrl(dataUrl)) break;
    dataUrl = novo;
    break;
  }

  return { dataUrl, larguraPx: largura, alturaPx: altura, bytes: bytesDeDataUrl(dataUrl) };
}
