import { Hash, User } from "lucide-react";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { fetchUserProfile } from "@/lib/active-exam";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await fetchUserProfile();
  const displayName = profile?.display_name ?? "OPERADOR";
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="border-b-4 border-foreground bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center border-[3px] border-foreground bg-accent text-accent-fg">
              <Hash className="size-5" strokeWidth={4} />
            </div>
            <div>
              <p className="text-base font-black uppercase tracking-widest leading-none">
                GAMEFICATION
              </p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted">
                concurso.os v0.1 / setup
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border-[3px] border-foreground bg-surface px-3 py-1.5 text-[11px] uppercase tracking-widest">
              <User className="size-4" strokeWidth={3} />
              <span className="font-bold truncate max-w-[10ch] sm:max-w-[16ch]">
                {displayName}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-10">
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-widest text-muted">
            &gt; INIT_SISTEMA
          </p>
          <h1 className="mt-2 font-sans text-2xl sm:text-3xl font-black leading-tight">
            Vamos configurar o sistema para o seu concurso.
          </h1>
          <p className="mt-3 font-sans text-sm text-muted leading-relaxed">
            Tudo o que vier depois — matérias, tópicos, questão do dia,
            cronograma — sai do edital que você enviar aqui.
          </p>
        </div>

        <OnboardingWizard />
      </main>

      <footer className="border-t-4 border-foreground bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 sm:px-6 py-4 text-[10px] uppercase tracking-[0.25em] text-muted">
          <span>&gt;_ aguardando edital</span>
          <span>build_2026.05.15</span>
        </div>
      </footer>
    </div>
  );
}
