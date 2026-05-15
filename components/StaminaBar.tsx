import { Flame, Zap } from "lucide-react";

type Props = {
  streakDays: number;
  weeklyHits: boolean[];
  goalDays?: number;
};

const DAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];

export function StaminaBar({ streakDays, weeklyHits, goalDays = 30 }: Props) {
  const safeGoal = Math.max(goalDays, 1);
  const pct = Math.min(100, Math.round((streakDays / safeGoal) * 100));

  return (
    <section
      aria-label="Stamina e streak de estudos"
      className="border-4 border-foreground bg-surface p-5 sm:p-6 shadow-[8px_8px_0_0_#000]"
    >
      <header className="flex items-center justify-between border-b-4 border-foreground pb-3 mb-5">
        <div className="flex items-center gap-2">
          <Flame className="size-6 text-accent" strokeWidth={3} />
          <h2 className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold">
            STAMINA // STREAK
          </h2>
        </div>
        <span className="text-[10px] sm:text-xs uppercase tracking-widest text-muted">
          META: {String(safeGoal).padStart(2, "0")}D
        </span>
      </header>

      <div className="flex items-end gap-4">
        <span className="text-6xl sm:text-7xl font-black leading-none text-accent tabular-nums">
          {String(streakDays).padStart(2, "0")}
        </span>
        <span className="pb-2 text-lg uppercase tracking-widest">DIAS</span>
        <Zap
          className="ml-auto size-8 text-accent"
          strokeWidth={3}
          fill="currentColor"
        />
      </div>

      <div className="relative mt-5 h-7 w-full border-[3px] border-foreground bg-background overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-accent"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
        <div
          className="absolute inset-0 flex items-center justify-center text-[11px] font-bold uppercase tracking-widest mix-blend-difference"
          style={{ color: "#fff" }}
        >
          {String(pct).padStart(3, "0")}% &gt; {String(safeGoal).padStart(2, "0")}D
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => {
          const hit = Boolean(weeklyHits[i]);
          return (
            <div
              key={i}
              aria-label={hit ? "Dia estudado" : "Dia não estudado"}
              className={`flex h-11 items-center justify-center border-[3px] text-xs font-bold uppercase ${
                hit
                  ? "border-foreground bg-accent text-accent-fg"
                  : "border-foreground/40 bg-surface-2 text-muted"
              }`}
            >
              {DAY_LABELS[i]}
            </div>
          );
        })}
      </div>
    </section>
  );
}
