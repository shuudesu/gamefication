import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser, createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "claude-haiku-4-5-20251001";

const POST_IT_KINDS = ["tip", "mnemonic", "concept", "pitfall", "strategy"] as const;
type PostItKind = (typeof POST_IT_KINDS)[number];

const SYSTEM_PROMPT = `Você é um tutor de concurso público brasileiro escrevendo "post-its" curtos pra o aluno revisar.

Cada post-it tem:
- "kind": tipo do conteúdo (tip | mnemonic | concept | pitfall | strategy)
- "content": texto curto e direto, MÁXIMO 280 caracteres (incluindo espaços)

Regras:
- Linguagem direta, segunda pessoa, tom de "anota aí". Sem floreios.
- Conteúdo SEMPRE relacionado à matéria E aos tópicos do edital fornecidos.
- Varie o tipo: ora dica prática, ora mnemônico, ora conceito-chave, ora pegadinha de banca, ora estratégia de prova.
- NUNCA repita conceitos óbvios genéricos tipo "estude todos os dias". Seja específico ao conteúdo.
- Português brasileiro.
- Retorne ESTRITAMENTE um JSON: { "kind": "...", "content": "..." }`;

type RequestBody = {
  examSubjectId: string;
};

function parseBody(value: unknown): RequestBody | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.examSubjectId !== "string" || v.examSubjectId.trim().length === 0) {
    return null;
  }
  return { examSubjectId: v.examSubjectId.trim() };
}

type GeneratedPostIt = { kind: PostItKind; content: string };

function isGeneratedPostIt(value: unknown): value is GeneratedPostIt {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.kind === "string" &&
    (POST_IT_KINDS as readonly string[]).includes(v.kind) &&
    typeof v.content === "string" &&
    v.content.trim().length > 0 &&
    v.content.length <= 320
  );
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("JSON não encontrado na resposta do modelo");
  }
  return JSON.parse(candidate.slice(start, end + 1));
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
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json(
      { error: "examSubjectId é obrigatório" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-anthropic-api-key-here") {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY não configurada" },
      { status: 500 }
    );
  }

  // Busca a matéria + tópicos pra contextualizar o post-it.
  // RLS garante que o usuário só consiga ler matérias de exames próprios.
  const supabase = await createClient();
  const { data: subject, error: subjErr } = await supabase
    .from("exam_subjects")
    .select("id, name, exam_id")
    .eq("id", body.examSubjectId)
    .maybeSingle();

  if (subjErr || !subject) {
    return NextResponse.json(
      { error: "Matéria não encontrada ou sem acesso" },
      { status: 404 }
    );
  }

  const { data: topics } = await supabase
    .from("exam_topics")
    .select("name, priority")
    .eq("exam_subject_id", subject.id)
    .order("priority", { ascending: true })
    .limit(30);

  // Lista os tópicos pro modelo escolher um pra focar. Variação alta vem
  // do próprio modelo + temperature implícito do Haiku.
  const topicsList = (topics ?? [])
    .map((t) => `- [${t.priority}] ${t.name}`)
    .join("\n");

  const userMessage = [
    `MATÉRIA: ${subject.name}`,
    "",
    "TÓPICOS DO EDITAL:",
    topicsList || "(sem tópicos listados)",
    "",
    "Gere UM post-it curto sobre algum tópico desta matéria. Varie o tipo a cada chamada.",
  ].join("\n");

  let generated: GeneratedPostIt;
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Resposta sem bloco de texto");
    }

    const parsed = extractJson(textBlock.text);
    if (!isGeneratedPostIt(parsed)) {
      throw new Error("Payload não bate com schema esperado");
    }
    generated = parsed;
  } catch (err) {
    const details = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { error: "Falha ao gerar post-it", details },
      { status: 502 }
    );
  }

  // Persiste como efêmero (is_saved=false). O cliente decide se promove
  // pra salvo via /api/post-its/save.
  const { data: row, error: insertErr } = await supabase
    .from("post_its")
    .insert({
      user_id: user.id,
      exam_subject_id: subject.id,
      content: generated.content,
      kind: generated.kind,
      is_saved: false,
    })
    .select()
    .single();

  if (insertErr || !row) {
    return NextResponse.json(
      {
        error: "Falha ao salvar post-it efêmero",
        details: insertErr?.message,
        generated,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ postIt: row }, { status: 201 });
}
