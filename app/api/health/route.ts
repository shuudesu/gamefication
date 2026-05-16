import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLACEHOLDERS = new Set([
  "your-anthropic-api-key-here",
  "your-supabase-url-here",
  "your-supabase-anon-key-here",
  "your-supabase-service-role-key-here",
]);

function isReal(value: string | undefined): boolean {
  return Boolean(
    value &&
      value.length > 0 &&
      !PLACEHOLDERS.has(value) &&
      !value.startsWith("your-")
  );
}

export async function GET() {
  const checks: Record<string, boolean> = {
    anthropic_key: isReal(process.env.ANTHROPIC_API_KEY),
    supabase_url: isReal(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_anon_key: isReal(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabase_service_role_key: isReal(process.env.SUPABASE_SERVICE_ROLE_KEY),
    supabase_connection: false,
    editais_bucket: false,
    exams_table: false,
  };

  if (checks.supabase_url && checks.supabase_service_role_key) {
    try {
      const supabase = getSupabaseAdmin();

      const { error: examsErr } = await supabase
        .from("exams")
        .select("id", { count: "exact", head: true })
        .limit(1);
      checks.supabase_connection = !examsErr;
      checks.exams_table = !examsErr;

      const { data: bucket } = await supabase.storage.getBucket("editais");
      checks.editais_bucket = Boolean(bucket);
    } catch {
      // checks já estão como false
    }
  }

  const allOk = Object.values(checks).every(Boolean);
  return NextResponse.json(
    {
      ok: allOk,
      checks,
      hint: allOk
        ? "Tudo pronto. Acesse / para começar o onboarding."
        : "Algumas verificações falharam. Veja DEPLOY.md > Troubleshooting.",
    },
    { status: allOk ? 200 : 503 }
  );
}
