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

export type OptionId = "A" | "B" | "C" | "D";

export type QuestionOption = {
  id: OptionId;
  text: string;
};

export type Question = {
  id: string;
  subjectCode: string;
  statement: string;
  options: QuestionOption[];
  correctOptionId: OptionId;
  explanation?: string;
};
