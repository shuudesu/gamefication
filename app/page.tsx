import { Hash, Trophy, User } from "lucide-react";
import { StaminaBar } from "@/components/StaminaBar";
import { SubjectCard } from "@/components/SubjectCard";
import { QuestionInterface } from "@/components/QuestionInterface";
import type { Question, Subject } from "@/types";

const SUBJECTS: Subject[] = [
  {
    id: "1",
    name: "Direito Constitucional",
    code: "DCO",
    totalQuestions: 480,
    answeredQuestions: 312,
    accuracy: 78,
    iconKey: "scale",
  },
  {
    id: "2",
    name: "Direito Administrativo",
    code: "DAD",
    totalQuestions: 360,
    answeredQuestions: 198,
    accuracy: 71,
    iconKey: "shield",
  },
  {
    id: "3",
    name: "Língua Portuguesa",
    code: "POR",
    totalQuestions: 420,
    answeredQuestions: 401,
    accuracy: 84,
    iconKey: "book",
  },
  {
    id: "4",
    name: "Raciocínio Lógico",
    code: "RLM",
    totalQuestions: 250,
    answeredQuestions: 120,
    accuracy: 65,
    iconKey: "brain",
  },
  {
    id: "5",
    name: "Informática",
    code: "INF",
    totalQuestions: 200,
    answeredQuestions: 88,
    accuracy: 73,
    iconKey: "cpu",
  },
  {
    id: "6",
    name: "Atualidades",
    code: "ATU",
    totalQuestions: 150,
    answeredQuestions: 50,
    accuracy: 60,
    iconKey: "newspaper",
  },
];

const DAILY_QUESTION: Question = {
  id: "0042",
  subjectCode: "DCO",
  statement:
    "Segundo a Constituição Federal de 1988, são considerados direitos sociais, EXCETO:",
  options: [
    { id: "A", text: "Educação, saúde e alimentação." },
    { id: "B", text: "Trabalho, moradia e transporte." },
    { id: "C", text: "Liberdade religiosa e propriedade privada." },
    {
      id: "D",
      text: "Segurança, previdência social e proteção à maternidade e à infância.",
    },
  ],
  correctOptionId: "C",
  explanation:
    "Liberdade religiosa e propriedade privada são classificados como direitos individuais (art. 5º), e não como direitos sociais (art. 6º).",
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

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="sticky top-0 z-10 border-b-4 border-foreground bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center border-[3px] border-foreground bg-accent text-accent-fg">
              <Hash className="size-5" strokeWidth={4} />
            </div>
            <div>
              <p className="text-base sm:text-lg font-black uppercase tracking-widest leading-none">
                GAMEFICATION
              </p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted">
                concurso.os v0.1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 border-[3px] border-foreground bg-surface px-3 py-1.5 text-[11px] uppercase tracking-widest sm:flex">
              <Trophy className="size-4 text-accent" strokeWidth={3} />
              <span className="font-bold">LVL 07</span>
              <span className="text-muted">|</span>
              <span className="tabular-nums">2480 XP</span>
            </div>
            <div className="flex items-center gap-2 border-[3px] border-foreground bg-surface px-3 py-1.5 text-[11px] uppercase tracking-widest">
              <User className="size-4" strokeWidth={3} />
              <span className="font-bold">OPERADOR</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-8 sm:py-10 space-y-12">
        <section>
          <SectionTitle index="01" label="Status Operacional" />
          <StaminaBar
            streakDays={14}
            goalDays={30}
            weeklyHits={[true, true, true, true, true, false, true]}
          />
        </section>

        <section>
          <SectionTitle index="02" label="Matérias // Edital" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SUBJECTS.map((s) => (
              <SubjectCard key={s.id} subject={s} />
            ))}
          </div>
        </section>

        <section>
          <SectionTitle index="03" label="Questão do Dia" />
          <QuestionInterface question={DAILY_QUESTION} />
        </section>
      </main>

      <footer className="border-t-4 border-foreground bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-4 text-[10px] uppercase tracking-[0.25em] text-muted">
          <span>&gt;_ sistema operacional</span>
          <span>build_2026.05.15</span>
        </div>
      </footer>
    </div>
  );
}
