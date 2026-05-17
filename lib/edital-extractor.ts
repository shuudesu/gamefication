import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { CargoBlueprint, ExamBlueprint } from "@/types";

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `Você é um analista especialista em editais de concursos públicos brasileiros. Receberá o texto bruto de um edital (ou de uma página com informações do concurso).

Tarefa: extrair de forma estruturada os metadados do concurso, TODOS OS CARGOS oferecidos no edital, e para cada cargo seu conteúdo programático específico (matérias e tópicos).

Regras críticas:
- Editais costumam ter VÁRIOS CARGOS distintos (ex: Auditor, Analista, Técnico, Médico, Professor). Identifique TODOS os cargos individualmente.
- Cada cargo tem seu PRÓPRIO conteúdo programático. NÃO misture matérias entre cargos.
- Se o edital tem "conteúdo comum a todos os cargos" + "conteúdo específico do cargo", combine os dois ao listar as matérias de cada cargo.
- weight: participação relativa da matéria em [0, 1]; some todos os weights ~= 1 por cargo. Se não houver pesos explícitos, distribua uniformemente.
- priority dos tópicos: 'high' para destacados/maior peso; 'medium' é o default; 'low' para acessórios.
- estimated_hours: palpite de horas de estudo necessárias (5-40 por tópico).
- vagas: número de vagas do cargo específico (não o total do edital).
- salary: salário do cargo se informado (string, ex: "R$ 9.500,00").
- requirements: resumo curto (1 frase) dos requisitos de formação/escolaridade do cargo.
- Não inclua disciplinas fora do conteúdo programático.
- Datas em ISO YYYY-MM-DD.
- Sempre chame a tool extract_exam_blueprint exatamente uma vez.`;

const TOOL: Tool = {
  name: "extract_exam_blueprint",
  description:
    "Salva a estrutura do edital extraído com todos os cargos. Chamar exatamente uma vez por requisição.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "Nome do concurso/edital (ex: 'Prefeitura de Suzano — Edital 01/2026').",
      },
      banca: {
        type: ["string", "null"],
        description: "Banca organizadora (FCC, Cebraspe, FGV, Vunesp, etc).",
      },
      exam_date: {
        type: ["string", "null"],
        description: "Data da prova objetiva em ISO YYYY-MM-DD, ou null.",
      },
      cargos: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Nome do cargo (ex: 'Auditor Fiscal').",
            },
            vagas: {
              type: ["integer", "null"],
              description: "Vagas para esse cargo específico.",
            },
            salary: {
              type: ["string", "null"],
              description:
                "Salário/remuneração do cargo se informado (string, ex: 'R$ 9.500,00').",
            },
            requirements: {
              type: ["string", "null"],
              description:
                "Resumo curto (1 frase) dos requisitos de formação do cargo.",
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
                    enum: [
                      "scale",
                      "shield",
                      "book",
                      "brain",
                      "cpu",
                      "newspaper",
                      null,
                    ],
                    description: "Ícone sugerido (lucide).",
                  },
                  topics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        priority: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                        },
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
      },
    },
    required: ["name", "cargos"],
  },
};

const MAX_INPUT_CHARS = 150_000;

export type BlueprintSource =
  | { type: "text"; value: string; label?: string }
  | { type: "pdf_url"; url: string; label?: string };

