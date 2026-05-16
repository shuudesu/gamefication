"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CircleDot,
  Coins,
  GraduationCap,
  Layers,
  Loader2,
} from "lucide-react";
import type { CargoBlueprint, ExamRow } from "@/types";

type Props = {
  exam: ExamRow;
  cargos: CargoBlueprint[];
  onSelected: (cargoIndex: number) => Promise<void>;
};

export function CargoSelector({ exam, cargos, onSelected }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (selectedIndex === null) return;
    setLoading(true);
    setError(null);
    try {
      await onSelected(selectedIndex);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="border-4 border-foreground bg-surface p-5 shadow-[8px_8px_0_0_#000]">
        <p className="text-[11px] uppercase tracking-widest text-muted">
          &gt; STEP 02 / SELECIONAR_CARGO
        </p>
        <h2 className="mt-1 font-sans text-xl sm:text-2xl font-black leading-tight">
          {exam.name}
        </h2>
        <p className="mt-3 font-sans text-sm text-muted leading-relaxed">
          O edital tem{" "}
          <span className="text-accent font-bold">
            {String(cargos.length).padStart(2, "0")} cargos
          </span>
          . Escolha qual você vai estudar — só o conteúdo programático dele
          entra no seu dashboard.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {cargos.map((cargo, idx) => {
          const isSelected = selectedIndex === idx;
          const subjectsCount = cargo.subjects.length;
          const topicsCount = cargo.subjects.reduce(
            (acc, s) => acc + s.topics.length,
            0
          );

          return (
            <li key={idx}>
              <button
                type="button"
                onClick={() => setSelectedIndex(idx)}
                disabled={loading}
                className={`group block w-full text-left border-4 p-5 shadow-[6px_6px_0_0_#000] transition-transform duration-100 disabled:cursor-not-allowed ${
                  isSelected
                    ? "border-accent bg-accent/10 -translate-x-1 -translate-y-1 shadow-[10px_10px_0_0_#000]"
                    : "border-foreground bg-surface hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#000]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`grid size-11 shrink-0 place-items-center border-[3px] border-foreground ${
                        isSelected
                          ? "bg-accent text-accent-fg"
                          : "bg-background text-foreground"
                      }`}
                    >
                      <Briefcase className="size-5" strokeWidth={3} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-sans text-base sm:text-lg font-black leading-tight">
                        {cargo.name}
                      </h3>
                      <p className="mt-1 text-[10px] uppercase tracking-widest text-muted">
                        opção {String(idx + 1).padStart(2, "0")}
                      </p>
                    </div>
                  </div>
                  {isSelected ? (
                    <CircleDot
                      className="size-5 shrink-0 text-accent"
                      strokeWidth={4}
                    />
                  ) : (
                    <div className="size-5 shrink-0 border-[3px] border-foreground/40 rounded-full" />
                  )}
                </div>

                <dl className="mt-4 grid gap-2 text-[11px] uppercase tracking-widest">
                  {cargo.vagas !== null ? (
                    <MiniField label="Vagas" value={String(cargo.vagas)} />
                  ) : null}
                  {cargo.salary ? (
                    <MiniField
                      icon={<Coins className="size-3.5" strokeWidth={3} />}
                      label="Salário"
                      value={cargo.salary}
                    />
                  ) : null}
                  {cargo.requirements ? (
                    <MiniField
                      icon={
                        <GraduationCap className="size-3.5" strokeWidth={3} />
                      }
                      label="Requisitos"
                      value={cargo.requirements}
                    />
                  ) : null}
                  <MiniField
                    icon={<Layers className="size-3.5" strokeWidth={3} />}
                    label="Programa"
                    value={`${subjectsCount} matérias / ${topicsCount} tópicos`}
                  />
                </dl>
              </button>
            </li>
          );
        })}
      </ul>

      {error ? (
        <div className="flex items-start gap-3 border-4 border-terminal-red bg-terminal-red/10 px-4 py-3 text-[11px] uppercase tracking-widest text-terminal-red">
          <AlertTriangle className="size-4 shrink-0" strokeWidth={4} />
          <span className="font-bold">
            &gt; ERRO_SELECAO:{" "}
            <span className="font-sans normal-case">{error}</span>
          </span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={selectedIndex === null || loading}
        className="inline-flex w-full items-center justify-center gap-2 border-4 border-foreground bg-accent px-5 py-4 text-sm font-black uppercase tracking-widest text-accent-fg shadow-[6px_6px_0_0_#000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#000] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted disabled:shadow-none"
      >
        {loading ? (
          <>
            <Loader2 className="size-5 animate-spin" strokeWidth={4} />
            FINALIZANDO_CARGO...
          </>
        ) : (
          <>
            &gt; CONFIRMAR_CARGO
            <ArrowRight className="size-5" strokeWidth={4} />
          </>
        )}
      </button>
    </section>
  );
}

function MiniField({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-[2px] border-foreground/40 bg-background px-3 py-1.5">
      <dt className="flex items-center gap-1.5 text-[10px] text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 font-sans text-xs font-bold normal-case text-foreground">
        {value}
      </dd>
    </div>
  );
}
