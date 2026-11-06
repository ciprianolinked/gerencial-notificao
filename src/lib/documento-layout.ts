import type { ImagemDoc } from "./types";

/** A4 retrato. Mesmas margens e largura útil no editor, na impressão e no PDF. */
export const A4 = {
  larguraMm: 210,
  alturaMm: 297,
  margemMm: 15,
} as const;

export const MM_PARA_PT = 72 / 25.4;
export const LARGURA_UTIL_MM = A4.larguraMm - A4.margemMm * 2;
export const LARGURA_UTIL_PT = LARGURA_UTIL_MM * MM_PARA_PT;
export const FOTO_ALTURA_MAX_MM = 60;
export const FOTO_GAP_MM = 4;

/** Mantém a ordem; duas fotos de meia largura dividem a mesma linha. */
export function linhasDeFotos(imagens: ImagemDoc[]): ImagemDoc[][] {
  const linhas: ImagemDoc[][] = [];
  for (const imagem of imagens) {
    const ultima = linhas[linhas.length - 1];
    if (imagem.largura === "meia" && ultima?.length === 1 && ultima[0].largura === "meia") {
      ultima.push(imagem);
    } else {
      linhas.push([imagem]);
    }
  }
  return linhas;
}
