import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "claude-haiku-4-5-20251001";
const MAX_HISTORY_ITEMS = 10;

const SYSTEM_PROMPT = `Você é um examinador de banca de concurso público brasileiro. Gere UMA questão inédita de múltipla escolha (5 alternativas) sobre o tópico solicitado, em nível compatível com o cargo do concurso.

Regras:
- Linguagem do português brasileiro formal de banca (Cebraspe, FCC, FGV, Vunesp, Instituto Nosso Rumo).
- Enunciado claro, sem ambiguidade. Pode usar texto de apoio se o tópico exigir.
- 5 alternativas plausíveis, apenas UMA correta. Distratores devem ser próximos da verdade pra forçar análise (não opções absurdas).
- Explanation: justificativa curta (2-4 frases) explicando POR QUE a correta é correta E descartando 1-2 distratores mais óbvios.
- Se o usuário tem histórico de erros, foque em conceitos onde demonstrou dificuldade SEM repetir literalmente as questões anteriores.

POSIÇÃO DA RESPOSTA CORRETA — CRÍTICO:
- "correct_answer" é o ÍNDICE da alternativa correta no array "options" (0=primeira, 1=segunda, 2=terceira, 3=quarta, 4=quinta).
- VARIE a posição da resposta correta entre 0, 1, 2, 3 e 4. NÃO use sempre 1 (B). Distribua aleatoriamente entre todos os índices.
- Antes de finalizar a resposta, escolha conscientemente uma posição aleatória pra correct_answer (use o último dígito do timestamp atual como referência se ajudar).

FORMATO DE RESPOSTA:
Retorne ESTRITAMENTE um objeto JSON com este shape:
{
  "question_text": "enunciado da questão",
  "options": ["texto da opção 1", "texto da opção 2", "texto da opção 3", "texto da opção 4", "texto da opção 5"],
  "correct_answer": <índice 0-4 da opção correta>,
  "explanation": "justificativa"
}

ATENÇÃO: "options" deve conter o TEXTO REAL de cada alternativa, NÃO as letras A/B/C/D/E. As letras são apenas apresentação visual — você só preenche o conteúdo.`;

type ErrorHistoryItem = {
  question_text: string;
  user_choice: number;
  correct_answer: number;
};

type RequestBody = {
  topicId: string;
  topicName?: string;
  subjectName?: string;
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
  return {
    topicId: v.topicId.trim(),
    topicName:
      typeof v.topicName === "string" && v.topicName.trim().length > 0
        ? v.topicName.trim()
        : undefined,
    subjectName:
      typeof v.subjectName === "string" && v.subjectName.trim().length > 0
        ? v.subjectName.trim()
        : undefined,
    errorHistory: history,
  };
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

/**
 * Embaralha as 5 opções e atualiza correct_answer pro novo índice.
 *
 * LLMs (incluindo Claude) têm viés conhecido pra colocar a resposta
 * correta no índice 1 (B). Isso é matematicamente quebrado pra um
 * quiz: o usuário decora "chuto B" e ganha 100%. Shuffling server-side
 * força distribuição uniforme independente do que o modelo emite.
 *
 * Fisher-Yates com Math.random() — pra quiz isso é suficiente
 * (não precisa de crypto-strong randomness).
 */
function shuffleOptions(q: GeneratedQuestion): GeneratedQuestion {
  const indices = [0, 1, 2, 3, 4];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const newOptions = indices.map((oldIdx) => q.options[oldIdx]) as [
    string,
    string,
    string,
    string,
    string,
  ];
  const newCorrectIndex = indices.indexOf(q.correct_answer) as 0 | 1 | 2 | 3 | 4;
  return {
    ...q,
    options: newOptions,
    correct_answer: newCorrectIndex,
  };
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

function buildUserMessage(body: RequestBody): string {
  const lines: string[] = [];
  if (body.subjectName) {
    lines.push(`MATÉRIA: ${body.subjectName}`);
  }
  if (body.topicName) {
    lines.push(`TÓPICO: ${body.topicName}`);
  } else {
    // Fallback: passar o id é inútil pra Claude, mas mantém compat
    // com chamadas antigas que ainda não foram migradas.
    lines.push(`TÓPICO_ID: ${body.topicId}`);
  }

  if (body.errorHistory && body.errorHistory.length > 0) {
    lines.push("", "HISTÓRICO DE ERROS DO USUÁRIO (recentes):");
    body.errorHistory.slice(-MAX_HISTORY_ITEMS).forEach((e, i) => {
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
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = parseRequestBody(raw);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid payload: topicId é obrigatório (string)" },
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

  const userMessage = buildUserMessage(body);

  let generated: GeneratedQuestion;
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
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
    // Embaralha SEMPRE — mesmo se o modelo cooperar e variar a posição,
    // shuffle a mais não muda a corretude (a explicação se refere ao
    // texto da opção, não ao índice). Custo: ~zero.
    generated = shuffleOptions(parsed);
  } catch (err) {
    const details = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate question", details },
      { status: 502 }
    );
  }

  // Persiste a questão pra reaproveitamento futuro. Continua usando o
  // service-role admin client porque a tabela `questions` tem coluna
  // `topic_id text` (sem FK direta pra exam_topics, schema legado).
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
