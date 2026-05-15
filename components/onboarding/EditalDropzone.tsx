"use client";

import { useRef, useState } from "react";
import { FileText, Link2, Upload, X } from "lucide-react";

type Props = {
  pdf: File | null;
  url: string;
  disabled?: boolean;
  onPdfChange: (file: File | null) => void;
  onUrlChange: (url: string) => void;
};

const MAX_BYTES = 50 * 1024 * 1024;

export function EditalDropzone({
  pdf,
  url,
  disabled = false,
  onPdfChange,
  onUrlChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function validateAndSet(file: File | null) {
    setLocalError(null);
    if (!file) {
      onPdfChange(null);
      return;
    }
    if (file.type !== "application/pdf") {
      setLocalError("Apenas PDF é aceito.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("PDF excede 50MB.");
      return;
    }
    onPdfChange(file);
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted">
          <FileText className="size-4" strokeWidth={3} />
          <span className="font-bold text-foreground">EDITAL.PDF</span>
          <span>// upload</span>
        </label>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (disabled) return;
            const file = e.dataTransfer.files?.[0] ?? null;
            validateAndSet(file);
          }}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`relative grid cursor-pointer place-items-center border-4 border-dashed p-8 text-center transition-colors ${
            dragging
              ? "border-accent bg-accent/10"
              : pdf
                ? "border-terminal-green bg-terminal-green/5"
                : "border-foreground bg-background hover:bg-surface-2"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={disabled}
            onChange={(e) => validateAndSet(e.target.files?.[0] ?? null)}
          />

          {pdf ? (
            <div className="flex w-full items-center justify-between gap-3 font-sans">
              <div className="flex min-w-0 items-center gap-3">
                <FileText
                  className="size-6 shrink-0 text-terminal-green"
                  strokeWidth={3}
                />
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-bold">{pdf.name}</p>
                  <p className="text-[11px] uppercase tracking-widest text-muted">
                    {(pdf.size / 1024 / 1024).toFixed(2)}MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  validateAndSet(null);
                }}
                disabled={disabled}
                className="grid size-9 place-items-center border-[3px] border-foreground bg-surface text-foreground transition-colors hover:bg-terminal-red hover:text-accent-fg"
                aria-label="Remover arquivo"
              >
                <X className="size-4" strokeWidth={4} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="size-8 text-foreground" strokeWidth={3} />
              <p className="text-sm uppercase tracking-widest font-bold">
                Arraste o PDF ou clique
              </p>
              <p className="font-sans text-xs text-muted">
                application/pdf, máx 50MB
              </p>
            </div>
          )}
        </div>

        {localError ? (
          <p className="mt-2 border-l-4 border-terminal-red bg-terminal-red/10 px-3 py-1.5 text-[11px] uppercase tracking-widest text-terminal-red">
            &gt; {localError}
          </p>
        ) : null}
      </div>

      <div className="relative flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-muted">
        <div className="h-[3px] flex-1 bg-foreground/30" />
        <span>OU</span>
        <div className="h-[3px] flex-1 bg-foreground/30" />
      </div>

      <div>
        <label
          htmlFor="exam-url"
          className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted"
        >
          <Link2 className="size-4" strokeWidth={3} />
          <span className="font-bold text-foreground">URL_CONCURSO</span>
          <span>// banca/edital</span>
        </label>
        <input
          id="exam-url"
          type="url"
          inputMode="url"
          placeholder="https://www.banca.com.br/edital-2026"
          value={url}
          disabled={disabled}
          onChange={(e) => onUrlChange(e.target.value)}
          className="w-full border-4 border-foreground bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="mt-2 font-sans text-[11px] text-muted">
          Aceita HTML ou PDF público. Limite 5MB por URL.
        </p>
      </div>
    </div>
  );
}
