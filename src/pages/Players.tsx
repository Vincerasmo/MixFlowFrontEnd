import { AppShell, PageHeader, Panel } from "../components/app-shell";

const PLAYERS = [
  { name: "Sarah Jenkins", rating: 4.5, wins: 42, losses: 4, tier: "Pro" },
  { name: "Marcus Thorne", rating: 4.3, wins: 38, losses: 7, tier: "Pro" },
  { name: "Elena Rodriguez", rating: 4.1, wins: 35, losses: 9, tier: "Advanced" },
  { name: "Jordan Miller", rating: 3.9, wins: 28, losses: 12, tier: "Advanced" },
  { name: "Kelly Chen", rating: 3.8, wins: 26, losses: 14, tier: "Advanced" },
  { name: "Aiden Ross", rating: 3.5, wins: 19, losses: 15, tier: "Intermediate" },
  { name: "Priya Davis", rating: 3.4, wins: 17, losses: 16, tier: "Intermediate" },
  { name: "Tommy Nguyen", rating: 3.0, wins: 12, losses: 20, tier: "Rec" },
];

const TIER_STYLE: Record<string, string> = {
  Pro: "bg-ink text-white",
  Advanced: "bg-brand text-zinc-900",
  Intermediate: "bg-ball text-zinc-900",
  Rec: "bg-zinc-200 text-zinc-700",
};

export default function PlayersPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Roster"
        title="Players"
        subtitle="128 members across 4 skill tiers."
        action={
          <button className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-zinc-900 ring-1 ring-black/10 shadow-lg shadow-brand/30 transition-transform hover:bg-brand-dark hover:text-white active:scale-[0.97]">
            + Add Player
          </button>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {PLAYERS.map((p) => (
          <Panel key={p.name} className="group relative overflow-hidden">
            <div className="absolute -right-6 -top-6 size-24 rounded-full bg-brand-soft transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ball to-brand text-sm font-bold text-zinc-900 ring-2 ring-white shadow-sm">
                  {p.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${TIER_STYLE[p.tier]}`}>
                    {p.tier}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3">
                <Stat label="Rating" value={p.rating.toFixed(1)} />
                <Stat label="Wins" value={String(p.wins)} accent />
                <Stat label="Losses" value={String(p.losses)} />
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`text-base font-bold tabular-nums ${accent ? "text-brand-dark" : "text-zinc-900"}`}>
        {value}
      </p>
    </div>
  );
}