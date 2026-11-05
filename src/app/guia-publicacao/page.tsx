import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { lerConexao } from "@/db";
import { SQL_TABELAS } from "@/db/ddl";
import { CopiarBotao } from "@/components/CopiarBotao";
import { Hero } from "@/components/Hero";
import { Icon } from "@/components/Icon";
import { verificarBanco } from "@/lib/banco";
import { getIaConfig } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Guia de publicação · Gerencial" };

type Estado = "ok" | "alerta" | "erro" | "info";
type ItemStatus = { rotulo: string; estado: Estado; detalhe: string };

const ESTILO: Record<Estado, { caixa: string; selo: string; texto: string }> = {
  ok: { caixa: "border-success/20 bg-success-soft", selo: "bg-success text-white", texto: "OK" },
  alerta: { caixa: "border-brand/40 bg-brand-soft", selo: "bg-brand text-ink-deep", texto: "Pendente" },
  erro: { caixa: "border-red-200 bg-red-50", selo: "bg-red-600 text-white", texto: "Corrigir" },
  info: { caixa: "border-line bg-paper", selo: "bg-ink text-white", texto: "Info" },
};

function Codigo({ texto, rotulo = "terminal" }: { texto: string; rotulo?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-soft bg-ink-deep">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">{rotulo}</span>
        <CopiarBotao texto={texto} />
      </div>
      <pre className="max-h-[420px] overflow-auto p-3 font-mono text-[12px] leading-relaxed text-white/90">
        <code>{texto}</code>
      </pre>
    </div>
  );
}

