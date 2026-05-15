import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "Você é um examinador da banca Instituto Nosso Rumo. Gere UMA questão inédita de múltipla escolha (5 alternativas) sobre o tópico solicitado, em nível de Ensino Médio. Retorne ESTRITAMENTE um objeto JSON contendo: question_text, options (array de 5 strings), correct_answer (index de 0 a 4) e explanation.";

const MODEL = "claude-sonnet-4-6";
const MAX_HISTORY_ITEMS = 10;

type ErrorHistoryItem = {
  question_text: string;
  user_choice: number;
  correct_answer: number;
};

type RequestBody = {
  topicId: string;
  errorHistory?: ErrorHistoryItem[];
};

type GeneratedQuestion = {
  question_text: string;
  options: [string, string, string, string, string];
  correct_answer: 0 | 1 | 2 | 3 | 4;
  explanation: string;
};

function isErrorHistoryItem(value: unknown): value is ErrorHistoryItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.question_text === "string" &&
    typeof v.user_choice === "number" &&
    typeof v.correct_answer === "number"
  );
}

function parseRequestBody(value: unknown): RequestBody | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.topicId !== "string" || v.topicId.trim().length === 0) {
    return null;
  }
  const history =
    Array.isArray(v.errorHistory) && v.errorHistory.every(isErrorHistoryItem)
      ? (v.errorHistory as ErrorHistoryItem[])
      : undefined;
  return { topicId: v.topicId.trim(), errorHistory: history };
}

function isGeneratedQuestion(value: unknown): value is GeneratedQuestion {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.question_text === "string" &&
    v.question_text.trim().length > 0 &&
    Array.isArray(v.options) &&
    v.options.length === 5 &&
    v.options.every((o) => typeof o === "string" && o.trim().length > 0) &&
    typeof v.correct_answer === "number" &&
    Number.isInteger(v.correct_answer) &&
    v.correct_answer >= 0 &&
    v.correct_answer <= 4 &&
    typeof v.explanation === "string"
  );
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function buildUserMessage(
  topicId: string,
  errorHistory: ErrorHistoryItem[] | undefined
): string {
  const lines = [`TÓPICO_ID: ${topicId}`];

  if (errorHistory && errorHistory.length > 0) {
    lines.push("", "HISTÓRICO DE ERROS DO USUÁRIO (recentes):");
    errorHistory.slice(-MAX_HISTORY_ITEMS).forEach((e, i) => {
      lines.push(
        `${i + 1}. "${e.question_text}" — escolheu índice ${e.user_choice}, correto ${e.correct_answer}`
      );
    });
    lines.push(
      "",
      "Foque em conceitos onde o usuário tem demonstrado dificuldade, sem repetir literalmente as questões acima."
    );
  } else {
    lines.push("", "Sem histórico de erros. Gere questão de dificuldade média.");
  }

  return lines.join("\n");
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const body = parseRequestBody(raw);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid payload: topicId is required (string)" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-anthropic-api-key-here") {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const userMessage = buildUserMessage(body.topicId, body.errorHistory);

  let generated: GeneratedQuestion;
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Anthropic response contained no text block");
    }

    const parsed = extractJsonObject(textBlock.text);
    if (!isGeneratedQuestion(parsed)) {
      throw new Error("Generated payload does not match expected schema");
    }
    generated = parsed;
  } catch (err) {
    const details = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate question", details },
      { status: 502 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("questions")
      .insert({
        topic_id: body.topicId,
        question_text: generated.question_text,
        options: generated.options,
        correct_answer: generated.correct_answer,
        explanation: generated.explanation,
        generated_by: "anthropic",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to save question",
          details: error.message,
          generated,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ question: data }, { status: 201 });
  } catch (err) {
    const details = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to save question", details, generated },
      { status: 500 }
    );
  }
}
