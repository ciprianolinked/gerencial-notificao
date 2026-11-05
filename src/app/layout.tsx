import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gerencial · Notificações, Multas e Comunicados",
  description:
    "Plataforma de governança condominial da Gerencial para elaborar notificações, multas e comunicados com apoio de inteligência artificial e a documentação de cada condomínio.",
  icons: {
    icon: [{ url: "/marca/simbolo.png", type: "image/png", sizes: "400x400" }],
    apple: "/marca/simbolo.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <div className="min-h-screen bg-paper">
          <Header />
          <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-5 sm:px-6">{children}</main>
          <footer className="no-print mx-auto max-w-[1400px] px-4 pb-10 text-center text-[11px] leading-relaxed text-slate-500 sm:px-6">
            <p>
              Gerencial · Governança Condominial — padrão institucional de notificações, multas e
              comunicados. Documentos gerados para apoio à gestão do síndico e do conselho; revise
              sempre o conteúdo antes de emitir.
            </p>
            <p className="mt-2">
              <Link
                href="/guia-publicacao"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 font-bold text-ink transition hover:border-brand hover:bg-brand-soft"
              >
                Guia de publicação do sistema (GitHub, Vercel e Neon) →
              </Link>
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
