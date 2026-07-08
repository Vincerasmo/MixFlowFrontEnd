import { AppShell, PageHeader, Panel } from "@/components/app-shell";

const LIVE = [
  { court: "Court 01", a: ["Miller", "Ross"], b: ["Chen", "Davis"], scoreA: 11, scoreB: 8, tag: "Game Point" },
  { court: "Court 02", a: ["Nguyen", "Patel"], b: ["Wong", "Rivera"], scoreA: 7, scoreB: 9 },
  { court: "Court 03", a: ["Jenkins", "Thorne"], b: ["Rodriguez", "Kim"], scoreA: 4, scoreB: 5 },
];

const COMPLETED = [
  { a: "Miller / Ross", b: "Jenkins / Thorne", score: "11-9" },
  { a: "Chen / Davis", b: "Nguyen / Patel", score: "11-6" },
  { a: "Rodriguez / Kim", b: "Wong / Rivera", score: "11-4" },
];

export default function MatchesPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Live scoreboard"
        title="Matches"
        subtitle="3 courts in play, 27 matches recorded today."
        action={
          <button className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-zinc-900 ring-1 ring-black/10 shadow-lg shadow-brand/30 transition-transform hover:bg-brand-dark hover:text-white active:scale-[0.97]">
            + Record Result
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 sm:gap-6">
        {LIVE.map((m) => (
          <div
            key={m.court}
            className="court-lines relative overflow-hidden rounded-[20px] bg-gradient-to-br from-court to-brand-dark p-5 text-white ring-1 ring-black/10 sm:p-6"
          >
            <div className="relative">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">{m.court}</p>
                <span className="pulse-dot flex items-center gap-1.5 rounded-full bg-red-500/90 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
                  Live
                </span>
              </div>
              <div className="space-y-3">
                <TeamScore names={m.a} score={m.scoreA} leading={m.scoreA > m.scoreB} />
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-white/60">
                  <div className="h-px flex-1 bg-white/20" />
                  vs
                  <div className="h-px flex-1 bg-white/20" />
                </div>
                <TeamScore names={m.b} score={m.scoreB} leading={m.scoreB > m.scoreA} />
              </div>
              {m.tag && (
                <div className="mt-6 rounded-full bg-ball px-3 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-900">
                  ★ {m.tag}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Panel>
          <h2 className="mb-4 text-sm font-semibold">Recent results</h2>
          <div className="divide-y divide-zinc-100">
            {COMPLETED.map((m, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-3">
                <p className="truncate text-right text-sm font-semibold">{m.a}</p>
                <span className="shrink-0 rounded-lg bg-brand-soft px-3 py-1 text-sm font-bold tabular-nums text-brand-dark">
                  {m.score}
                </span>
                <p className="truncate text-sm font-semibold text-zinc-500">{m.b}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function TeamScore({ names, score, leading }: { names: string[]; score: number; leading: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <p className="truncate text-base font-bold">{names.join(" / ")}</p>
      <span
        className={`shrink-0 text-3xl font-bold tabular-nums ${
          leading ? "text-ball" : "text-white/80"
        }`}
      >
        {String(score).padStart(2, "0")}
      </span>
    </div>
  );
}