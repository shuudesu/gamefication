"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const STEPS = [
  "INIT_EXTRATOR",
  "LENDO_PDF",
  "PARSING_FONTE_URL",
  "ENVIANDO_PARA_HAIKU_4.5",
  "IDENTIFICANDO_BANCA",
  "MAPEANDO_MATERIAS",
  "DERIVANDO_TOPICOS",
  "GRAVANDO_SUPABASE",
];

const TICK_MS = 700;

export function ExtractionProgress() {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setVisibleCount((c) => (c >= STEPS.length ? c : c + 1));
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="border-4 border-foreground bg-surface shadow-[8px_8px_0_0_#000]">
      <header className="flex items-center justify-between border-b-4 border-foreground bg-background px-5 py-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold">
          <Loader2 className="size-4 text-accent animate-spin" strokeWidth={3} />
          <span>~/extraindo_edital</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted">
          <span className="size-2 rounded-full bg-accent animate-pulse" />
          <span>PROCESSING</span>
        </div>
      </header>

      <div className="p-6 font-mono text-sm text-terminal-green">
        {STEPS.slice(0, visibleCount).map((s, i) => (
          <p key={s} className="leading-relaxed">
            &gt; {s.padEnd(28, ".")}{" "}
            <span
              className={
                i === visibleCount - 1 ? "text-accent animate-pulse" : "text-terminal-green"
              }
            >
              {i === visibleCount - 1 ? "..." : "OK"}
            </span>
          </p>
        ))}
        <p className="mt-4 text-[11px] uppercase tracking-widest text-muted font-sans">
          Aguarde — extração de editais grandes pode levar até 60s.
        </p>
      </div>
    </section>
  );
}
