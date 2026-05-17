import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

type RequestBody = { postItId: string };

function parseBody(value: unknown): RequestBody | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.postItId !== "string" || v.postItId.trim().length === 0) {
    return null;
  }
  return { postItId: v.postItId.trim() };
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
      { error: "postItId é obrigatório" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_its")
    .update({ is_saved: true })
    .eq("id", body.postItId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Post-it não encontrado ou sem acesso", details: error?.message },
      { status: 404 }
    );
  }

  return NextResponse.json({ postIt: data }, { status: 200 });
}