function Passo({ n, id, titulo, children }: { n: string; id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-24 p-5 sm:p-6">
      <div className="flex items-start gap-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-[14px] font-extrabold text-brand">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[19px] leading-tight text-ink">{titulo}</h2>
          <div className="mt-3 space-y-3 text-[13.5px] leading-relaxed text-slate-600">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Lista({ itens }: { itens: ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {itens.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[3px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[10.5px] font-extrabold text-brand-dark">
            {i + 1}
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Nota({ children, tipo = "dica" }: { children: ReactNode; tipo?: "dica" | "atencao" }) {
  return (
    <div
      className={`flex gap-2.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
        tipo === "atencao" ? "border-brand/40 bg-brand-soft text-ink" : "border-line bg-paper text-slate-600"
      }`}
    >
      <Icon name={tipo === "atencao" ? "alert" : "sparkles"} className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />
      <div>{children}</div>
    </div>
  );
}

const K = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[12px] text-ink">{children}</code>
);

export default async function GuiaPublicacaoPage() {
  const conexao = lerConexao();
  const banco = await verificarBanco();

  const chaveEnv = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  let ia: ItemStatus = {
    rotulo: "IA (Gemini)",
    estado: chaveEnv ? "ok" : "alerta",
    detalhe: chaveEnv
      ? "Chave configurada pela variável GEMINI_API_KEY."
      : "Pendente — informe a chave em Configurar IA (Passo 5). O sistema funciona sem IA, mas sem redação automática.",
  };
  if (banco.ok) {
    try {
      const cfg = await getIaConfig();
      ia = cfg.apiKey
        ? {
            rotulo: "IA (Gemini)",
            estado: "ok",
            detalhe: `Chave configurada ${cfg.origem === "banco" ? "pela tela Configurar IA" : "pela variável GEMINI_API_KEY"} · modelo ${cfg.model}.`,
          }
        : ia;
    } catch {
      /* mantém o diagnóstico pela variável de ambiente */
    }
  }

  const naVercel = !!process.env.VERCEL;
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  const msgCommit = process.env.VERCEL_GIT_COMMIT_MESSAGE?.split("\n")[0]?.slice(0, 90);
  const dominio = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "SEU-PROJETO.vercel.app";

  const itens: ItemStatus[] = [
    {
      rotulo: "Ambiente",
      estado: "info",
      detalhe: naVercel
        ? `Vercel · ${process.env.VERCEL_ENV ?? "—"}${process.env.VERCEL_REGION ? ` · região ${process.env.VERCEL_REGION}` : ""}`
        : "Fora do Vercel (desenvolvimento ou servidor próprio).",
    },
    ...(sha
      ? [
          {
            rotulo: "Versão publicada (commit)",
            estado: "info" as const,
            detalhe: `${sha.slice(0, 7)}${msgCommit ? ` — ${msgCommit}` : ""}. Compare com o último commit no GitHub.`,
          },
        ]
      : []),
    {
      rotulo: "Variável de conexão",
      estado: conexao ? (banco.ok || banco.etapa !== "variavel" ? "ok" : "erro") : "erro",
      detalhe: conexao
        ? banco.ok || banco.etapa !== "variavel"
          ? `${conexao.variavel} encontrada.`
          : `${banco.titulo}. ${banco.acao}`
        : "DATABASE_URL não encontrada no servidor — veja os Passos 2 e 3.",
    },
    {
      rotulo: "Conexão com o banco",
      estado: banco.ok || banco.etapa === "tabelas" ? "ok" : banco.etapa === "conexao" ? "erro" : "alerta",
      detalhe: banco.ok
        ? `Conectado a ${banco.host}.`
        : banco.etapa === "tabelas"
          ? "Conectado."
          : banco.etapa === "conexao"
            ? `${banco.titulo}. ${banco.acao}${banco.codigo ? ` (código ${banco.codigo})` : ""}`
            : "Aguardando uma variável de conexão válida.",
    },
    {
      rotulo: "Tabelas do sistema",
      estado: banco.ok ? "ok" : banco.etapa === "tabelas" ? "erro" : "alerta",
      detalhe: banco.ok
        ? "Criadas e verificadas automaticamente."
        : banco.etapa === "tabelas"
          ? `${banco.titulo}. ${banco.acao}`
          : "Serão criadas automaticamente assim que a conexão funcionar.",
    },
    ia,
  ];

  const pronto = banco.ok;

  const sumario = [
    ["status", "Status desta instalação"],
    ["antes", "Antes de começar"],
    ["github", "1. Código no GitHub"],
    ["neon", "2. Banco de dados no Neon"],
    ["vercel", "3. Publicação no Vercel"],
    ["primeiro-acesso", "4. Primeiro acesso"],
    ["ia", "5. Ativar a IA"],
    ["atualizacoes", "6. Atualizações"],
    ["dominio", "7. Domínio próprio"],
    ["sql", "Script SQL (opcional)"],
    ["limites", "Limites importantes"],
    ["problemas", "Problemas comuns"],
    ["local", "Rodar no computador"],
  ];

  return (
    <>
      <Hero
        compact
        eyebrow="Publicação · GitHub + Vercel + Neon"
        titulo="Guia completo para publicar o sistema da Gerencial."
        texto="Passo a passo para colocar notificações, multas e comunicados no ar com o código no GitHub, o site no Vercel e o banco de dados no Neon — com verificação automática desta instalação."
        bullets={["Planos gratuitos", "Tabelas criadas automaticamente", "Atualização a cada git push"]}
      />

      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
        <nav className="no-print card hidden p-4 lg:sticky lg:top-[84px] lg:block">
          <p className="label">Neste guia</p>
          <ul className="space-y-0.5 text-[12.5px]">
            {sumario.map(([id, rotulo]) => (
              <li key={id}>
                <a href={`#${id}`} className="block rounded-md px-2 py-1 font-semibold text-slate-600 hover:bg-brand-soft hover:text-ink">
                  {rotulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-5">
          {/* Status */}
          <section id="status" className="card scroll-mt-24 overflow-hidden">
            <div
              className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${
                pronto ? "bg-success-soft" : "bg-brand-soft"
              }`}
            >
              <div>
                <p className="label !mb-0.5">Status desta instalação (verificado agora)</p>
                <h2 className="font-display text-[20px] text-ink">
                  {pronto ? "Tudo pronto: banco conectado e tabelas criadas." : "Há etapas pendentes para o sistema funcionar."}
                </h2>
              </div>
              <a href="/guia-publicacao#status" className="btn btn-ghost btn-sm">
                <Icon name="refresh" className="h-3.5 w-3.5" /> Verificar de novo
              </a>
            </div>
            <ul className="grid gap-2 p-4 sm:grid-cols-2">
              {itens.map((item) => (
                <li key={item.rotulo} className={`rounded-xl border px-3.5 py-2.5 ${ESTILO[item.estado].caixa}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-extrabold text-ink">{item.rotulo}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] ${ESTILO[item.estado].selo}`}>
                      {ESTILO[item.estado].texto}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-[12px] leading-snug text-slate-600">{item.detalhe}</p>
                </li>
              ))}
            </ul>
            {pronto ? (
              <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
                <Link href="/condominios" className="btn btn-brand btn-sm">
                  Cadastrar condomínios
                </Link>
                <Link href="/configuracoes" className="btn btn-ghost btn-sm">
                  Configurar IA
                </Link>
              </div>
            ) : null}
          </section>

          {/* Antes de começar */}
          <section id="antes" className="card scroll-mt-24 p-5 sm:p-6">
            <h2 className="font-display text-[19px] text-ink">Antes de começar</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
              São três serviços, todos com plano gratuito. Use o mesmo e-mail (ou entre com a conta do GitHub)
              para facilitar:
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                ["GitHub", "github.com", "Guarda o código do sistema e dispara a publicação a cada atualização."],
                ["Vercel", "vercel.com", "Hospeda o site e executa o servidor (páginas, APIs e IA)."],
                ["Neon", "neon.tech", "Banco PostgreSQL onde ficam condomínios, documentos e histórico."],
              ].map(([nome, site, texto]) => (
                <div key={nome} className="rounded-xl border border-line bg-paper/60 p-3.5">
                  <p className="text-[14px] font-extrabold text-ink">{nome}</p>
                  <p className="font-mono text-[11px] text-brand-dark">{site}</p>
                  <p className="mt-1.5 text-[12px] leading-snug text-slate-600">{texto}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] text-slate-500">
              Opcional: uma chave gratuita da IA Gemini (Google AI Studio) para redigir textos e analisar documentos.
            </p>
          </section>

          <Passo n="1" id="github" titulo="Coloque o código no GitHub">
            <Lista
              itens={[
                <>Crie uma conta em <strong>github.com</strong> e clique em <strong>New repository</strong>. Dê um nome (ex.: <K>gerencial-notificacoes</K>) e marque <strong>Private</strong>.</>,
                <>Envie <strong>todos</strong> os arquivos do projeto mantendo as pastas: <K>package.json</K>, <K>package-lock.json</K>, <K>next.config.ts</K>, <K>tsconfig.json</K>, <K>drizzle.config.json</K> e as pastas <K>src/</K> e <K>public/</K>.</>,
                <>Pelo terminal, dentro da pasta do projeto (troque o endereço pelo do seu repositório):</>,
              ]}
            />
            <Codigo
              texto={`git init
git add .
git commit -m "Sistema Gerencial - primeira versão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/gerencial-notificacoes.git
git push -u origin main`}
            />
            <p>
              Sem terminal? Use o <strong>GitHub Desktop</strong> ou, no site do repositório, <strong>Add file → Upload files</strong> e
              arraste as pastas (confira depois se <K>src</K> e <K>public</K> apareceram).
            </p>
            <Nota tipo="atencao">
              Nunca envie o arquivo <K>.env</K> nem as pastas <K>node_modules</K> e <K>.next</K>. O arquivo{" "}
              <K>.gitignore</K> do projeto já os exclui. Senhas vão somente nas variáveis do Vercel.
            </Nota>
          </Passo>

          <Passo n="2" id="neon" titulo="Crie o banco de dados no Neon">
            <p>Escolha <strong>um</strong> dos caminhos:</p>
            <div className="rounded-xl border border-success/20 bg-success-soft/60 p-4">
              <p className="text-[13.5px] font-extrabold text-ink">Caminho A — pelo próprio Vercel (mais simples)</p>
              <p className="mt-1">Faça primeiro o Passo 3 (importar o projeto). Depois, no Vercel:</p>
              <div className="mt-2">
                <Lista
                  itens={[
                    <>Abra o projeto → aba <strong>Storage</strong> → <strong>Create Database</strong> → escolha <strong>Neon</strong> → <strong>Continue</strong>.</>,
                    <>Selecione a região <strong>Washington, D.C., USA (East) — iad1</strong> (a mesma das funções do Vercel) e o plano <strong>Free</strong> → <strong>Create</strong>.</>,
                    <>Em <strong>Connect Project</strong>, marque <strong>Production</strong>, <strong>Preview</strong> e <strong>Development</strong> e clique em <strong>Connect</strong>. Não preencha prefixo personalizado.</>,
                    <>O Vercel cria a variável <K>DATABASE_URL</K> sozinho. Vá em <strong>Deployments → ⋯ → Redeploy</strong>.</>,
                  ]}
                />
              </div>
              <p className="mt-2 text-[12.5px] text-slate-500">
                Se aparecer “Failed to set environment variables”, apague antes a <K>DATABASE_URL</K> criada manualmente em
                Settings → Environment Variables e repita.
              </p>
            </div>
            <div className="rounded-xl border border-line p-4">
              <p className="text-[13.5px] font-extrabold text-ink">Caminho B — direto no neon.tech</p>
              <div className="mt-2">
                <Lista
                  itens={[
                    <>Acesse <strong>neon.tech</strong> e crie a conta (pode entrar com o GitHub).</>,
                    <>Clique em <strong>New Project</strong>: nome <K>gerencial</K>, versão do Postgres padrão e região <strong>AWS US East 1 (N. Virginia)</strong>, próxima dos servidores do Vercel.</>,
                    <>No painel do projeto, clique em <strong>Connect</strong>. Mantenha o banco <K>neondb</K>, a role proprietária (<K>neondb_owner</K>) e a opção <strong>Connection pooling</strong> ligada.</>,
                    <>Copie a <strong>connection string</strong> — começa com <K>postgresql://</K> e termina com <K>sslmode=require</K>. Copie só a URL, sem <K>psql</K> e sem aspas.</>,
                  ]}
                />
              </div>
              <div className="mt-3">
                <Codigo
                  rotulo="formato da connection string"
                  texto="postgresql://neondb_owner:SUA_SENHA@ep-xxxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
                />
              </div>
              <p className="mt-2">Você vai colar essa URL no Vercel no próximo passo. Ela contém a senha: não a compartilhe.</p>
            </div>
          </Passo>

          <Passo n="3" id="vercel" titulo="Publique no Vercel">
            <Lista
              itens={[
                <>Acesse <strong>vercel.com</strong> → <strong>Sign Up</strong> → <strong>Continue with GitHub</strong>.</>,
                <><strong>Add New… → Project</strong>. Em <strong>Import Git Repository</strong>, clique em <strong>Import</strong> no seu repositório. Se ele não aparecer, use <strong>Adjust GitHub App Permissions</strong> e libere o acesso.</>,
                <>Em <strong>Configure Project</strong>: <em>Framework Preset</em> = <strong>Next.js</strong> (detectado automaticamente) e <em>Root Directory</em> = a pasta onde está o <K>package.json</K> (normalmente a raiz). Não altere os comandos de build.</>,
                <>Abra <strong>Environment Variables</strong> e adicione (se usou o Caminho B do Neon):</>,
              ]}
            />
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="bg-paper text-left">
                    {["Name (Key)", "Value", "Obrigatória?"].map((h) => (
                      <th key={h} className="border-b border-line px-3 py-2 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-b border-line px-3 py-2 font-mono font-bold text-ink">DATABASE_URL</td>
                    <td className="border-b border-line px-3 py-2">connection string do Neon (Passo 2)</td>
                    <td className="border-b border-line px-3 py-2 font-bold text-success">Sim</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono font-bold text-ink">GEMINI_API_KEY</td>
                    <td className="px-3 py-2">chave da IA (ou configure depois na tela Configurar IA)</td>
                    <td className="px-3 py-2 text-slate-500">Opcional</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Lista
              itens={[
                <>Clique em <strong>Deploy</strong> e aguarde de 2 a 4 minutos. Ao terminar, o Vercel mostra o endereço do site (ex.: <K>{dominio}</K>).</>,
                <>Adicionou ou mudou variável depois do deploy? Vá em <strong>Deployments → ⋯ → Redeploy</strong>. Variáveis só valem para deploys novos.</>,
              ]}
            />
            <Nota>
              Não use o prefixo <K>NEXT_PUBLIC_</K> nas variáveis do banco ou da IA: elas devem ficar só no servidor.
            </Nota>
          </Passo>

          <Passo n="4" id="primeiro-acesso" titulo="Primeiro acesso: as tabelas são criadas sozinhas">
            <Lista
              itens={[
                <>Abra o endereço do site. No primeiro acesso, o sistema cria automaticamente as tabelas no Neon (leva alguns segundos).</>,
                <>Volte a esta página (link no rodapé do site) e confira o <a href="#status" className="font-bold text-brand-dark underline">Status desta instalação</a>: todos os itens devem ficar verdes.</>,
                <>Teste técnico: <K>{`https://${dominio}/api/health`}</K> deve responder <K>{'{"ok":true}'}</K>.</>,
                <>Cadastre o primeiro condomínio em <strong>Condomínios</strong> (o CNPJ preenche os dados) e envie a convenção e o regimento.</>,
              ]}
            />
          </Passo>

          <Passo n="5" id="ia" titulo="Ative a IA (Gemini)">
            <Lista
              itens={[
                <>Acesse <strong>aistudio.google.com/apikey</strong>, entre com uma conta Google e clique em <strong>Create API key</strong>. Copie a chave.</>,
                <>No sistema, abra <Link href="/configuracoes" className="font-bold text-brand-dark underline">Configurar IA</Link>, cole a chave, clique em <strong>Salvar</strong> e depois em <strong>Testar conexão</strong>. A chave fica guardada no banco.</>,
                <>Alternativa: crie a variável <K>GEMINI_API_KEY</K> no Vercel e faça Redeploy.</>,
              ]}
            />
          </Passo>

          <Passo n="6" id="atualizacoes" titulo="Atualizações do sistema">
            <p>Cada envio para a branch <K>main</K> do GitHub publica uma nova versão automaticamente:</p>
            <Codigo
              texto={`git add .
git commit -m "Atualização do sistema"
git push`}
            />
            <ul className="list-inside list-disc space-y-1">
              <li>Acompanhe em Vercel → <strong>Deployments</strong>. Se o build falhar, a versão anterior continua no ar.</li>
              <li>Branches diferentes de <K>main</K> geram uma versão de teste (Preview) com outro endereço.</li>
              <li>O commit publicado aparece no status desta página: use-o para confirmar que a versão nova entrou no ar.</li>
              <li>Os dados ficam no Neon e não são apagados nas atualizações. Novas tabelas e colunas são criadas automaticamente.</li>
            </ul>
          </Passo>

          <Passo n="7" id="dominio" titulo="Domínio próprio (opcional)">
            <Lista
              itens={[
                <>No Vercel: projeto → <strong>Settings → Domains</strong> → digite o domínio (ex.: <K>documentos.gerencial.com.br</K>) → <strong>Add</strong>.</>,
                <>No provedor do seu domínio, crie o registro DNS que o Vercel indicar (normalmente um <strong>CNAME</strong>) e aguarde a verificação. O certificado HTTPS é gerado automaticamente.</>,
              ]}
            />
          </Passo>

          {/* SQL */}
          <section id="sql" className="card scroll-mt-24 p-5 sm:p-6">
            <h2 className="font-display text-[19px] text-ink">Script SQL das tabelas (opcional)</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
              O sistema cria as tabelas sozinho. Use este script apenas se preferir criar manualmente ou se o status
              indicar falta de permissão: Neon → seu projeto → <strong>SQL Editor</strong> → cole → <strong>Run</strong>.
              Ele pode ser executado mais de uma vez sem apagar dados.
            </p>
            <details className="mt-3">
              <summary className="cursor-pointer text-[13px] font-bold text-brand-dark hover:underline">Mostrar script SQL</summary>
              <div className="mt-3">
                <Codigo rotulo="SQL — Neon SQL Editor" texto={SQL_TABELAS} />
              </div>
            </details>
          </section>

          {/* Limites */}
          <section id="limites" className="card scroll-mt-24 p-5 sm:p-6">
            <h2 className="font-display text-[19px] text-ink">Limites importantes</h2>
            <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-slate-600">
              <li>
                <strong className="text-ink">Envio de arquivos:</strong> o Vercel aceita até 4,5 MB por envio. O sistema envia um arquivo por
                vez e avisa antes quando o arquivo é grande demais. Compacte ou divida PDFs escaneados grandes.
              </li>
              <li>
                <strong className="text-ink">Armazenamento:</strong> documentos e logos ficam no banco Neon. O plano gratuito tem limite de
                armazenamento por projeto — acompanhe o uso no painel do Neon.
              </li>
              <li>
                <strong className="text-ink">Tempo da IA:</strong> as análises podem levar até 5 minutos. Projetos novos do Vercel usam Fluid
                Compute, que permite esse tempo. Se o deploy reclamar de <K>maxDuration</K>, ative Fluid Compute em Settings → Functions.
              </li>
              <li>
                <strong className="text-ink">Banco em repouso:</strong> o Neon suspende o banco sem uso. O primeiro acesso depois disso pode
                demorar alguns segundos a mais — é normal.
              </li>
              <li>
                <strong className="text-ink">Acesso:</strong> o sistema não tem login; quem tiver o endereço consegue acessar. Para restringir,
                avalie a proteção de implantação do Vercel (Settings → Deployment Protection; algumas opções exigem plano pago).
              </li>
            </ul>
          </section>

          {/* Problemas */}
          <section id="problemas" className="card scroll-mt-24 overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-[19px] text-ink">Problemas comuns</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="bg-paper text-left">
                    {["O que aparece", "Causa provável", "Como resolver"].map((h) => (
                      <th key={h} className="border-b border-line px-3 py-2 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="align-top">
                  {[
                    ["Tela “Banco de dados não configurado”", "A variável DATABASE_URL não existe no Vercel ou foi criada depois do último deploy.", "Faça o Passo 2 (Caminho A) ou crie a variável no Passo 3 e depois Redeploy."],
                    ["“An error occurred in the Server Components render”", "Versão antiga do código no GitHub ou falha do servidor.", "Confira o commit no status acima. Em Vercel → Logs, pesquise o código (digest) mostrado na tela de erro."],
                    ["Build falha com “DATABASE_URL is required”", "O repositório está com uma versão antiga do código.", "Envie a versão atual para o GitHub (Passo 6)."],
                    ["“A URL aponta para um banco local”", "DATABASE_URL usa localhost ou 127.0.0.1.", "Troque pela connection string do Neon e faça Redeploy."],
                    ["“Usuário ou senha do banco incorretos”", "URL copiada incompleta ou senha redefinida no Neon.", "Copie de novo em Neon → Connect, atualize no Vercel e faça Redeploy."],
                    ["“Servidor do banco não encontrado”", "URL cortada, com espaços ou aspas, ou projeto Neon excluído.", "Cole a URL completa, sem aspas e sem o comando psql."],
                    ["Logo da Gerencial não aparece", "Versões antigas dependiam das imagens da pasta public.", "Atualize o código: a logo agora é servida pelo próprio sistema (/marca/logo.png)."],
                    ["Erro ao enviar documento grande", "Limite de 4,5 MB por envio no Vercel.", "Compacte ou divida o PDF e envie de novo."],
                    ["IA: “chave inválida” ou “limite atingido”", "Chave errada ou cota gratuita do Gemini esgotada.", "Gere outra chave no AI Studio e salve em Configurar IA, ou aguarde a cota renovar."],
                  ].map(([sintoma, causa, solucao]) => (
                    <tr key={sintoma}>
                      <td className="border-b border-line px-3 py-2.5 font-bold text-ink">{sintoma}</td>
                      <td className="border-b border-line px-3 py-2.5 text-slate-600">{causa}</td>
                      <td className="border-b border-line px-3 py-2.5 text-slate-600">{solucao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Local */}
          <section id="local" className="card scroll-mt-24 p-5 sm:p-6">
            <h2 className="font-display text-[19px] text-ink">Rodar no computador (opcional)</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
              Com o Node.js 20 ou superior instalado, crie na raiz do projeto um arquivo <K>.env</K> (não envie ao GitHub):
            </p>
            <div className="mt-3 space-y-3">
              <Codigo
                rotulo=".env"
                texto={`DATABASE_URL=postgresql://neondb_owner:SUA_SENHA@ep-xxxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
GEMINI_API_KEY=sua-chave-opcional`}
              />
              <Codigo
                texto={`npm install
npm run dev`}
              />
            </div>
            <p className="mt-2 text-[12.5px] text-slate-500">
              Abra http://localhost:3000. Dica: no Neon, crie uma branch de desenvolvimento para não misturar testes com os dados reais.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
