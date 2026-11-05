import { defineConfig } from "drizzle-kit";

// Use this config only to initialize/update a hosted PostgreSQL database.
// Example: DATABASE_URL='postgresql://...' npx drizzle-kit push --config=drizzle.production.config.ts
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL é obrigatória para aplicar o schema em produção. Configure a URL de um PostgreSQL hospedado antes de executar este comando.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url: databaseUrl },
});
