import { getSupabaseAdmin } from "./supabase-admin";
import type {
  ExamRow,
  ExamSubjectRow,
  ExamTopicRow,
  SubjectIconKey,
} from "@/types";

const VALID_ICONS: SubjectIconKey[] = [
  "scale",
  "shield",
  "book",
  "brain",
  "cpu",
  "newspaper",
];

export type ActiveExamData = {
  exam: ExamRow;
  subjects: Array<ExamSubjectRow & { topics: ExamTopicRow[] }>;
};

export async function fetchActiveExam(): Promise<ActiveExamData | null> {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return null;
  }

  const { data: exam, error: examErr } = await supabase
    .from("exams")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (examErr || !exam) return null;

  const { data: subjects, error: subjErr } = await supabase
    .from("exam_subjects")
    .select("*")
    .eq("exam_id", exam.id)
    .order("order_index", { ascending: true });

  if (subjErr || !subjects) return { exam: exam as ExamRow, subjects: [] };

  const subjectIds = subjects.map((s) => s.id);
  const { data: topics } =
    subjectIds.length > 0
      ? await supabase
          .from("exam_topics")
          .select("*")
          .in("exam_subject_id", subjectIds)
          .order("order_index", { ascending: true })
      : { data: [] };

  const topicsBySubject = new Map<string, ExamTopicRow[]>();
  for (const t of (topics ?? []) as ExamTopicRow[]) {
    const arr = topicsBySubject.get(t.exam_subject_id) ?? [];
    arr.push(t);
    topicsBySubject.set(t.exam_subject_id, arr);
  }

  return {
    exam: exam as ExamRow,
    subjects: (subjects as ExamSubjectRow[]).map((s) => ({
      ...s,
      topics: topicsBySubject.get(s.id) ?? [],
    })),
  };
}

export function normalizeIconKey(value: string | null): SubjectIconKey {
  if (value && (VALID_ICONS as string[]).includes(value)) {
    return value as SubjectIconKey;
  }
  return "book";
}

export function deriveSubjectCode(name: string): string {
  return name
    .replace(/[^A-Za-zÀ-ÿ ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 4)
    .padEnd(3, "X");
}

export function daysUntilExam(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso + "T00:00:00").getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}
