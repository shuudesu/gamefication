import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";
import { extractBlueprint } from "@/lib/edital-extractor";
import { extractPdfText, fetchUrlAsSource } from "@/lib/source-fetcher";
import { finalizeCargoSelection } from "@/lib/exam-finalizer";
import type {
  CargoBlueprint,
  ExamBlueprint,
  ExamRow,
  IntakeResponse,
} from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const PDF_PLACEHOLDER_KEY = "your-anthropic-api-key-here";
const STORAGE_BUCKET = "editais";

type RequestBody = {
  pdfPath?: string;
  url?: string;
};

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

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Espera JSON body com { pdfPath?, url? }" },
      { status: 400 }
    );
  }

  const pdfPath =
    typeof body.pdfPath === "string" && body.pdfPath.trim().length > 0
      ? body.pdfPath.trim()
      : null;
  const url =
    typeof body.url === "string" && body.url.trim().length > 0
      ? body.url.trim()
      : null;

  if (!pdfPath && !url) {
    return NextResponse.json(
      { error: "Forneça ao menos um: pdfPath (Storage) ou url" },
      { status: 400 }
    );
  }

  if (pdfPath && !pdfPath.startsWith(`${user.id}/`)) {
    return NextResponse.json(
      { error: "pdfPath fora da pasta do usuário" },
      { status: 403 }
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
  let storedPdfPath: string | null = null;

  if (pdfPath) {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(pdfPath);
      if (error || !data) {
        throw new Error(error?.message ?? "Arquivo não encontrado no Storage");
      }
      const buffer = Buffer.from(await data.arrayBuffer());
      const pdfText = await extractPdfText(buffer);
      sources.push(pdfText);
      storedPdfPath = pdfPath;
    } catch (err) {
      const details = err instanceof Error ? err.message : "Erro no PDF";
      return NextResponse.json(
        { error: "Falha ao processar PDF do Storage", details },
        { status: 400 }
      );
    }
  }

  if (url) {
    try {
      const fetched = await fetchUrlAsSource(url);
      sources.push(fetched.text);
      if (!storedPdfPath && fetched.pdfBuffer) {
        const filename = inferFilenameFromUrl(url);
        storedPdfPath = await uploadPdf(
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

  const isSingleCargo = blueprint.cargos.length === 1;
  const initialStatus = isSingleCargo ? "ready" : "awaiting_cargo";
  const initialIsActive = isSingleCargo;
  const firstCargo: CargoBlueprint | undefined = blueprint.cargos[0];

  try {
    if (isSingleCargo) {
      await supabase
        .from("exams")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("is_active", true);
    }

    const { data: examRow, error: examErr } = await supabase
      .from("exams")
      .insert({
        user_id: user.id,
        name: blueprint.name,
        banca: blueprint.banca,
        cargo: isSingleCargo ? firstCargo?.name : null,
        exam_date: blueprint.exam_date,
        vacancies: isSingleCargo ? firstCargo?.vagas : null,
        edital_pdf_path: storedPdfPath,
        edital_url: url,
        source_metadata: {
          had_pdf: Boolean(pdfPath),
          had_url: Boolean(url),
          chars: combined.length,
          blueprint,
        },
        processing_status: initialStatus,
        is_active: initialIsActive,
      })
      .select()
      .single();

    if (examErr || !examRow) {
      throw new Error(examErr?.message ?? "Insert de exam falhou");
    }

    if (isSingleCargo && firstCargo) {
      const finalized = await finalizeCargoSelection(
        supabase,
        examRow as ExamRow,
        firstCargo
      );
      const response: IntakeResponse = {
        status: "finalized",
        exam: finalized.exam,
        subjects: finalized.subjects,
      };
      return NextResponse.json(response, { status: 201 });
    }

    const response: IntakeResponse = {
      status: "awaiting_cargo",
      exam: examRow as ExamRow,
      cargos: blueprint.cargos,
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
