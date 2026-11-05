# Gerencial — notificações, multas e comunicados

Aplicação Next.js + PostgreSQL (Drizzle) da Gerencial · Governança Condominial.

## Publicação (GitHub + Vercel + Neon)

O passo a passo completo, com **verificação ao vivo da instalação**, está no próprio sistema:
**`/guia-publicacao`** (link no rodapé de todas as páginas).

Resumo:

1. Envie o código para um repositório no GitHub (sem o arquivo `.env`).
2. No Vercel, importe o repositório (Framework: Next.js).
3. Conecte um banco Neon pela aba **Storage** do projeto no Vercel (cria `DATABASE_URL` automaticamente) **ou** crie o projeto em neon.tech e adicione a variável `DATABASE_URL` em **Settings → Environment Variables**.
4. Faça **Redeploy** e abra o site. **As tabelas são criadas automaticamente no primeiro acesso.**
5. Opcional: configure a chave do Gemini em **Configurar IA** (ou variável `GEMINI_API_KEY`).

Se algo estiver errado, as páginas mostram um diagnóstico (variável ausente, URL local, senha incorreta, etc.) em vez de um erro genérico, e `/api/health` responde `{"ok":true}` quando o banco está acessível.

### Script SQL manual (opcional)

O mesmo script usado na criação automática aparece em `/guia-publicacao#sql` para execução no **SQL Editor** do Neon. Também é possível aplicar o schema com o Drizzle:

```bash
DATABASE_URL='postgresql://...' npx drizzle-kit push --config=drizzle.production.config.ts
```

## Desenvolvimento local

Crie um `.env` com `DATABASE_URL` (PostgreSQL local ou uma branch do Neon) e rode:

```bash
npm install
npm run dev
```

## Observações

- A logo da Gerencial é servida pelo próprio código em `/marca/logo.png`, `/marca/logo-doc.png` e `/marca/simbolo.png` (não depende de imagens binárias no repositório).
- No Vercel, cada envio de arquivo é limitado a 4,5 MB; o sistema envia um arquivo por vez e avisa quando o arquivo é grande demais.
- Ao alterar `src/db/schema.ts`, atualize também `src/db/ddl.ts` (DDL idempotente usado na criação automática).
