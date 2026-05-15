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
