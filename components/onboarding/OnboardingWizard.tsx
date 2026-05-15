"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Sparkles } from "lucide-react";
import { EditalDropzone } from "./EditalDropzone";
import { ExtractionProgress } from "./ExtractionProgress";
import { BlueprintReview } from "./BlueprintReview";
import type { IntakeResponse } from "@/types";

type Step = "input" | "processing" | "review";

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [pdf, setPdf] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<IntakeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = (pdf !== null || url.trim().length > 0) && step === "input";

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setStep("processing");
    try {
      const form = new FormData();
      if (pdf) form.append("pdf", pdf);
      if (url.trim()) form.append("url", url.trim());

      const res = await fetch("/api/exams/intake", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.details || data?.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setResult(data as IntakeResponse);
      setStep("review");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      setStep("input");
    }
  }

  function handleConfirm() {
    router.push("/");
    router.refresh();
  }

  if (step === "processing") {
    return <ExtractionProgress />;
  }

  if (step === "review" && result) {
    return <BlueprintReview data={result} onConfirm={handleConfirm} />;
  }

  return (
    <section className="border-4 border-foreground bg-surface p-5 sm:p-7 shadow-[8px_8px_0_0_#000]">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid size-10 place-items-center border-[3px] border-foreground bg-accent text-accent-fg">
          <Sparkles className="size-5" strokeWidth={4} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">STEP 01</p>
          <h2 className="text-lg font-black uppercase tracking-widest leading-none">
            Carregar Edital
          </h2>
        </div>
      </div>

      <p className="mb-6 font-sans text-sm leading-relaxed text-muted">
        Envie o PDF do edital, cole a URL da página do concurso, ou{" "}
        <span className="text-foreground font-bold">ambos</span>. A IA vai
        identificar banca, matérias, pesos e tópicos para personalizar todo o
        sistema.
      </p>

      <EditalDropzone
        pdf={pdf}
        url={url}
        onPdfChange={setPdf}
        onUrlChange={setUrl}
      />

      {error ? (
        <div className="mt-5 flex items-start gap-3 border-4 border-terminal-red bg-terminal-red/10 px-4 py-3 text-[11px] uppercase tracking-widest text-terminal-red">
          <AlertTriangle className="size-4 shrink-0" strokeWidth={4} />
          <span className="font-bold">
            &gt; ERRO_INTAKE:{" "}
            <span className="font-sans normal-case">{error}</span>
          </span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="mt-6 w-full border-4 border-foreground bg-accent px-5 py-4 text-sm font-black uppercase tracking-widest text-accent-fg shadow-[6px_6px_0_0_#000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#000] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted disabled:shadow-none"
      >
        &gt; ANALISAR_EDITAL
      </button>

      <p className="mt-3 text-center font-sans text-[11px] text-muted">
        Modelo: Claude Haiku 4.5 com tool use estruturado. ~$0.30/edital.
      </p>
    </section>
  );
}
