import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ExamBlueprint } from "@/types";

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `Você é um analista especialista em editais de concursos públicos brasileiros. Receberá o texto bruto de um edital (ou de uma página com informações do concurso). Sua tarefa: extrair de forma estruturada os metadados do concurso, suas matérias e tópicos do conteúdo programático.

Regras:
- Se um campo não estiver presente, use null (não invente).
- weight é a participação relativa da matéria em [0, 1]; some todos os weights ~= 1. Se o edital não informar pesos, distribua uniformemente.
- priority dos tópicos: high para os explicitamente destacados ou com maior peso; medium é o default; low para acessórios.
- estimated_hours é um palpite de horas de estudo necessárias (5-40 por tópico).
- Não inclua disciplinas fora do conteúdo programático.
- Datas em ISO YYYY-MM-DD.
- Sempre chame a tool extract_exam_blueprint exatamente uma vez.`;

const TOOL: Tool = {
  name: "extract_exam_blueprint",
  description:
    "Salva a estrutura do edital extraído. Chamar exatamente uma vez por requisição.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Nome do concurso (ex: 'Auditor Fiscal do Estado de SP — 2026').",
      },
      banca: {
        type: ["string", "null"],
        description: "Banca organizadora (FCC, Cebraspe, FGV, etc).",
      },
      cargo: {
        type: ["string", "null"],
        description: "Cargo específico.",
      },
      exam_date: {
        type: ["string", "null"],
        description: "Data da prova em ISO YYYY-MM-DD, ou null.",
      },
      vacancies: {
        type: ["integer", "null"],
        description: "Total de vagas, ou null.",
      },
      subjects: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            weight: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Peso relativo em [0, 1].",
            },
            icon_key: {
              type: ["string", "null"],
              enum: ["scale", "shield", "book", "brain", "cpu", "newspaper", null],
              description: "Ícone sugerido (lucide).",
            },
            topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  estimated_hours: { type: ["number", "null"] },
                },
                required: ["name", "priority"],
              },
            },
          },
          required: ["name", "weight", "topics"],
        },
      },
    },
    required: ["name", "subjects"],
  },
};

const MAX_INPUT_CHARS = 150_000;

export async function extractBlueprint(
  rawText: string,
  apiKey: string
): Promise<ExamBlueprint> {
  const trimmed =
    rawText.length > MAX_INPUT_CHARS
      ? rawText.slice(0, MAX_INPUT_CHARS) +
        "\n\n[... texto truncado por limite de tamanho ...]"
      : rawText;

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [TOOL],
    tool_choice: { type: "tool", name: TOOL.name },
    messages: [
      {
        role: "user",
        content: `TEXTO DO EDITAL / FONTE:\n\n${trimmed}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Modelo não retornou tool_use");
  }
  if (toolUse.name !== TOOL.name) {
    throw new Error(`Ferramenta inesperada: ${toolUse.name}`);
  }

  const input = toolUse.input as Record<string, unknown>;
  if (!isValidBlueprint(input)) {
    throw new Error("Payload do tool_use não bate com schema esperado");
  }

  return normalizeBlueprint(input);
}

function isValidBlueprint(v: unknown): v is ExamBlueprint {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.name !== "string" || o.name.trim().length === 0) return false;
  if (!Array.isArray(o.subjects) || o.subjects.length === 0) return false;
  return o.subjects.every((s) => {
    if (!s || typeof s !== "object") return false;
    const sub = s as Record<string, unknown>;
    return (
      typeof sub.name === "string" &&
      typeof sub.weight === "number" &&
      Array.isArray(sub.topics)
    );
  });
}

function normalizeBlueprint(v: ExamBlueprint): ExamBlueprint {
  const totalWeight = v.subjects.reduce((acc, s) => acc + (s.weight || 0), 0);
  const subjects =
    totalWeight > 0
      ? v.subjects.map((s) => ({ ...s, weight: s.weight / totalWeight }))
      : v.subjects.map((s) => ({ ...s, weight: 1 / v.subjects.length }));

  return {
    name: v.name.trim(),
    banca: v.banca ?? null,
    cargo: v.cargo ?? null,
    exam_date: v.exam_date ?? null,
    vacancies: v.vacancies ?? null,
    subjects: subjects.map((s) => ({
      name: s.name.trim(),
      weight: Number(s.weight.toFixed(4)),
      icon_key: s.icon_key ?? null,
      topics: (s.topics ?? []).map((t) => ({
        name: t.name.trim(),
        priority: t.priority ?? "medium",
        estimated_hours: t.estimated_hours ?? null,
      })),
    })),
  };
}
