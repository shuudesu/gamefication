"use client";

import {
  ArrowRight,
  BookOpen,
  Brain,
  Cpu,
  Newspaper,
  Scale,
  Shield,
  type LucideIcon,
} from "lucide-react";
import type { Subject, SubjectIconKey } from "@/types";

const ICONS: Record<SubjectIconKey, LucideIcon> = {
  scale: Scale,
  shield: Shield,
  book: BookOpen,
  brain: Brain,
  cpu: Cpu,
  newspaper: Newspaper,
};

type Props = {
  subject: Subject;
  onSelect?: (subject: Subject) => void;
};

export function SubjectCard({ subject, onSelect }: Props) {
  const Icon = ICONS[subject.iconKey];
  const total = Math.max(subject.totalQuestions, 0);
  const answered = Math.min(subject.answeredQuestions, total);
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(subject)}
      className="group block w-full text-left border-4 border-foreground bg-surface p-5 shadow-[6px_6px_0_0_#000] transition-transform duration-100 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[10px_10px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#000] focus:outline-none focus-visible:ring-4 focus-visible:ring-accent"
    >
      <div className="flex items-start justify-between">
        <div className="grid size-11 place-items-center border-[3px] border-foreground bg-accent text-accent-fg">
          <Icon className="size-5" strokeWidth={3} />
        </div>
        <span className="border-[2px] border-foreground/60 bg-background px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted">
          [{subject.code}]
        </span>
      </div>

      <h3 className="mt-5 text-base sm:text-lg font-bold uppercase leading-tight tracking-tight">
        {subject.name}
      </h3>

      <div className="mt-4 flex items-baseline justify-between text-xs uppercase tracking-wider">
        <span className="tabular-nums">
          {String(answered).padStart(4, "0")}
          <span className="text-muted">/{String(total).padStart(4, "0")}</span>
        </span>
        <span className="text-accent font-bold tabular-nums">
          {String(pct).padStart(2, "0")}%
        </span>
      </div>

      <div className="mt-2 h-3 w-full border-[3px] border-foreground bg-background">
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest text-muted">
          ACC <span className="text-foreground tabular-nums">{subject.accuracy}%</span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs uppercase tracking-widest font-bold">
          ABRIR
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-1"
            strokeWidth={4}
          />
        </span>
      </div>
    </button>
  );
}
