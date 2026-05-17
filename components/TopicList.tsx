import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import type { ExamTopicRow, TopicPriority } from "@/types";

type Props = {
  subjectId: string;
  topics: ExamTopicRow[];
};

const PRIORITY_ORDER: TopicPriority[] = ["high", "medium", "low"];

const PRIORITY_LABEL: Record<TopicPriority, string> = {
  high: "PRIORIDADE ALTA",
  medium: "PRIORIDADE MÉDIA",
  low: "PRIORIDADE BAIXA",
};

const PRIORITY_BADGE: Record<TopicPriority, string> = {
  high: "bg-accent text-accent-fg",
  medium: "bg-foreground text-background",
  low: "bg-surface-2 text-muted",
};

export function TopicList({ subjectId, topics }: Props) {
  const grouped = new Map<TopicPriority, ExamTopicRow[]>();
  for (const t of topics) {
    const arr = grouped.get(t.priority) ?? [];
    arr.push(t);
    grouped.set(t.priority, arr);
  }

  if (topics.length === 0) {
    return (
      <p className="border-4 border-foreground bg-surface p-5 text-xs uppercase tracking-widest text-muted">
        &gt; nenhum tópico extraído pra essa matéria
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {PRIORITY_ORDER.map((priority) => {
        const list = grouped.get(priority);
        if (!list || list.length === 0) return null;

        return (
          <section key={priority}>
            <header className="mb-3 flex items-center gap-3">
              <span
                className={`border-[3px] border-foreground px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${PRIORITY_BADGE[priority]}`}
              >
                {PRIORITY_LABEL[priority]}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted tabular-nums">
                {list.length.toString().padStart(2, "0")} tópicos
              </span>
              <div className="h-[2px] flex-1 bg-foreground/30" />
            </header>

            <ul className="grid gap-2">
              {list.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/subjects/${subjectId}/topics/${t.id}/quiz`}
                    className="group flex items-center gap-3 border-[3px] border-foreground bg-surface px-4 py-3 shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_#000]"
                  >
                    <span
                      className={`size-2.5 shrink-0 ${
                        priority === "high"
                          ? "bg-accent"
                          : priority === "low"
                            ? "bg-muted"
                            : "bg-foreground"
                      }`}
                      aria-hidden
                    />
                    <span className="flex-1 font-sans text-sm leading-tight">
                      {t.name}
                    </span>
                    {t.estimated_hours ? (
                      <span className="hidden items-center gap-1 text-[10px] uppercase tracking-widest text-muted tabular-nums sm:inline-flex">
                        <Clock className="size-3" strokeWidth={3} />
                        {t.estimated_hours}H
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-accent">
                      INICIAR
                      <ArrowRight
                        className="size-3.5 transition-transform group-hover:translate-x-0.5"
                        strokeWidth={4}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