export async function extractBlueprint(
  sources: BlueprintSource[],
  apiKey: string
): Promise<ExamBlueprint> {
  if (sources.length === 0) {
    throw new Error("Nenhuma fonte fornecida pra extração");
  }

  const client = new Anthropic({ apiKey });

  // Monta os content blocks: documento PDF vai como bloco "document" com
  // source URL (Anthropic baixa direto, sem onerar nossa function).
  // Texto vai como bloco "text" truncado pra não estourar context window.
  const content: Anthropic.ContentBlockParam[] = [];
  let textBudget = MAX_INPUT_CHARS;

  for (const src of sources) {
    if (src.type === "pdf_url") {
      content.push({
        type: "document",
        source: { type: "url", url: src.url },
        ...(src.label ? { title: src.label } : {}),
      });
    } else {
      const label = src.label ? `[${src.label}]\n` : "";
      const remaining = Math.max(0, textBudget - label.length);
      const slice =
        src.value.length > remaining
          ? src.value.slice(0, remaining) +
            "\n[... texto truncado por limite de tamanho ...]"
          : src.value;
      textBudget = Math.max(0, textBudget - (label.length + slice.length));
      content.push({ type: "text", text: `${label}${slice}` });
    }
  }

  content.push({
    type: "text",
    text: "Extraia a estrutura do edital chamando a tool extract_exam_blueprint exatamente uma vez.",
  });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [TOOL],
    tool_choice: { type: "tool", name: TOOL.name },
    messages: [{ role: "user", content }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Modelo não retornou tool_use");
  }
  if (toolUse.name !== TOOL.name) {
    throw new Error(`Ferramenta inesperada: ${toolUse.name}`);
  }

  const input = toolUse.input as Record<string, unknown>;
  const validation = validateBlueprint(input);
  if (!validation.ok) {
    // Loga o payload completo no Vercel pra postmortem + propaga
    // resumo pro cliente. Sem isso é impossível debugar regressões
    // de schema do modelo.
    console.error("[extractBlueprint] payload inválido:", {
      reason: validation.reason,
      payload: JSON.stringify(input).slice(0, 4000),
    });
    throw new Error(
      `Payload do tool_use não bate com schema esperado (${validation.reason})`
    );
  }

  return normalizeBlueprint(input as unknown as ExamBlueprint);
}

type ValidationResult = { ok: true } | { ok: false; reason: string };

function validateBlueprint(v: unknown): ValidationResult {
  if (!v || typeof v !== "object") return { ok: false, reason: "não é objeto" };
  const o = v as Record<string, unknown>;
  if (typeof o.name !== "string" || o.name.trim().length === 0) {
    return { ok: false, reason: `name ausente ou vazio (got ${typeof o.name})` };
  }
  if (!Array.isArray(o.cargos)) {
    return { ok: false, reason: `cargos não é array (got ${typeof o.cargos})` };
  }
  if (o.cargos.length === 0) {
    return { ok: false, reason: "cargos vazio (length 0)" };
  }
  for (let i = 0; i < o.cargos.length; i++) {
    const c = o.cargos[i];
    if (!c || typeof c !== "object") {
      return { ok: false, reason: `cargo[${i}] não é objeto` };
    }
    const cg = c as Record<string, unknown>;
    if (typeof cg.name !== "string" || cg.name.trim().length === 0) {
      return { ok: false, reason: `cargo[${i}].name ausente ou vazio` };
    }
    if (!Array.isArray(cg.subjects)) {
      return {
        ok: false,
        reason: `cargo[${i}].subjects não é array (got ${typeof cg.subjects})`,
      };
    }
  }
  return { ok: true };
}

function normalizeCargo(c: CargoBlueprint): CargoBlueprint {
  const totalWeight = c.subjects.reduce((acc, s) => acc + (s.weight || 0), 0);
  const subjects =
    totalWeight > 0
      ? c.subjects.map((s) => ({ ...s, weight: s.weight / totalWeight }))
      : c.subjects.map((s) => ({
          ...s,
          weight: 1 / Math.max(c.subjects.length, 1),
        }));

  return {
    name: c.name.trim(),
    vagas: c.vagas ?? null,
    salary: c.salary ?? null,
    requirements: c.requirements ?? null,
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

function normalizeBlueprint(v: ExamBlueprint): ExamBlueprint {
  return {
    name: v.name.trim(),
    banca: v.banca ?? null,
    exam_date: v.exam_date ?? null,
    cargos: v.cargos.map(normalizeCargo),
  };
}
