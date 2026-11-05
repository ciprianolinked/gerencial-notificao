import type { Metadata } from "next";
import { BancoIndisponivel } from "@/components/BancoIndisponivel";
import { Hero } from "@/components/Hero";
import { IaForm } from "@/components/IaForm";
import { verificarBanco } from "@/lib/banco";
import { getIaConfig, mascararChave } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Configurar IA · Gerencial" };

export default async function ConfiguracoesPage() {
  const banco = await verificarBanco();
  if (!banco.ok) return <BancoIndisponivel status={banco} />;

  const cfg = await getIaConfig();

  return (
    <>
      <Hero
        compact
        eyebrow="Inteligência artificial"
        titulo="Configurar a IA da Gerencial."
        texto="A IA gratuita do Gemini lê a convenção, o regimento e as atas de cada condomínio para redigir notificações, multas e comunicados. Informe a chave uma única vez."
        bullets={["Gratuito", "Leitura de PDF, DOCX e imagens", "Chave guardada no servidor"]}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        <section className="card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[18px] text-ink">Conexão com o Gemini</h2>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
                cfg.apiKey ? "bg-success-soft text-success" : "bg-brand-soft text-brand-dark"
              }`}
            >
              {cfg.apiKey ? "Chave configurada" : "Sem chave"}
            </span>
          </div>
          <IaForm chaveMascarada={mascararChave(cfg.apiKey)} origem={cfg.origem} modelo={cfg.model} />
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="font-display text-[18px] text-ink">Como a IA trabalha</h2>
          <ol className="mt-3 space-y-3 text-[13px] leading-snug text-slate-600">
            {[
              "Você envia a documentação do condomínio (convenção, regimento, atas) na página do condomínio. Os arquivos e o texto lido ficam no banco de dados.",
              "Na página de Notificação, Multa ou Comunicado, selecione o condomínio e descreva o caso.",
              "A IA analisa os documentos selecionados e preenche o modelo padrão, citando apenas artigos que existem nos documentos.",
              "Você revisa — todos os campos são editáveis — e salva o PDF no padrão Gerencial.",
            ].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-extrabold text-brand">
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-[12px] leading-snug text-brand-dark">
            A IA é um apoio à redação. Confira sempre fundamentos, valores e prazos antes de emitir
            qualquer documento aos moradores.
          </p>
        </section>
      </div>
    </>
  );
}
