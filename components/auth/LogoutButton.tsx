"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      aria-label="Sair"
      title="Sair"
      className="flex items-center gap-2 border-[3px] border-foreground bg-surface px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors hover:bg-terminal-red hover:text-accent-fg disabled:cursor-wait disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" strokeWidth={3} />
      ) : (
        <LogOut className="size-4" strokeWidth={3} />
      )}
      <span className="font-bold hidden sm:inline">SAIR</span>
    </button>
  );
}
