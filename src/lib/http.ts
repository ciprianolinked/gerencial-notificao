/**
 * Lê a resposta como JSON mesmo quando o servidor/plataforma devolve HTML ou texto
 * (ex.: 413 do Vercel para arquivos grandes, 504 por tempo esgotado).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function lerRespostaJson(r: Response): Promise<any> {
  const texto = await r.text();
  try {
    return JSON.parse(texto);
  } catch {
    if (r.status === 413) {
      return {
        erro: "O arquivo excede o limite de envio do servidor (no Vercel, 4,5 MB por envio). Compacte ou divida o arquivo e tente novamente.",
      };
    }
    if (r.status === 504) {
      return { erro: "O servidor demorou demais para responder. Tente novamente com um arquivo menor." };
    }
    return { erro: `Erro ${r.status} no servidor. Tente novamente.` };
  }
}
