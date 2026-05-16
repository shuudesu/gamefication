import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";
import { finalizeCargoSelection } from "@/lib/exam-finalizer";
import type { CargoBlueprint, ExamRow, IntakeFinalized } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type RequestBody = {
  examId?: string;
  cargoIndex?: number;
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Espera JSON { examId, cargoIndex }" },
      { status: 400 }
    );
  }

  const examId = typeof body.examId === "string" ? body.examId.trim() : "";
  const cargoIndex =
    typeof body.cargoIndex === "number" && Number.isInteger(body.cargoIndex)
      ? body.cargoIndex
      : -1;

  if (!examId || cargoIndex < 0) {
    return NextResponse.json(
      { error: "examId e cargoIndex (inteiro >= 0) são obrigatórios" },
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

  const { data: exam, error: examErr } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (examErr || !exam) {
    return NextResponse.json(
      { error: "Edital não encontrado" },
      { status: 404 }
    );
  }

  const metadata = exam.source_metadata as
    | { blueprint?: { cargos?: CargoBlueprint[] } }
    | null;
  const cargos = metadata?.blueprint?.cargos ?? [];

  if (cargos.length === 0) {
    return NextResponse.json(
      { error: "Blueprint sem cargos disponível para este edital" },
      { status: 409 }
    );
  }

  if (cargoIndex >= cargos.length) {
    return NextResponse.json(
      { error: `cargoIndex fora de range (max: ${cargos.length - 1})` },
      { status: 400 }
    );
  }

  const selected = cargos[cargoIndex];

  try {
    const finalized = await finalizeCargoSelection(
      supabase,
      exam as ExamRow,
      selected
    );

    const response: IntakeFinalized = {
      status: "finalized",
      exam: finalized.exam,
      subjects: finalized.subjects,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    const details = err instanceof Error ? err.message : "Erro ao finalizar";
    return NextResponse.json(
      { error: "Falha ao salvar cargo escolhido", details },
      { status: 500 }
    );
  }
}
