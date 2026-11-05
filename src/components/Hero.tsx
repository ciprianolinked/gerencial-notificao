import type { ReactNode } from "react";

export function Hero({
  eyebrow,
  titulo,
  texto,
  actions,
  aside,
  bullets,
  compact = false,
}: {
  eyebrow: string;
  titulo: string;
  texto: string;
  actions?: ReactNode;
  aside?: ReactNode;
  bullets?: string[];
  compact?: boolean;
}) {
  return (
    <section className="no-print relative mb-5 overflow-hidden rounded-2xl bg-ink text-white shadow-[0_30px_60px_-40px_rgba(24,20,71,0.8)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 82% 18%, rgba(250,177,42,0.55) 0, transparent 42%), radial-gradient(circle at 12% 90%, rgba(250,177,42,0.25) 0, transparent 38%)",
        }}
      />
      <div
        className={`relative grid gap-6 px-5 sm:px-8 ${compact ? "py-6 sm:py-7" : "py-7 sm:py-9"} ${
          aside ? "lg:grid-cols-[1.15fr_0.85fr] lg:items-center" : ""
        }`}
      >
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.18em] text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {eyebrow}
          </p>
          <h1
            className={`font-display mt-3 max-w-[620px] leading-[1.08] ${
              compact ? "text-[26px] sm:text-[32px]" : "text-[30px] sm:text-[40px]"
            }`}
          >
            {titulo}
          </h1>
          <p className="mt-2.5 max-w-[560px] text-[13px] leading-relaxed text-white/70 sm:text-[14px]">
            {texto}
          </p>
          {actions ? <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div> : null}
          {bullets && bullets.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-white/60">
              {bullets.map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 text-brand" aria-hidden="true">
                    <path d="M5 12l5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {b}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {aside}
      </div>
    </section>
  );
}
