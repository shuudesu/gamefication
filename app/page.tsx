import { redirect } from "next/navigation";
import { Calendar, Hash, Trophy, User } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import { StaminaBar } from "@/components/StaminaBar";
import { SubjectCard } from "@/components/SubjectCard";
import { DailyQuestionBoard } from "@/components/DailyQuestionBoard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import {
  daysUntilExam,
  deriveSubjectCode,
  fetchActiveExam,
  fetchUserProfile,
  normalizeIconKey,
} from "@/lib/active-exam";
import type { Question, Subject } from "@/types";

const PLACEHOLDER_QUESTION_BY_SUBJECT: Record<string, Omit<Question, "subjectCode">> = {
  default: {
    id: "0001",
    statement:
      "Esta é uma questão de exemplo. Clique em PRÓXIMA QUESTÃO para gerar uma personalizada com a IA usando o seu edital.",
    options: [
      "Opção A — placeholder.",
      "Opção B — placeholder.",
      "Opção C — placeholder correta.",
      "Opção D — placeholder.",
    ],
    correctOptionIndex: 2,
    explanation:
      "Esta questão é fictícia. A próxima será gerada via Claude Haiku 4.5 a partir do tópico priorizado do seu edital.",
  },
};

function SectionTitle({ index, label }: { index: string; label: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="border-[3px] border-foreground bg-accent px-2 py-0.5 text-xs font-black uppercase tracking-widest text-accent-fg">
        {index}
      </span>
      <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em]">
        {label}
      </h2>
      <div className="h-[3px] flex-1 bg-foreground" />
    </div>
  );
}

export default async function DashboardPage() {
  const [active, profile] = await Promise.all([
    fetchActiveExam(),
    fetchUserProfile(),
  ]);
  if (!active) {
    redirect("/onboarding");
  }

  const { exam, subjects } = active;
  const days = daysUntilExam(exam.exam_date);
  const displayName = profile?.display_name ?? "OPERADOR";
  const xpDisplay = profile?.xp ?? 0;
  const levelDisplay = profile?.level ?? 1;

  const subjectCards: Subject[] = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    code: deriveSubjectCode(s.name),
    totalQuestions: Math.max(50, Math.round(s.weight * 500)),
    answeredQuestions: 0,
    accuracy: 0,
    iconKey: normalizeIconKey(s.icon_key),
  }));

  const priorityTopic =
    subjects
      .flatMap((s) => s.topics.map((t) => ({ topic: t, subject: s })))
      .sort((a, b) => priorityRank(a.topic.priority) - priorityRank(b.topic.priority))[0];

  const dailyTopicId = priorityTopic?.topic.id ?? "default";
  const dailyTopicName = priorityTopic?.topic.name;
  const dailySubjectName = priorityTopic?.subject.name ?? "Geral";
  const dailySubjectCode = deriveSubjectCode(dailySubjectName);

  const seedQuestion: Question = {
    ...PLACEHOLDER_QUESTION_BY_SUBJECT.default,
    subjectCode: dailySubjectCode,
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="sticky top-0 z-10 border-b-4 border-foreground bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center border-[3px] border-foreground bg-accent text-accent-fg">
              <Hash className="size-5" strokeWidth={4} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base sm:text-lg font-black uppercase tracking-widest leading-none">
                {exam.name}
              </p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted">
                {[exam.banca, exam.cargo].filter(Boolean).join(" / ") ||
                  "concurso.os v0.1"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {days !== null ? (
              <div className="hidden items-center gap-2 border-[3px] border-foreground bg-surface px-3 py-1.5 text-[11px] uppercase tracking-widest sm:flex">
                <Calendar className="size-4 text-accent" strokeWidth={3} />
                <span className="font-bold">PROVA</span>
                <span className="text-muted">|</span>
                <span className="tabular-nums">{days}D</span>
              </div>
            ) : null}
            <div className="hidden items-center gap-2 border-[3px] border-foreground bg-surface px-3 py-1.5 text-[11px] uppercase tracking-widest sm:flex">
              <Trophy className="size-4 text-accent" strokeWidth={3} />
              <span className="font-bold tabular-nums">
                LVL {String(levelDisplay).padStart(2, "0")}
              </span>
              <span className="text-muted">|</span>
              <span className="tabular-nums">{xpDisplay} XP</span>
            </div>
            <div className="flex items-center gap-2 border-[3px] border-foreground bg-surface px-3 py-1.5 text-[11px] uppercase tracking-widest">
              <User className="size-4" strokeWidth={3} />
              <span className="font-bold truncate max-w-[10ch] sm:max-w-[16ch]">
                {displayName}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-8 sm:py-10 space-y-12">
        <section>
          <SectionTitle index="01" label="Status Operacional" />
          <StaminaBar
            streakDays={0}
            goalDays={Math.max(7, days ?? 30)}
            weeklyHits={[false, false, false, false, false, false, false]}
          />
        </section>

        <section>
          <SectionTitle
            index="02"
            label={`Matérias // ${subjects.length.toString().padStart(2, "0")}`}
          />
          {subjectCards.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {subjectCards.map((s) => (
                <SubjectCard key={s.id} subject={s} />
              ))}
            </div>
          ) : (
            <p className="border-4 border-foreground bg-surface p-5 text-xs uppercase tracking-widest text-muted">
              &gt; nenhuma matéria extraída
            </p>
          )}
        </section>

        <section>
          <SectionTitle
            index="03"
            label={
              priorityTopic
                ? `Questão do Dia // ${priorityTopic.topic.name}`
                : "Questão do Dia"
            }
          />
          <DailyQuestionBoard
            topicId={dailyTopicId}
            topicName={dailyTopicName}
            subjectName={priorityTopic ? dailySubjectName : undefined}
            subjectCode={dailySubjectCode}
            initialQuestion={seedQuestion}
          />
        </section>
      </main>

      <footer className="border-t-4 border-foreground bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-4 text-[10px] uppercase tracking-[0.25em] text-muted">
          <span>&gt;_ {exam.banca ?? "sistema"} / {exam.cargo ?? "cargo"}</span>
          <span>build_2026.05.15</span>
        </div>
      </footer>
    </div>
  );
}

function priorityRank(p: "high" | "medium" | "low"): number {
  if (p === "high") return 0;
  if (p === "medium") return 1;
  return 2;
}
