"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Sparkles } from "lucide-react";
import { EditalDropzone } from "./EditalDropzone";
import { ExtractionProgress } from "./ExtractionProgress";
import { BlueprintReview } from "./BlueprintReview";
import { CargoSelector } from "./CargoSelector";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import { tusResumableUpload } from "@/lib/tus-upload";
import type {
  CargoBlueprint,
  ExamRow,
  IntakeFinalized,
  IntakeResponse,
} from "@/types";

type Step = "input" | "processing" | "cargo_selection" | "review";

const STORAGE_BUCKET = "editais";

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [pdf, setPdf] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [draftExam, setDraftExam] = useState<ExamRow | null>(null);
  const [draftCargos, setDraftCargos] = useState<CargoBlueprint[]>([]);
  const [finalResult, setFinalResult] = useState<IntakeFinalized | null>(null);

  const canSubmit = (pdf !== null || url.trim().length > 0) && step === "input";

  async function uploadPdfToStorage(file: File): Promise<string> {
    const supabase = createBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user || !session) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const safe =
      file.name.replace(/[^\w.\-]/g, "_").slice(0, 80) || "edital.pdf";
    const path = `${user.id}/${Date.now()}_${safe}`;

    // Arquivos > 6MB precisam de resumable upload (TUS). O standard
    // `upload()` do SDK quebra ao tentar parsear "Request Entity Too Large"
    // (texto plain) como JSON, mascarando o erro real.
    const RESUMABLE_THRESHOLD = 6 * 1024 * 1024;
    if (file.size > RESUMABLE_THRESHOLD) {
      const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      await tusResumableUpload({
        file,
        path,
        bucket: STORAGE_BUCKET,
        projectUrl,
        accessToken: session.access_token,
      });
      return path;
    }

    try {
      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (uploadErr) {
        throw new Error(uploadErr.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Upload Storage (HTTP ${file.size}B): ${msg}`);
    }
    return path;
  }

  async function parseResponseOrThrow(res: Response) {
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      const hint =
        res.status === 413 || /too large|entity/i.test(text)
          ? "Resposta não-JSON do servidor (provável limite de proxy)."
          : `Resposta não-JSON (HTTP ${res.status}): ${text.slice(0, 120)}`;
      throw new Error(hint);
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.details || data?.error || `HTTP ${res.status}`);
    }
    return data;
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setStep("processing");

    try {
      let pdfPath: string | undefined;
      if (pdf) {
        pdfPath = await uploadPdfToStorage(pdf);
      }

      const res = await fetch("/api/exams/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfPath,
          url: url.trim() || undefined,
        }),
      });
      const data = (await parseResponseOrThrow(res)) as IntakeResponse;

      if (data.status === "finalized") {
        setFinalResult(data);
        setStep("review");
        return;
      }

      setDraftExam(data.exam);
      setDraftCargos(data.cargos);
      setStep("cargo_selection");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      setStep("input");
    }
  }

  async function handleCargoSelection(cargoIndex: number) {
    if (!draftExam) return;
    const res = await fetch("/api/exams/select-cargo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId: draftExam.id, cargoIndex }),
    });
    const data = (await parseResponseOrThrow(res)) as IntakeFinalized;
    setFinalResult(data);
    setStep("review");
  }

  function handleConfirm() {
    router.push("/");
    router.refresh();
  }

  if (step === "processing") {
    return <ExtractionProgress />;
  }

  if (step === "cargo_selection" && draftExam) {
    return (
      <CargoSelector
        exam={draftExam}
        cargos={draftCargos}
        onSelected={handleCargoSelection}
      />
    );
  }

  if (step === "review" && finalResult) {
    return <BlueprintReview data={finalResult} onConfirm={handleConfirm} />;
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
        identificar todos os cargos disponíveis e você escolhe qual estudar.
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
        Modelo: Claude Haiku 4.5 com tool use estruturado. PDF vai direto pro
        Storage do Supabase (sem limite de 4.5MB do Vercel).
      </p>
    </section>
  );
}
