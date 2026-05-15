"use client";

import { useState } from "react";
import { Check, ChevronRight, Terminal, X } from "lucide-react";
import type { OptionId, Question } from "@/types";

type Props = {
  question: Question;
  onNext?: () => void;
};

export function QuestionInterface({ question, onNext }: Props) {
  const [selected, setSelected] = useState<OptionId | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const correctId = question.correctOptionId;
  const isCorrect = submitted && selected === correctId;

  function handleSubmit() {
    if (!selected) return;
    setSubmitted(true);
  }

  function handleNext() {
    setSelected(null);
    setSubmitted(false);
    onNext?.();
  }

  return (
    <section className="border-4 border-foreground bg-surface shadow-[8px_8px_0_0_#000]">
      <header className="flex items-center justify-between border-b-4 border-foreground bg-background px-4 sm:px-5 py-3">
        <div className="flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-widest">
          <Terminal className="size-4 text-accent" strokeWidth={3} />
          <span className="font-bold">~/questao_do_dia</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted">
          <span className="size-2 rounded-full bg-terminal-green animate-pulse" />
          <span>LIVE</span>
          <span className="text-foreground/40">|</span>
          <span>[{question.subjectCode}]</span>
        </div>
      </header>

      <div className="p-5 sm:p-6">
        <p className="text-[11px] uppercase tracking-widest text-muted mb-2">
          &gt; QUESTÃO_{question.id}
        </p>
        <p className="font-sans text-base sm:text-lg leading-relaxed">
          {question.statement}
        </p>

        <ul className="mt-6 grid gap-3">
          {question.options.map((opt) => {
            const isSelected = selected === opt.id;
            const isThisCorrect = submitted && opt.id === correctId;
            const isThisWrong =
              submitted && isSelected && opt.id !== correctId;

            let stateClasses =
              "border-foreground bg-background hover:bg-surface-2";
            if (isThisCorrect) {
              stateClasses =
                "border-terminal-green bg-terminal-green/10 text-terminal-green";
            } else if (isThisWrong) {
              stateClasses =
                "border-terminal-red bg-terminal-red/10 text-terminal-red";
            } else if (isSelected) {
              stateClasses =
                "border-accent bg-accent/10 text-accent";
            }

            return (
              <li key={opt.id}>
                <button
                  type="button"
                  disabled={submitted}
                  onClick={() => setSelected(opt.id)}
                  className={`flex w-full items-start gap-3 border-[3px] p-3 text-left text-sm transition-colors disabled:cursor-not-allowed ${stateClasses}`}
                >
                  <span className="grid size-9 shrink-0 place-items-center border-[3px] border-current text-base font-black">
                    {opt.id}
                  </span>
                  <span className="pt-1.5 font-sans text-sm sm:text-base">
                    {opt.text}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {!submitted ? (
          <button
            type="button"
            disabled={!selected}
            onClick={handleSubmit}
            className="mt-6 w-full border-4 border-foreground bg-accent px-5 py-3 text-sm font-black uppercase tracking-widest text-accent-fg shadow-[4px_4px_0_0_#000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#000] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted disabled:shadow-none"
          >
            &gt; CONFIRMAR_RESPOSTA
          </button>
        ) : (
          <div className="mt-6">
            <div
              role="status"
              className={`flex items-center gap-3 border-4 px-4 py-3 text-sm uppercase tracking-widest ${
                isCorrect
                  ? "border-terminal-green bg-terminal-green/10 text-terminal-green"
                  : "border-terminal-red bg-terminal-red/10 text-terminal-red"
              }`}
            >
              {isCorrect ? (
                <Check className="size-5 shrink-0" strokeWidth={4} />
              ) : (
                <X className="size-5 shrink-0" strokeWidth={4} />
              )}
              <span className="font-black">
                {isCorrect
                  ? "> ACERTOU. +10 XP"
                  : `> ERROU. CORRETA: ${correctId}`}
              </span>
            </div>

            {question.explanation ? (
              <p className="mt-3 border-l-4 border-accent bg-background px-4 py-3 text-xs leading-relaxed text-muted">
                <span className="text-accent font-bold">&gt; LOG:</span>{" "}
                <span className="font-sans">{question.explanation}</span>
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleNext}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 border-4 border-foreground bg-purple px-5 py-3 text-sm font-black uppercase tracking-widest text-foreground shadow-[4px_4px_0_0_#000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-purple-hover hover:shadow-[6px_6px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#000]"
            >
              <ChevronRight className="size-5" strokeWidth={4} />
              PRÓXIMA QUESTÃO
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
