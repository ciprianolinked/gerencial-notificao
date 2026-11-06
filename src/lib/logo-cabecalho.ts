/**
 * Enquadramento de logos somente para exibição. O arquivo original no banco não
 * é alterado: retiramos apenas margens externas brancas/transparentes e deixamos
 * uma pequena folga. A mesma imagem preparada é usada na folha e no PDF.
 */
const LIMITE_ANALISE = 1600;
const LIMITE_CACHE = 12;
const cache = new Map<string, Promise<string>>();

function carregarLogo(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    const timeout = setTimeout(() => {
      imagem.onload = null;
      imagem.onerror = null;
      reject(new Error("Tempo esgotado ao ler a logo."));
    }, 8000);
    imagem.onload = () => {
      clearTimeout(timeout);
      resolve(imagem);
    };
    imagem.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Não foi possível ler a logo."));
    };
    imagem.src = src;
  });
}

async function enquadrar(src: string): Promise<string> {
  const imagem = await carregarLogo(src);
  if (!imagem.naturalWidth || !imagem.naturalHeight) return src;

  const escala = Math.min(1, LIMITE_ANALISE / Math.max(imagem.naturalWidth, imagem.naturalHeight));
  const largura = Math.max(1, Math.round(imagem.naturalWidth * escala));
  const altura = Math.max(1, Math.round(imagem.naturalHeight * escala));
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(imagem, 0, 0, largura, altura);

  const pixels = ctx.getImageData(0, 0, largura, altura).data;
  let esquerda = largura;
  let direita = -1;
  let topo = altura;
  let base = -1;

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = (y * largura + x) * 4;
      const alpha = pixels[i + 3] / 255;
      if (alpha < 0.025) continue;
      // Cor sobre papel branco: só o que é praticamente branco conta como vazio.
      const r = 255 + (pixels[i] - 255) * alpha;
      const g = 255 + (pixels[i + 1] - 255) * alpha;
      const b = 255 + (pixels[i + 2] - 255) * alpha;
      if (r >= 250 && g >= 250 && b >= 250) continue;
      esquerda = Math.min(esquerda, x);
      direita = Math.max(direita, x);
      topo = Math.min(topo, y);
      base = Math.max(base, y);
    }
  }

  // Uma imagem vazia, branca ou sem margens relevantes permanece intacta.
  if (direita < esquerda || base < topo) return src;
  const folga = Math.max(2, Math.ceil(Math.max(direita - esquerda + 1, base - topo + 1) * 0.025));
  const x = Math.max(0, esquerda - folga);
  const y = Math.max(0, topo - folga);
  const w = Math.min(largura, direita + folga + 1) - x;
  const h = Math.min(altura, base + folga + 1) - y;
  if (w >= largura * 0.96 && h >= altura * 0.96) return src;

  const recorte = document.createElement("canvas");
  recorte.width = w;
  recorte.height = h;
  const destino = recorte.getContext("2d");
  if (!destino) return src;
  destino.drawImage(canvas, x, y, w, h, 0, 0, w, h);
  return recorte.toDataURL("image/png");
}

/** Falha de leitura nunca remove a logo: usa a imagem original como alternativa. */
export function enquadrarLogoCabecalho(src: string): Promise<string> {
  if (!src || typeof document === "undefined") return Promise.resolve(src);
  const existente = cache.get(src);
  if (existente) return existente;
  if (cache.size >= LIMITE_CACHE) {
    const primeira = cache.keys().next().value;
    if (primeira !== undefined) cache.delete(primeira);
  }
  const resultado = enquadrar(src).catch(() => src);
  cache.set(src, resultado);
  return resultado;
}
