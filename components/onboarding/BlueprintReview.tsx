"use client";

import { ArrowRight, Building2, Calendar, Hash, Target } from "lucide-react";
import type { IntakeFinalized } from "@/types";

type Props = {
  data: IntakeFinalized;
  onConfirm: () => void;
};

function pct(weight: number): string {
  return `${(weight * 100).toFixed(0).padStart(2, "0")}%`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso + "T00:00:00").getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export function BlueprintReview({ data, onConfirm }: Props) {
  const { exam, subjects } = data;
  const totalTopics = subjects.reduce((acc, s) => acc + s.topics.length, 0);
  const days = daysUntil(exam.exam_date);

  return (
    <section className="space-y-6">
      <header className="border-4 border-foreground bg-surface p-5 shadow-[8px_8px_0_0_#000]">
        <p className="text-[11px] uppercase tracking-widest text-muted">
          &gt; CONCURSO_EXTRAIDO
        </p>
        <h2 className="mt-1 font-sans text-xl sm:text-2xl font-black leading-tight">
          {exam.name}
        </h2>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-[11px] uppercase tracking-widest">
          <Field icon={<Building2 className="size-4" strokeWidth={3} />} label="Banca" value={exam.banca ?? "—"} />
          <Field icon={<Target className="size-4" strokeWidth={3} />} label="Cargo" value={exam.cargo ?? "—"} />
          <Field
            icon={<Calendar className="size-4" strokeWidth={3} />}
            label="Prova"
            value={
              exam.exam_date
                ? `${formatDate(exam.exam_date)}${days !== null ? ` (${days}D)` : ""}`
                : "—"
            }
          />
          <Field
            icon={<Hash className="size-4" strokeWidth={3} />}
            label="Vagas"
            value={exam.vacancies !== null ? String(exam.vacancies) : "—"}
          />
        </dl>
      </header>

      <div>
        <div className="mb-4 flex items-center gap-3">
          <span className="border-[3px] border-foreground bg-accent px-2 py-0.5 text-xs font-black uppercase tracking-widest text-accent-fg">
            {String(subjects.length).padStart(2, "0")}
          </span>
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em]">
            Matérias / {totalTopics} tópicos
          </h3>
          <div className="h-[3px] flex-1 bg-foreground" />
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {subjects.map((s) => (
            <li
              key={s.id}
              className="border-4 border-foreground bg-surface p-4 shadow-[4px_4px_0_0_#000]"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-sm font-black uppercase leading-tight">
                  {s.name}
                </h4>
                <span className="shrink-0 border-[3px] border-foreground bg-accent px-2 py-0.5 text-[11px] font-black text-accent-fg tabular-nums">
                  {pct(s.weight)}
                </span>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-muted">
                {String(s.topics.length).padStart(2, "0")} tópicos
              </p>

              <ul className="mt-3 space-y-1.5 font-sans text-[13px] leading-relaxed">
                {s.topics.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 size-2 shrink-0 ${
                        t.priority === "high"
                          ? "bg-accent"
                          : t.priority === "low"
                            ? "bg-muted"
                            : "bg-foreground"
                      }`}
                      aria-label={`Prioridade ${t.priority}`}
                    />
                    <span>{t.name}</span>
                  </li>
                ))}
                {s.topics.length > 5 ? (
                  <li className="text-[11px] uppercase tracking-widest text-muted">
                    + {s.topics.length - 5} tópicos
                  </li>
                ) : null}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onConfirm}
        className="inline-flex w-full items-center justify-center gap-2 border-4 border-foreground bg-accent px-5 py-4 text-sm font-black uppercase tracking-widest text-accent-fg shadow-[6px_6px_0_0_#000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#000]"
      >
        ENTRAR NO DASHBOARD
        <ArrowRight className="size-5" strokeWidth={4} />
      </button>
    </section>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-[3px] border-foreground bg-background px-3 py-2">
      <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-sans text-sm font-bold text-foreground truncate">
        {value}
      </dd>
    </div>
  );
}
