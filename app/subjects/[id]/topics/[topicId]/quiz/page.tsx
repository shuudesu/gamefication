import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase-server";
import { DailyQuestionBoard } from "@/components/DailyQuestionBoard";
import { deriveSubjectCode } from "@/lib/active-exam";
import type { Question } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = { id: string; topicId: string };

const PLACEHOLDER: Omit<Question, "subjectCode"> = {
  id: "0001",
  statement:
    "Esta é uma questão de exemplo. Clique em PRÓXIMA QUESTÃO para gerar uma personalizada com a IA usando o tópico do seu edital.",
  options: [
    "Opção A — placeholder.",
    "Opção B — placeholder.",
    "Opção C — placeholder correta.",
    "Opção D — placeholder.",
    "Opção E — placeholder.",
  ],
  correctOptionIndex: 2,
  explanation:
    "Esta é fictícia. A próxima vai vir da Claude Haiku 4.5 considerando o nome real do tópico e da matéria.",
};

export default async function QuizPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id: subjectId, topicId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  const supabase = await createClient();

  // Busca o tópico + matéria + exam num só round-trip via join lógico.
  // RLS de exam_topics/exam_subjects garante ownership.
  const { data: topic } = await supabase
    .from("exam_topics")
    .select("id, exam_subject_id, name, priority")
    .eq("id", topicId)
    .eq("exam_subject_id", subjectId)
    .maybeSingle();

  if (!topic) {
    notFound();
  }

  const { data: subject } = await supabase
    .from("exam_subjects")
    .select("id, name, exam_id")
    .eq("id", subjectId)
    .maybeSingle();

  if (!subject) {
    notFound();
  }

  // Defesa em profundidade: confirma que o exam é do usuário.
  const { data: exam } = await supabase
    .from("exams")
    .select("id")
    .eq("id", subject.exam_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!exam) {
    notFound();
  }

  const subjectCode = deriveSubjectCode(subject.name);
  const seedQuestion: Question = { ...PLACEHOLDER, subjectCode };

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="sticky top-0 z-10 border-b-4 border-foreground bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 sm:px-6 py-4">
          <Link
            href={`/subjects/${subjectId}`}
            className="inline-flex items-center gap-2 border-[3px] border-foreground bg-surface px-3 py-1.5 text-[11px] uppercase tracking-widest font-bold shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#000]"
          >
            <ArrowLeft className="size-4" strokeWidth={3} />
            VOLTAR
          </Link>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted">
              &gt; QUIZ_ATIVO
            </p>
            <p className="text-[11px] uppercase tracking-widest font-bold truncate max-w-[40ch] sm:max-w-[60ch]">
              {subject.name} / {topic.name}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <section className="border-4 border-foreground bg-surface p-4 sm:p-5 shadow-[6px_6px_0_0_#000]">
          <p className="text-[11px] uppercase tracking-widest text-muted">
            &gt; TOPICO_FOCO
          </p>
          <h1 className="mt-1 font-sans text-xl sm:text-2xl font-black leading-tight">
            {topic.name}
          </h1>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-muted">
            prioridade: {topic.priority}
          </p>
        </section>

        <DailyQuestionBoard
          topicId={topic.id}
          topicName={topic.name}
          subjectName={subject.name}
          subjectCode={subjectCode}
          initialQuestion={seedQuestion}
        />
      </main>
    </div>
  );
}
