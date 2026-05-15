"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { QuestionInterface } from "./QuestionInterface";
import type {
  ErrorHistoryItem,
  GeneratedQuestionRow,
  Question,
} from "@/types";

type Props = {
  topicId: string;
  subjectCode: string;
  initialQuestion: Question;
};

function rowToQuestion(
  row: GeneratedQuestionRow,
  subjectCode: string
): Question {
  return {
    id: row.id ?? `gen-${Date.now()}`,
    subjectCode,
    statement: row.question_text,
    options: row.options,
    correctOptionIndex: row.correct_answer,
    explanation: row.explanation ?? undefined,
  };
}

export function DailyQuestionBoard({
  topicId,
  subjectCode,
  initialQuestion,
}: Props) {
  const [question, setQuestion] = useState<Question>(initialQuestion);
  const [errorHistory, setErrorHistory] = useState<ErrorHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  function handleSubmit(result: {
    selectedIndex: number;
    isCorrect: boolean;
  }) {
    if (result.isCorrect) return;
    setErrorHistory((prev) => [
      ...prev,
      {
        question_text: question.statement,
        user_choice: result.selectedIndex,
        correct_answer: question.correctOptionIndex,
      },
    ]);
  }

  async function handleNext() {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, errorHistory }),
      });
      const data = (await res.json()) as
        | { question: GeneratedQuestionRow }
        | { error: string; details?: string };

      if (!res.ok) {
        const msg =
          "details" in data && data.details
            ? data.details
            : "error" in data
              ? data.error
              : `HTTP ${res.status}`;
        throw new Error(msg);
      }

      if (!("question" in data) || !data.question) {
        throw new Error("Resposta sem questão");
      }

      setQuestion(rowToQuestion(data.question, subjectCode));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <QuestionInterface
        key={question.id}
        question={question}
        onSubmit={handleSubmit}
        onNext={handleNext}
        isLoadingNext={loading}
      />

      {fetchError ? (
        <div className="flex items-start gap-3 border-4 border-terminal-red bg-terminal-red/10 px-4 py-3 text-[11px] uppercase tracking-widest text-terminal-red">
          <AlertTriangle className="size-4 shrink-0" strokeWidth={4} />
          <span className="font-bold">
            &gt; ERRO_GERADOR:{" "}
            <span className="font-sans normal-case">{fetchError}</span>
          </span>
        </div>
      ) : null}

      {errorHistory.length > 0 ? (
        <p className="text-[10px] uppercase tracking-widest text-muted">
          &gt; HIST_ERROS: {String(errorHistory.length).padStart(2, "0")} —
          enviado no próximo prompt
        </p>
      ) : null}
    </div>
  );
}
