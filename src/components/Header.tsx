"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "./Icon";

const LINKS = [
  { href: "/", label: "Painel" },
  { href: "/notificacao", label: "Notificação" },
  { href: "/multa", label: "Multa" },
  { href: "/comunicado", label: "Comunicado" },
  { href: "/condominios", label: "Condomínios" },
  { href: "/configuracoes", label: "Configurar IA" },
];

function ativo(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

export function Header() {
  const path = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);

  // Fecha o menu "Novo documento" ao clicar fora dele.
  useEffect(() => {
    const fechar = (e: MouseEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) {
        menu.current.removeAttribute("open");
      }
    };
    document.addEventListener("click", fechar);
    return () => document.removeEventListener("click", fechar);
  }, []);

  return (
    <header className="no-print sticky top-0 z-40 bg-ink text-white shadow-[0_2px_0_0_#fab12a]">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            aria-label="Gerencial — início"
            className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/identidade/logo.png"
              alt="Gerencial — Governança Condominial"
              style={{ height: 26 }}
              className="w-auto max-w-full"
            />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition hover:bg-white/10 hover:text-white ${
                  ativo(path, l.href) ? "bg-white/10 text-white" : "text-white/75"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/configuracoes"
            className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand transition hover:bg-white/15 lg:inline-flex"
          >
            <Icon name="sparkles" className="h-3 w-3" />
            IA Gemini
          </Link>
          <details ref={menu} className="group relative">
            <summary className="btn btn-brand list-none [&::-webkit-details-marker]:hidden">
              <Icon name="plus" className="h-4 w-4" />
              <span className="hidden sm:inline">Novo documento</span>
              <span className="sm:hidden">Novo</span>
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white py-1 text-ink shadow-xl">
              {[
                { href: "/notificacao", label: "Nova notificação", icon: "bell" as const },
                { href: "/multa", label: "Nova multa", icon: "gavel" as const },
                { href: "/comunicado", label: "Novo comunicado", icon: "megaphone" as const },
              ].map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => menu.current?.removeAttribute("open")}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-semibold hover:bg-brand-soft"
                >
                  <Icon name={i.icon} className="h-4 w-4 text-brand-dark" />
                  {i.label}
                </Link>
              ))}
            </div>
          </details>
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto border-t border-white/10 px-4 pb-2 pt-1.5 text-[11px] font-semibold text-white/75 md:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap ${ativo(path, l.href) ? "text-brand" : ""}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
