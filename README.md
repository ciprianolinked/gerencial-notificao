# Gerencial — notificações, multas e comunicados

Aplicação Next.js com PostgreSQL/Drizzle para a gestão de documentos condominiais.

## Publicar no Vercel

1. Crie um banco **PostgreSQL hospedado e acessível pelo Vercel** (por exemplo, Neon ou Supabase). Copie a URL de conexão fornecida pelo serviço. Uma URL com `127.0.0.1` ou `localhost` só funciona no seu computador e **não funciona no Vercel**.
2. No projeto do Vercel, abra **Settings → Environment Variables** e crie a variável de servidor `DATABASE_URL` com a URL do PostgreSQL hospedado. Se usar deployments de teste, configure também o ambiente **Preview**. Não use `NEXT_PUBLIC_` no nome: a conexão com o banco deve ficar somente no servidor.
3. Aplique as tabelas no **mesmo banco** da variável do Vercel. No terminal, a partir da raiz do projeto, execute:

   ```bash
   DATABASE_URL='postgresql://usuario:senha@host:5432/banco?sslmode=require' npx drizzle-kit push --config=drizzle.production.config.ts
   ```

   Substitua a URL de exemplo pela URL real do seu provedor. **Não coloque sua senha no código nem faça commit da sua `.env`.** O comando `npx drizzle-kit push` sem `--config` usa o banco local de desenvolvimento definido em `drizzle.config.json`.
4. Faça um novo deploy no Vercel após configurar a variável. Confira `https://seu-dominio/api/health`: deve retornar `{"ok":true}`. Se retornar `{"ok":false}`, confira a URL, o acesso de rede e se o banco está ativo.

> O build do Next.js pode ser concluído sem `DATABASE_URL`: a conexão é inicializada somente quando a aplicação consulta o banco. **Isso não elimina a necessidade de configurar a variável e aplicar as tabelas para usar o aplicativo em produção.**

A chave `GEMINI_API_KEY` é opcional para o deploy inicial. Você pode defini-la no Vercel ou configurar a IA pela tela **Configurar IA** depois que o banco estiver pronto.

## Desenvolvimento local

O projeto de desenvolvimento usa `DATABASE_URL` em `.env` apontando para um PostgreSQL local. Instale as dependências com `npm install`, aplique o schema com `npx drizzle-kit push` e inicie com `npm run dev`.
