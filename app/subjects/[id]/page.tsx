import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Hash } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase-server";
import { PostItWall } from "@/components/PostItWall";
import { TopicList } from "@/components/TopicList";
import type {
  ExamSubjectRow,
  ExamTopicRow,
  PostItRow,
} from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = { id: string };

export default async function SubjectPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  const supabase = await createClient();

  // Busca matéria + valida ownership via JOIN com exam (RLS já cuida).
  const { data: subject, error: subjErr } = await supabase
    .from("exam_subjects")
    .select("id, exam_id, name, weight, icon_key, order_index, created_at")
    .eq("id", id)
    .maybeSingle();

  if (subjErr || !subject) {
    notFound();
  }

  // Verifica que o exam pertence ao usuário (defesa em profundidade —
  // a RLS de exam_subjects já deve garantir isso, mas é barato confirmar).
  const { data: exam } = await supabase
    .from("exams")
    .select("id, name, cargo, banca")
    .eq("id", subject.exam_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!exam) {
    notFound();
  }

  const [{ data: topics }, { data: savedPostIts }] = await Promise.all([
    supabase
      .from("exam_topics")
      .select("*")
      .eq("exam_subject_id", subject.id)
      .order("order_index", { ascending: true }),
    supabase
      .from("post_its")
      .select("*")
      .eq("user_id", user.id)
      .eq("exam_subject_id", subject.id)
      .eq("is_saved", true)
      .order("created_at", { ascending: false }),
  ]);

  const subjectRow = subject as ExamSubjectRow;
  const topicRows = (topics ?? []) as ExamTopicRow[];
  const savedRows = (savedPostIts ?? []) as PostItRow[];
  const weightPct = `${Math.round(subjectRow.weight * 100)
    .toString()
    .padStart(2, "0")}%`;

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="sticky top-0 z-10 border-b-4 border-foreground bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 border-[3px] border-foreground bg-surface px-3 py-1.5 text-[11px] uppercase tracking-widest font-bold shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#000]"
          >
            <ArrowLeft className="size-4" strokeWidth={3} />
            DASHBOARD
          </Link>
          <div className="hidden items-center gap-2 border-[3px] border-foreground bg-surface px-3 py-1.5 text-[10px] uppercase tracking-widest sm:flex">
            <Hash className="size-3.5 text-accent" strokeWidth={3} />
            <span className="font-bold truncate max-w-[24ch]">{exam.name}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-8 sm:py-10 space-y-10">
        {/* Identificação da matéria */}
        <section className="border-4 border-foreground bg-surface p-5 sm:p-6 shadow-[8px_8px_0_0_#000]">
          <p className="text-[11px] uppercase tracking-widest text-muted">
            &gt; MATERIA_ATIVA
          </p>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="font-sans text-2xl sm:text-3xl font-black leading-tight">
              {subjectRow.name}
            </h1>
            <span className="border-[3px] border-foreground bg-accent px-3 py-1 text-sm font-black text-accent-fg tabular-nums">
              {weightPct}
            </span>
          </div>
          <p className="mt-2 text-[11px] uppercase tracking-widest text-muted">
            {topicRows.length.toString().padStart(2, "0")} tópicos extraídos do
            edital
          </p>
        </section>

        {/* Mural de post-its */}
        <section>
          <SectionTitle index="01" label="Mural // dicas da ia" />
          <PostItWall
            examSubjectId={subjectRow.id}
            initialSaved={savedRows}
          />
        </section>

        {/* Tópicos com link pra quiz */}
        <section>
          <SectionTitle
            index="02"
            label={`Tópicos // ${topicRows.length
              .toString()
              .padStart(2, "0")}`}
          />
          <div className="mb-4 flex items-start gap-3 border-[3px] border-foreground bg-background px-4 py-3 text-[11px] uppercase tracking-widest text-muted">
            <BookOpen className="size-4 shrink-0" strokeWidth={3} />
            <span className="font-sans normal-case leading-relaxed">
              Escolha um tópico pra iniciar uma sessão de questões. A IA gera
              cada questão sob medida, considerando seus erros recentes.
            </span>
          </div>
          <TopicList subjectId={subjectRow.id} topics={topicRows} />
        </section>
      </main>
    </div>
  );
}

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
