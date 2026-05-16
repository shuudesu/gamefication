import { getSupabaseAdmin } from "./supabase-admin";
import type {
  CargoBlueprint,
  ExamRow,
  ExamSubjectRow,
  ExamTopicRow,
} from "@/types";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type FinalizedExam = {
  exam: ExamRow;
  subjects: Array<ExamSubjectRow & { topics: ExamTopicRow[] }>;
};

export async function finalizeCargoSelection(
  supabase: AdminClient,
  exam: ExamRow,
  cargo: CargoBlueprint
): Promise<FinalizedExam> {
  await supabase
    .from("exams")
    .update({ is_active: false })
    .eq("user_id", exam.user_id ?? "")
    .eq("is_active", true)
    .neq("id", exam.id);

  const { data: updatedExam, error: updateErr } = await supabase
    .from("exams")
    .update({
      cargo: cargo.name,
      vacancies: cargo.vagas,
      processing_status: "ready",
      is_active: true,
    })
    .eq("id", exam.id)
    .select()
    .single();

  if (updateErr || !updatedExam) {
    throw new Error(updateErr?.message ?? "Update do exam falhou");
  }

  const subjectRows: ExamSubjectRow[] = [];
  const topicRows: ExamTopicRow[] = [];

  for (let i = 0; i < cargo.subjects.length; i++) {
    const s = cargo.subjects[i];
    const { data: subjectRow, error: subjErr } = await supabase
      .from("exam_subjects")
      .insert({
        exam_id: exam.id,
        name: s.name,
        weight: s.weight,
        order_index: i,
        icon_key: s.icon_key ?? null,
      })
      .select()
      .single();

    if (subjErr || !subjectRow) {
      throw new Error(subjErr?.message ?? "Insert de subject falhou");
    }
    subjectRows.push(subjectRow as ExamSubjectRow);

    const topicsPayload = s.topics.map((t, j) => ({
      exam_subject_id: subjectRow.id,
      name: t.name,
      priority: t.priority,
      estimated_hours: t.estimated_hours ?? null,
      order_index: j,
    }));

    if (topicsPayload.length > 0) {
      const { data: topicsData, error: topicsErr } = await supabase
        .from("exam_topics")
        .insert(topicsPayload)
        .select();

      if (topicsErr) {
        throw new Error(topicsErr.message);
      }
      topicRows.push(...((topicsData ?? []) as ExamTopicRow[]));
    }
  }

  return {
    exam: updatedExam as ExamRow,
    subjects: subjectRows.map((s) => ({
      ...s,
      topics: topicRows.filter((t) => t.exam_subject_id === s.id),
    })),
  };
}
