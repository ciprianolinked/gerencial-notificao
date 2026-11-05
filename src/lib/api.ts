import { NextResponse } from "next/server";
import { IaError } from "./gemini";

export function erro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export function erroDeExcecao(e: unknown) {
  if (e instanceof IaError) return erro(e.message, e.status);
  console.error(e);
  return erro("Ocorreu um erro inesperado. Tente novamente.", 500);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ehUuid = (v: string) => UUID.test(v);

export function texto(v: unknown, max = 400): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t ? t : null;
}

export const CATEGORIAS_DOC = [
  "Convenção",
  "Regimento Interno",
  "Ata de Assembleia",
  "Regulamento / Circular",
  "Contrato",
  "Outro",
] as const;
