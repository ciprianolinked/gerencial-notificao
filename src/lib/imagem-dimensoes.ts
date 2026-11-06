export type DimensoesImagem = { largura: number; altura: number };

/** Lê dimensões reais de PNG, JPEG e WebP sem carregar a imagem novamente. */
export function dimensoesImagem(dataUrl: string): DimensoesImagem {
  const padrao = { largura: 4, altura: 3 };
  try {
    const bin = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
    const b = (i: number) => bin.charCodeAt(i);
    const u16 = (i: number) => (b(i) << 8) | b(i + 1);
    const u32 = (i: number) => ((b(i) << 24) | (b(i + 1) << 16) | (b(i + 2) << 8) | b(i + 3)) >>> 0;
    if (bin.length < 24) return padrao;

    if (b(0) === 0x89 && bin.slice(1, 4) === "PNG") {
      const largura = u32(16);
      const altura = u32(20);
      return largura && altura ? { largura, altura } : padrao;
    }

    if (b(0) === 0xff && b(1) === 0xd8) {
      let i = 2;
      while (i < bin.length - 9) {
        if (b(i) !== 0xff) {
          i++;
          continue;
        }
        const marcador = b(i + 1);
        if (marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador)) {
          const altura = u16(i + 5);
          const largura = u16(i + 7);
          return largura && altura ? { largura, altura } : padrao;
        }
        i += 2 + u16(i + 2);
      }
    }

    if (bin.slice(0, 4) === "RIFF" && bin.slice(8, 12) === "WEBP") {
      const tipo = bin.slice(12, 16);
      if (tipo === "VP8X" && bin.length >= 30) {
        const largura = 1 + (b(24) | (b(25) << 8) | (b(26) << 16));
        const altura = 1 + (b(27) | (b(28) << 8) | (b(29) << 16));
        return { largura, altura };
      }
      if (tipo === "VP8 " && bin.length >= 30) {
        const largura = (b(26) | (b(27) << 8)) & 0x3fff;
        const altura = (b(28) | (b(29) << 8)) & 0x3fff;
        return largura && altura ? { largura, altura } : padrao;
      }
      if (tipo === "VP8L" && bin.length >= 25) {
        const bits = b(21) | (b(22) << 8) | (b(23) << 16) | (b(24) << 24);
        return { largura: 1 + (bits & 0x3fff), altura: 1 + ((bits >>> 14) & 0x3fff) };
      }
    }
  } catch {
    /* Usa proporção neutra apenas para imagens corrompidas ou formatos desconhecidos. */
  }
  return padrao;
}
