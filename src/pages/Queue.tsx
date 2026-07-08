import { AppShell, PageHeader, Panel } from "../components/app-shell";

const QUEUE = [
  { name: "Jordan Miller", waited: "2m", rating: 3.9 },
  { name: "Kelly Chen", waited: "2m", rating: 3.8 },
  { name: "Aiden Ross", waited: "5m", rating: 3.5 },
  { name: "Priya Davis", waited: "7m", rating: 3.4 },
  { name: "Tommy Nguyen", waited: "11m", rating: 3.0 },
  { name: "Riley Patel", waited: "14m", rating: 3.2 },
];

const BENCH = [
  { name: "Chris Wong", reason: "Rest" },
  { name: "Maya Rivera", reason: "Injury" },
];

export default function QueuePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Live Queue"
        title="Player Queue"
        subtitle="Auto-mix pairs by skill or drag to reorder."
        action={
          <button className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-ink/20 transition-transform hover:bg-zinc-800 active:scale-[0.97]">
            ✦ Auto-Mix Next Match
          </button>
        }
      />

      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        <Panel className="court-lines relative col-span-12 overflow-hidden bg-gradient-to-r from-brand to-brand-dark text-white lg:col-span-8">
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Next up on Court 2</p>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <TeamBadge names={["Jordan Miller", "Kelly Chen"]} />
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">vs</p>
                <div className="mx-auto mt-1 size-8 rounded-full border-2 border-dashed border-white/40" />
              </div>
              <TeamBadge names={["Aiden Ross", "Priya Davis"]} align="right" />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-brand-dark transition-transform hover:scale-105">
                Start Match
              </button>
              <button className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/25">
                Re-mix
              </button>
            </div>
          </div>
        </Panel>

        <Panel className="col-span-12 lg:col-span-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-dark">Waiting</p>
          <p className="mt-2 text-5xl font-bold tabular-nums">{QUEUE.length}</p>
          <p className="mt-1 text-xs text-zinc-500">Avg wait: 6 min</p>
          <div className="mt-6 space-y-2">
            <BenchStat label="Longest wait" value="14m" />
            <BenchStat label="Benched" value={String(BENCH.length)} />
            <BenchStat label="Matches queued" value="3" />
          </div>
        </Panel>

        <Panel className="col-span-12 lg:col-span-8">
          <h2 className="mb-4 text-sm font-semibold">In line</h2>
          <div className="divide-y divide-zinc-100">
            {QUEUE.map((p, i) => (
              <div key={p.name} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-zinc-400">Rating {p.rating.toFixed(1)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs font-medium text-zinc-400">{p.waited}</span>
                  <button className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:underline">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="col-span-12 lg:col-span-4">
          <h2 className="mb-4 text-sm font-semibold">On the bench</h2>
          <div className="space-y-3">
            {BENCH.map((p) => (
              <div key={p.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-zinc-50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-zinc-400">{p.reason}</p>
                </div>
                <button className="shrink-0 rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase text-zinc-900 hover:bg-brand-dark hover:text-white">
                  Return
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function TeamBadge({ names, align = "left" }: { names: string[]; align?: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      {names.map((n) => (
        <p key={n} className="truncate text-sm font-bold sm:text-base">{n}</p>
      ))}
    </div>
  );
}

function BenchStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2">
      <p className="truncate text-xs text-zinc-500">{label}</p>
      <p className="shrink-0 text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}