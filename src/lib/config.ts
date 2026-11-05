import { eq } from "drizzle-orm";
import { db } from "@/db";
import { configuracoes } from "@/db/schema";

export const MODELO_IA_PADRAO = "gemini-2.5-flash";

export async function lerConfig(chave: string): Promise<string | null> {
  const [row] = await db
    .select({ valor: configuracoes.valor })
    .from(configuracoes)
    .where(eq(configuracoes.chave, chave))
    .limit(1);
  return row?.valor ?? null;
}

export async function gravarConfig(chave: string, valor: string | null): Promise<void> {
  if (!valor) {
    await db.delete(configuracoes).where(eq(configuracoes.chave, chave));
    return;
  }
  await db
    .insert(configuracoes)
    .values({ chave, valor })
    .onConflictDoUpdate({ target: configuracoes.chave, set: { valor } });
}

export type IaConfig = {
  apiKey: string | null;
  model: string;
  origem: "banco" | "ambiente" | null;
};

export async function getIaConfig(): Promise<IaConfig> {
  const [chaveBanco, modelo] = await Promise.all([
    lerConfig("gemini_api_key"),
    lerConfig("gemini_model"),
  ]);
  const chaveEnv = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
  const apiKey = chaveBanco || chaveEnv;
  return {
    apiKey,
    model: modelo || process.env.GEMINI_MODEL || MODELO_IA_PADRAO,
    origem: chaveBanco ? "banco" : chaveEnv ? "ambiente" : null,
  };
}

export function mascararChave(chave: string | null): string {
  if (!chave) return "";
  if (chave.length <= 8) return "••••••••";
  return `${chave.slice(0, 4)}••••••••${chave.slice(-4)}`;
}
