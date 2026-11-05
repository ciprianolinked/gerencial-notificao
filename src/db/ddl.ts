/**
 * DDL idempotente equivalente a `src/db/schema.ts` (base: `npx drizzle-kit export`).
 *
 * - Executado automaticamente no primeiro acesso ao banco (cria o que faltar).
 * - Exibido no guia de publicação para execução manual no SQL Editor do Neon.
 *
 * Ao alterar o schema, atualize também este arquivo.
 */
const COMANDOS = [
  `CREATE TABLE IF NOT EXISTS "public"."condominios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "cnpj" text,
  "endereco" text,
  "cidade" text,
  "uf" text,
  "sindico" text,
  "gestor" text,
  "observacoes" text,
  "logo" bytea,
  "logo_mime" text,
  "logo_em" timestamp with time zone,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL
);`,
  `CREATE TABLE IF NOT EXISTS "public"."configuracoes" (
  "chave" text PRIMARY KEY NOT NULL,
  "valor" text NOT NULL
);`,
  `CREATE TABLE IF NOT EXISTS "public"."modelos_padrao" (
  "tipo" text PRIMARY KEY NOT NULL,
  "dados" jsonb NOT NULL,
  "origem" text DEFAULT 'editor' NOT NULL,
  "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);`,
  `CREATE TABLE IF NOT EXISTS "public"."condominio_documentos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "condominio_id" uuid NOT NULL,
  "nome" text NOT NULL,
  "categoria" text DEFAULT 'Outro' NOT NULL,
  "mime_type" text DEFAULT 'application/octet-stream' NOT NULL,
  "tamanho" integer DEFAULT 0 NOT NULL,
  "conteudo" bytea NOT NULL,
  "texto" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'ok' NOT NULL,
  "aviso" text,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "condominio_documentos_condominio_id_condominios_id_fk" FOREIGN KEY ("condominio_id") REFERENCES "public"."condominios"("id") ON DELETE cascade ON UPDATE no action
);`,
  `CREATE TABLE IF NOT EXISTS "public"."documentos_emitidos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tipo" text NOT NULL,
  "numero" text NOT NULL,
  "condominio_id" uuid,
  "condominio_nome" text DEFAULT '' NOT NULL,
  "assunto" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'rascunho' NOT NULL,
  "enviado_em" timestamp with time zone,
  "dados" jsonb NOT NULL,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "documentos_emitidos_condominio_id_condominios_id_fk" FOREIGN KEY ("condominio_id") REFERENCES "public"."condominios"("id") ON DELETE set null ON UPDATE no action
);`,
  // Colunas incluídas em versões posteriores (bancos criados por versões antigas do sistema).
  `ALTER TABLE "public"."condominios" ADD COLUMN IF NOT EXISTS "logo" bytea;`,
  `ALTER TABLE "public"."condominios" ADD COLUMN IF NOT EXISTS "logo_mime" text;`,
  `ALTER TABLE "public"."condominios" ADD COLUMN IF NOT EXISTS "logo_em" timestamp with time zone;`,
  `ALTER TABLE "public"."documentos_emitidos" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'rascunho' NOT NULL;`,
  `ALTER TABLE "public"."documentos_emitidos" ADD COLUMN IF NOT EXISTS "enviado_em" timestamp with time zone;`,
  `CREATE INDEX IF NOT EXISTS "condominio_documentos_condominio_idx" ON "public"."condominio_documentos" USING btree ("condominio_id");`,
  `CREATE INDEX IF NOT EXISTS "documentos_emitidos_tipo_idx" ON "public"."documentos_emitidos" USING btree ("tipo");`,
  `CREATE INDEX IF NOT EXISTS "documentos_emitidos_condominio_idx" ON "public"."documentos_emitidos" USING btree ("condominio_id");`,
];

/** Script completo (pode ser executado mais de uma vez sem perder dados). */
export const SQL_TABELAS = COMANDOS.join("\n\n");

/**
 * Executado em uma única transação implícita. O advisory lock evita conflito
 * quando várias funções do Vercel iniciam ao mesmo tempo.
 */
export const SQL_CRIAR_ESQUEMA = `SELECT pg_advisory_xact_lock(84721001);\n${SQL_TABELAS}`;

/** Confere as colunas mais recentes de cada tabela (se todas existem, nada é alterado). */
export const SQL_VERIFICAR_ESQUEMA = `SELECT count(*)::int AS n
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (
    ('condominios', 'logo_em'),
    ('condominio_documentos', 'aviso'),
    ('documentos_emitidos', 'status'),
    ('documentos_emitidos', 'enviado_em'),
    ('modelos_padrao', 'origem'),
    ('configuracoes', 'valor')
  )`;

export const COLUNAS_VERIFICADAS = 6;
