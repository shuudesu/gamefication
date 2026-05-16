import { Hash } from "lucide-react";

type Props = {
  subtitle: string;
  children: React.ReactNode;
};

export function AuthShell({ subtitle, children }: Props) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="border-b-4 border-foreground bg-background">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center border-[3px] border-foreground bg-accent text-accent-fg">
              <Hash className="size-5" strokeWidth={4} />
            </div>
            <div>
              <p className="text-base font-black uppercase tracking-widest leading-none">
                GAMEFICATION
              </p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted">
                concurso.os v0.1 / {subtitle}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 sm:px-6 py-10">
        {children}
      </main>

      <footer className="border-t-4 border-foreground bg-background">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 sm:px-6 py-4 text-[10px] uppercase tracking-[0.25em] text-muted">
          <span>&gt;_ aguardando credenciais</span>
          <span>build_2026.05.16</span>
        </div>
      </footer>
    </div>
  );
}
