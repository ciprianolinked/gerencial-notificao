import { getIaConfig } from "./config";

export class IaError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
};

function mensagemErro(status: number, apiMsg: string): string {
  if (status === 400 && /api key/i.test(apiMsg)) {
    return "A chave da IA é inválida. Confira em Configurar IA.";
  }
  if (status === 401 || status === 403) {
    return "A chave da IA foi recusada (sem permissão). Confira em Configurar IA.";
  }
  if (status === 404) {
    return "Modelo de IA não encontrado. Ajuste o modelo em Configurar IA.";
  }
  if (status === 429) {
    return "Limite gratuito da IA atingido no momento. Aguarde alguns instantes e tente novamente.";
  }
  if (status === 503 || status === 500) {
    return "A IA está sobrecarregada no momento. Tente novamente em instantes.";
  }
  return `Falha ao consultar a IA (${status}). ${apiMsg}`.trim();
}

export async function chamarGemini(opts: {
  system?: string;
  parts: GeminiPart[];
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const cfg = await getIaConfig();
  if (!cfg.apiKey) {
    throw new IaError(
      "A IA ainda não está configurada. Informe a chave do Gemini em Configurar IA.",
      400,
    );
  }

  const body = {
    ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    contents: [{ role: "user", parts: opts.parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    cfg.model,
  )}:generateContent`;

  let ultimo: IaError | null = null;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(150_000),
      });
    } catch {
      throw new IaError("Não foi possível conectar à IA (tempo esgotado ou sem rede).", 504);
    }

    const data = (await res.json().catch(() => ({}))) as GeminiResponse;

    if (!res.ok) {
      ultimo = new IaError(mensagemErro(res.status, data.error?.message ?? ""), res.status === 429 ? 429 : 502);
      if ((res.status === 503 || res.status === 500) && tentativa === 0) {
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      }
      throw ultimo;
    }

    if (data.promptFeedback?.blockReason) {
      throw new IaError("A IA recusou processar o conteúdo enviado. Reformule o pedido.", 422);
    }

    const texto = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!texto) throw new IaError("A IA não retornou texto. Tente novamente.", 502);
    return texto;
  }
  throw ultimo ?? new IaError("Falha ao consultar a IA.", 502);
}

export function lerJson(texto: string): Record<string, unknown> {
  const limpo = texto
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(limpo) as Record<string, unknown>;
  } catch {
    const i = limpo.indexOf("{");
    const j = limpo.lastIndexOf("}");
    if (i >= 0 && j > i) {
      try {
        return JSON.parse(limpo.slice(i, j + 1)) as Record<string, unknown>;
      } catch {
        /* cai no erro abaixo */
      }
    }
    throw new IaError("A IA devolveu um formato inesperado. Tente gerar novamente.", 502);
  }
}
