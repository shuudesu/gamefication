import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";
import { extractBlueprint } from "@/lib/edital-extractor";
import { extractPdfText, fetchUrlAsSource } from "@/lib/source-fetcher";
import type {
  ExamBlueprint,
  ExamSubjectRow,
  ExamTopicRow,
  IntakeResponse,
} from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const PDF_PLACEHOLDER_KEY = "your-anthropic-api-key-here";
const STORAGE_BUCKET = "editais";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === PDF_PLACEHOLDER_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Espera multipart/form-data" },
      { status: 400 }
    );
  }

  const pdfField = formData.get("pdf");
  const urlField = formData.get("url");
  const pdf = pdfField instanceof File && pdfField.size > 0 ? pdfField : null;
  const url =
    typeof urlField === "string" && urlField.trim().length > 0
      ? urlField.trim()
      : null;

  if (!pdf && !url) {
    return NextResponse.json(
      { error: "Forneça ao menos um: arquivo PDF ('pdf') ou URL ('url')" },
      { status: 400 }
    );
  }

  if (pdf && pdf.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Arquivo deve ser application/pdf" },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    const details = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Supabase admin not configured", details },
      { status: 500 }
    );
  }

  const sources: string[] = [];
  let pdfStoragePath: string | null = null;

  if (pdf) {
    try {
      const buffer = Buffer.from(await pdf.arrayBuffer());
      const pdfText = await extractPdfText(buffer);
      sources.push(pdfText);
      pdfStoragePath = await uploadPdf(supabase, buffer, pdf.name, user.id);
    } catch (err) {
      const details = err instanceof Error ? err.message : "Erro no PDF";
      return NextResponse.json(
        { error: "Falha ao processar PDF", details },
        { status: 400 }
      );
    }
  }

  if (url) {
    try {
      const fetched = await fetchUrlAsSource(url);
      sources.push(fetched.text);
      if (!pdfStoragePath && fetched.pdfBuffer) {
        const filename = inferFilenameFromUrl(url);
        pdfStoragePath = await uploadPdf(
          supabase,
          fetched.pdfBuffer,
          filename,
          user.id
        );
      }
    } catch (err) {
      const details = err instanceof Error ? err.message : "Erro na URL";
      return NextResponse.json(
        { error: "Falha ao processar URL", details },
        { status: 400 }
      );
    }
  }

  const combined = sources
    .map((s, i) => `===== FONTE ${i + 1} =====\n${s}`)
    .join("\n\n");

  let blueprint: ExamBlueprint;
  try {
    blueprint = await extractBlueprint(combined, apiKey);
  } catch (err) {
    const details = err instanceof Error ? err.message : "Erro na extração";
    return NextResponse.json(
      { error: "Falha ao extrair estrutura via IA", details },
      { status: 502 }
    );
  }

  try {
    await supabase
      .from("exams")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);

    const { data: examRow, error: examErr } = await supabase
      .from("exams")
      .insert({
        user_id: user.id,
        name: blueprint.name,
        banca: blueprint.banca,
        cargo: blueprint.cargo,
        exam_date: blueprint.exam_date,
        vacancies: blueprint.vacancies,
        edital_pdf_path: pdfStoragePath,
        edital_url: url,
        source_metadata: {
          had_pdf: Boolean(pdf),
          had_url: Boolean(url),
          chars: combined.length,
        },
        processing_status: "ready",
        is_active: true,
      })
      .select()
      .single();

    if (examErr || !examRow) {
      throw new Error(examErr?.message ?? "Insert de exam falhou");
    }

    const subjectRows: ExamSubjectRow[] = [];
    const topicRows: ExamTopicRow[] = [];

    for (let i = 0; i < blueprint.subjects.length; i++) {
      const s = blueprint.subjects[i];
      const { data: subjectRow, error: subjErr } = await supabase
        .from("exam_subjects")
        .insert({
          exam_id: examRow.id,
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

    const response: IntakeResponse = {
      exam: examRow,
      subjects: subjectRows.map((s) => ({
        ...s,
        topics: topicRows.filter((t) => t.exam_subject_id === s.id),
      })),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    const details = err instanceof Error ? err.message : "Erro ao persistir";
    return NextResponse.json(
      { error: "Falha ao salvar edital", details, blueprint },
      { status: 500 }
    );
  }
}

async function uploadPdf(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  buffer: Buffer,
  filename: string,
  userId: string
): Promise<string> {
  const safe = filename.replace(/[^\w.\-]/g, "_").slice(0, 80) || "edital.pdf";
  const path = `${userId}/${Date.now()}_${safe}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (error) {
    throw new Error(`Upload do PDF falhou: ${error.message}`);
  }
  return path;
}

function inferFilenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() ?? "edital.pdf";
    return last.endsWith(".pdf") ? last : `${last}.pdf`;
  } catch {
    return "edital.pdf";
  }
}
