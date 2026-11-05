import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gerencial · Notificações, Multas e Comunicados",
  description:
    "Plataforma de governança condominial da Gerencial para elaborar notificações, multas e comunicados com apoio de inteligência artificial e a documentação de cada condomínio.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/identidade/simbolo.png", type: "image/png", sizes: "400x400" },
    ],
    apple: "/identidade/simbolo.png",
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
            Gerencial · Governança Condominial — padrão institucional de notificações, multas e
            comunicados. Documentos gerados para apoio à gestão do síndico e do conselho; revise
            sempre o conteúdo antes de emitir.
          </footer>
        </div>
      </body>
    </html>
  );
}
