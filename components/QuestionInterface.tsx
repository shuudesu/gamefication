"use client";

import { useState } from "react";
import { Check, ChevronRight, Loader2, Terminal, X } from "lucide-react";
import type { Question } from "@/types";

const LETTERS = ["A", "B", "C", "D", "E"] as const;

type SubmitResult = {
  selectedIndex: number;
  isCorrect: boolean;
};

type Props = {
  question: Question;
  onSubmit?: (result: SubmitResult) => void;
  onNext?: () => void;
  isLoadingNext?: boolean;
};

export function QuestionInterface({
  question,
  onSubmit,
  onNext,
  isLoadingNext = false,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const correctIndex = question.correctOptionIndex;
  const isCorrect = submitted && selected === correctIndex;

  function letterFor(i: number): string {
    return LETTERS[i] ?? String(i + 1);
  }

  function handleSubmit() {
    if (selected === null) return;
    setSubmitted(true);
    onSubmit?.({
      selectedIndex: selected,
      isCorrect: selected === correctIndex,
    });
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
          {question.options.map((text, i) => {
            const letter = letterFor(i);
            const isSelected = selected === i;
            const isThisCorrect = submitted && i === correctIndex;
            const isThisWrong =
              submitted && isSelected && i !== correctIndex;

            let stateClasses =
              "border-foreground bg-background hover:bg-surface-2";
            if (isThisCorrect) {
              stateClasses =
                "border-terminal-green bg-terminal-green/10 text-terminal-green";
            } else if (isThisWrong) {
              stateClasses =
                "border-terminal-red bg-terminal-red/10 text-terminal-red";
            } else if (isSelected) {
              stateClasses = "border-accent bg-accent/10 text-accent";
            }

            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={submitted}
                  onClick={() => setSelected(i)}
                  className={`flex w-full items-start gap-3 border-[3px] p-3 text-left text-sm transition-colors disabled:cursor-not-allowed ${stateClasses}`}
                >
                  <span className="grid size-9 shrink-0 place-items-center border-[3px] border-current text-base font-black">
                    {letter}
                  </span>
                  <span className="pt-1.5 font-sans text-sm sm:text-base">
                    {text}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {!submitted ? (
          <button
            type="button"
            disabled={selected === null}
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
                  : `> ERROU. CORRETA: ${letterFor(correctIndex)}`}
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
              onClick={onNext}
              disabled={isLoadingNext}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 border-4 border-foreground bg-purple px-5 py-3 text-sm font-black uppercase tracking-widest text-foreground shadow-[4px_4px_0_0_#000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-purple-hover hover:shadow-[6px_6px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#000] disabled:cursor-wait disabled:bg-surface-2 disabled:text-muted disabled:shadow-none"
            >
              {isLoadingNext ? (
                <>
                  <Loader2 className="size-5 animate-spin" strokeWidth={4} />
                  GERANDO_QUESTÃO...
                </>
              ) : (
                <>
                  <ChevronRight className="size-5" strokeWidth={4} />
                  PRÓXIMA QUESTÃO
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
