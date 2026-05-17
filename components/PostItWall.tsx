"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BookmarkPlus,
  Lightbulb,
  Loader2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { PostItKind, PostItRow } from "@/types";

type Props = {
  examSubjectId: string;
  initialSaved: PostItRow[];
};

const KIND_LABEL: Record<PostItKind, string> = {
  tip: "DICA",
  mnemonic: "MNEMÔNICO",
  concept: "CONCEITO",
  pitfall: "PEGADINHA",
  strategy: "ESTRATÉGIA",
};

// Cores diferentes por tipo, mantendo paleta brutalista do app.
const KIND_BG: Record<PostItKind, string> = {
  tip: "bg-accent text-accent-fg",
  mnemonic: "bg-purple text-foreground",
  concept: "bg-terminal-green/30 text-foreground",
  pitfall: "bg-terminal-red/20 text-foreground",
  strategy: "bg-surface-2 text-foreground",
};

export function PostItWall({ examSubjectId, initialSaved }: Props) {
  const [saved, setSaved] = useState<PostItRow[]>(initialSaved);
  const [ephemeral, setEphemeral] = useState<PostItRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/post-its/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examSubjectId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || `HTTP ${res.status}`);
      }
      setEphemeral(data.postIt as PostItRow);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(postIt: PostItRow) {
    setError(null);
    // Otimista: move pro mural na hora, reverte se a API falhar.
    const optimistic: PostItRow = { ...postIt, is_saved: true };
    setSaved((prev) => [optimistic, ...prev]);
    setEphemeral(null);
    try {
      const res = await fetch("/api/post-its/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postItId: postIt.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.details || data.error || `HTTP ${res.status}`);
      }
    } catch (err) {
      setSaved((prev) => prev.filter((p) => p.id !== postIt.id));
      setError(err instanceof Error ? err.message : "Falha ao salvar");
    }
  }

  async function handleDiscard(postIt: PostItRow) {
    // Descarta o efêmero: deleta do banco pra não acumular lixo.
    setEphemeral(null);
    try {
      await fetch("/api/post-its/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postItId: postIt.id }),
      });
    } catch {
      // Silencioso: lixo na DB não é crítico, o cron cleanup futuro resolve.
    }
  }

  async function handleRemoveSaved(postItId: string) {
    setError(null);
    const snapshot = saved;
    setSaved((prev) => prev.filter((p) => p.id !== postItId));
    try {
      const res = await fetch("/api/post-its/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postItId }),
      });
      if (!res.ok) throw new Error("Falha ao deletar");
    } catch (err) {
      setSaved(snapshot);
      setError(err instanceof Error ? err.message : "Falha ao remover");
    }
  }

  return (
    <div className="space-y-4">
      {/* CTA pra puxar novo post-it. Geração deliberada (cooldown via UI). */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 border-4 border-foreground bg-accent px-4 py-2.5 text-xs font-black uppercase tracking-widest text-accent-fg shadow-[4px_4px_0_0_#000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#000] disabled:cursor-wait disabled:bg-surface-2 disabled:text-muted disabled:shadow-none"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" strokeWidth={4} />
              GERANDO...
            </>
          ) : (
            <>
              <Sparkles className="size-4" strokeWidth={4} />
              {ephemeral ? "PUXAR OUTRO" : "PUXAR NOVO POST-IT"}
            </>
          )}
        </button>

        <span className="text-[10px] uppercase tracking-widest text-muted">
          &gt; {saved.length.toString().padStart(2, "0")} salvos no mural
        </span>
      </div>

      {error ? (
        <div className="flex items-start gap-3 border-4 border-terminal-red bg-terminal-red/10 px-4 py-3 text-[11px] uppercase tracking-widest text-terminal-red">
          <AlertTriangle className="size-4 shrink-0" strokeWidth={4} />
          <span className="font-bold">
            &gt; ERRO_POST_IT:{" "}
            <span className="font-sans normal-case">{error}</span>
          </span>
        </div>
      ) : null}

      {/* Post-it efêmero: destacado, com SALVAR/DESCARTAR */}
      {ephemeral ? (
        <div className="border-4 border-dashed border-accent bg-accent/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-accent font-bold">
              &gt; NOVO • {KIND_LABEL[ephemeral.kind]}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted">
              efêmero — salva ou descarta
            </span>
          </div>
          <PostItCard postIt={ephemeral} />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => handleSave(ephemeral)}
              className="inline-flex flex-1 items-center justify-center gap-2 border-[3px] border-foreground bg-terminal-green px-4 py-2 text-xs font-black uppercase tracking-widest text-foreground shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_#000]"
            >
              <BookmarkPlus className="size-4" strokeWidth={4} />
              SALVAR NO MURAL
            </button>
            <button
              type="button"
              onClick={() => handleDiscard(ephemeral)}
              className="inline-flex items-center justify-center gap-2 border-[3px] border-foreground bg-background px-4 py-2 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_#000]"
            >
              <X className="size-4" strokeWidth={4} />
              DESCARTAR
            </button>
          </div>
        </div>
      ) : (
        <div className="border-4 border-dashed border-foreground/40 bg-background p-6 text-center">
          <Lightbulb
            className="mx-auto size-6 text-muted"
            strokeWidth={3}
          />
          <p className="mt-2 text-[11px] uppercase tracking-widest text-muted">
            &gt; clique em puxar novo pra ver uma dica/conceito da matéria
          </p>
        </div>
      )}

      {/* Mural: post-its salvos */}
      {saved.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {saved.map((p) => (
            <div key={p.id} className="relative group">
              <PostItCard postIt={p} />
              <button
                type="button"
                onClick={() => handleRemoveSaved(p.id)}
                aria-label="Remover post-it"
                className="absolute right-2 top-2 grid size-7 place-items-center border-[2px] border-foreground bg-background text-muted opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 hover:text-terminal-red"
              >
                <Trash2 className="size-3.5" strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PostItCard({ postIt }: { postIt: PostItRow }) {
  const bg = KIND_BG[postIt.kind];
  return (
    <article
      className={`relative border-4 border-foreground p-4 shadow-[5px_5px_0_0_#000] ${bg}`}
    >
      <header className="mb-2 flex items-center justify-between">
        <span className="border-[2px] border-current px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
          {KIND_LABEL[postIt.kind]}
        </span>
        <time
          dateTime={postIt.created_at}
          className="text-[10px] uppercase tracking-widest opacity-70 tabular-nums"
        >
          {formatDate(postIt.created_at)}
        </time>
      </header>
      <p className="font-sans text-sm leading-relaxed">{postIt.content}</p>
    </article>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
}
