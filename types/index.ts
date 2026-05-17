export type SubjectIconKey =
  | "scale"
  | "shield"
  | "book"
  | "brain"
  | "cpu"
  | "newspaper";

export type Subject = {
  id: string;
  name: string;
  code: string;
  totalQuestions: number;
  answeredQuestions: number;
  accuracy: number;
  iconKey: SubjectIconKey;
};

export type Question = {
  id: string;
  subjectCode: string;
  statement: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
};

export type ErrorHistoryItem = {
  question_text: string;
  user_choice: number;
  correct_answer: number;
};

export type GeneratedQuestionRow = {
  id?: string;
  topic_id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation?: string | null;
  generated_by?: string;
  created_at?: string;
};

export type TopicPriority = "high" | "medium" | "low";

export type BlueprintTopic = {
  name: string;
  priority: TopicPriority;
  estimated_hours?: number | null;
};

export type BlueprintSubject = {
  name: string;
  weight: number;
  icon_key?: SubjectIconKey | null;
  topics: BlueprintTopic[];
};

export type CargoBlueprint = {
  name: string;
  vagas: number | null;
  salary: string | null;
  requirements: string | null;
  subjects: BlueprintSubject[];
};

export type ExamBlueprint = {
  name: string;
  banca: string | null;
  exam_date: string | null;
  cargos: CargoBlueprint[];
};

export type ExamProcessingStatus =
  | "pending"
  | "extracting"
  | "awaiting_cargo"
  | "ready"
  | "failed";

export type ExamRow = {
  id: string;
  user_id: string | null;
  name: string;
  banca: string | null;
  cargo: string | null;
  exam_date: string | null;
  vacancies: number | null;
  edital_pdf_path: string | null;
  edital_url: string | null;
  source_metadata: Record<string, unknown>;
  processing_status: ExamProcessingStatus;
  processing_error: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ExamSubjectRow = {
  id: string;
  exam_id: string;
  name: string;
  weight: number;
  order_index: number;
  icon_key: SubjectIconKey | null;
  created_at: string;
};

export type ExamTopicRow = {
  id: string;
  exam_subject_id: string;
  name: string;
  priority: TopicPriority;
  estimated_hours: number | null;
  content_raw: string | null;
  order_index: number;
  created_at: string;
};

export type IntakeFinalized = {
  status: "finalized";
  exam: ExamRow;
  subjects: Array<ExamSubjectRow & { topics: ExamTopicRow[] }>;
};

export type IntakeCargoChoice = {
  status: "awaiting_cargo";
  exam: ExamRow;
  cargos: CargoBlueprint[];
};

export type IntakeResponse = IntakeFinalized | IntakeCargoChoice;

export type PostItKind = "tip" | "mnemonic" | "concept" | "pitfall" | "strategy";

export type PostItRow = {
  id: string;
  user_id: string;
  exam_subject_id: string;
  content: string;
  kind: PostItKind;
  is_saved: boolean;
  created_at: string;
};
