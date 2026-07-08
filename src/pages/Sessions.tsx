import { AppShell, PageHeader, Panel } from "@/components/app-shell";

const SESSIONS = [
  { name: "Morning Open Play", date: "Oct 24, 2024", players: 12, matches: 18, status: "live" as const },
  { name: "Advanced Round Robin", date: "Oct 22, 2024", players: 8, matches: 24, status: "done" as const },
  { name: "Weeknight Ladder", date: "Oct 19, 2024", players: 16, matches: 32, status: "done" as const },
  { name: "Beginner Clinic", date: "Oct 17, 2024", players: 10, matches: 12, status: "done" as const },
  { name: "Sunday Doubles", date: "Oct 13, 2024", players: 20, matches: 40, status: "done" as const },
];

export default function SessionsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Sessions"
        title="Court sessions"
        subtitle="Schedule, run, and archive your play sessions."
        action={
          <button className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-zinc-900 ring-1 ring-black/10 shadow-lg shadow-brand/30 transition-transform hover:bg-brand-dark hover:text-white active:scale-[0.97]">
            + New Session
          </button>
        }
      />
      <div className="grid gap-4 sm:gap-6">
        {SESSIONS.map((s) => (
          <Panel key={s.name} className="transition-transform hover:scale-[1.005]">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-dark">
                  <div className="text-center">
                    <p className="text-[9px] font-bold uppercase leading-none">{s.date.split(" ")[0]}</p>
                    <p className="text-lg font-bold leading-none">{s.date.split(" ")[1].replace(",", "")}</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-semibold">{s.name}</h3>
                    {s.status === "live" && (
                      <span className="pulse-dot rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                        Live
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {s.players} players • {s.matches} matches played
                  </p>
                </div>
              </div>
              <div className="hidden shrink-0 items-center gap-6 sm:flex">
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Matches</p>
                  <p className="text-lg font-bold tabular-nums">{s.matches}</p>
                </div>
                <button className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white transition-transform hover:bg-zinc-800 active:scale-[0.97]">
                  Open
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}