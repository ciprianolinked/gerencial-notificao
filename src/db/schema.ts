import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { DocData } from "@/lib/types";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/** Condomínios atendidos pela Gerencial. */
export const condominios = pgTable("condominios", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  cnpj: text("cnpj"),
  endereco: text("endereco"),
  cidade: text("cidade"),
  uf: text("uf"),
  sindico: text("sindico"),
  gestor: text("gestor"),
  observacoes: text("observacoes"),
  logo: bytea("logo"),
  logoMime: text("logo_mime"),
  logoEm: timestamp("logo_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

/** Documentação de cada condomínio (convenção, regimento, atas...) guardada no banco. */
export const condominioDocumentos = pgTable(
  "condominio_documentos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    condominioId: uuid("condominio_id")
      .notNull()
      .references(() => condominios.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    categoria: text("categoria").notNull().default("Outro"),
    mimeType: text("mime_type").notNull().default("application/octet-stream"),
    tamanho: integer("tamanho").notNull().default(0),
    conteudo: bytea("conteudo").notNull(),
    texto: text("texto").notNull().default(""),
    status: text("status").notNull().default("ok"),
    aviso: text("aviso"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("condominio_documentos_condominio_idx").on(t.condominioId)],
);

/** Notificações, multas e comunicados criados. */
export const documentosEmitidos = pgTable(
  "documentos_emitidos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tipo: text("tipo").notNull(),
    numero: text("numero").notNull(),
    condominioId: uuid("condominio_id").references(() => condominios.id, {
      onDelete: "set null",
    }),
    condominioNome: text("condominio_nome").notNull().default(""),
    assunto: text("assunto").notNull().default(""),
    status: text("status").notNull().default("rascunho"),
    enviadoEm: timestamp("enviado_em", { withTimezone: true }),
    dados: jsonb("dados").$type<DocData>().notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("documentos_emitidos_tipo_idx").on(t.tipo),
    index("documentos_emitidos_condominio_idx").on(t.condominioId),
  ],
);

/** Modelo padrão personalizado de cada segmento (se ausente, vale o modelo de fábrica). */
export const modelosPadrao = pgTable("modelos_padrao", {
  tipo: text("tipo").primaryKey(),
  dados: jsonb("dados").$type<DocData>().notNull(),
  origem: text("origem").notNull().default("editor"),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Configurações simples (chave/valor), como a chave da IA. */
export const configuracoes = pgTable("configuracoes", {
  chave: text("chave").primaryKey(),
  valor: text("valor").notNull(),
});
