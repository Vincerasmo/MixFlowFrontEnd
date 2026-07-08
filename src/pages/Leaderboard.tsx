import { AppShell, PageHeader, Panel } from "@/components/app-shell";

const RANKINGS = [
  { rank: 1, name: "Sarah Jenkins", wins: 42, losses: 4, streak: 8, rating: 4.5 },
  { rank: 2, name: "Marcus Thorne", wins: 38, losses: 7, streak: 3, rating: 4.3 },
  { rank: 3, name: "Elena Rodriguez", wins: 35, losses: 9, streak: 5, rating: 4.1 },
  { rank: 4, name: "Jordan Miller", wins: 28, losses: 12, streak: 2, rating: 3.9 },
  { rank: 5, name: "Kelly Chen", wins: 26, losses: 14, streak: 4, rating: 3.8 },
  { rank: 6, name: "Aiden Ross", wins: 19, losses: 15, streak: 1, rating: 3.5 },
  { rank: 7, name: "Priya Davis", wins: 17, losses: 16, streak: 0, rating: 3.4 },
  { rank: 8, name: "Tommy Nguyen", wins: 12, losses: 20, streak: 0, rating: 3.0 },
];

export default function LeaderboardPage() {
  const [first, second, third, ...rest] = RANKINGS;
  return (
    <AppShell>
      <PageHeader
        eyebrow="Season standings"
        title="Leaderboard"
        subtitle="Fall 2024 • Updated in real time as matches finish."
      />

      <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-6">
        <Podium player={second} height="h-32 sm:h-40" gradient="from-zinc-300 to-zinc-400" medal="🥈" />
        <Podium player={first} height="h-40 sm:h-56" gradient="from-ball to-ball-deep" medal="🥇" featured />
        <Podium player={third} height="h-28 sm:h-36" gradient="from-amber-600 to-amber-800" medal="🥉" />
      </div>

      <Panel>
        <h2 className="mb-4 text-sm font-semibold">Full rankings</h2>
        <div className="divide-y divide-zinc-100">
          <div className="hidden grid-cols-[3rem_minmax(0,1fr)_4rem_4rem_4rem_4rem] items-center gap-3 pb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 sm:grid">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-right">Rating</span>
            <span className="text-right">Wins</span>
            <span className="text-right">Losses</span>
            <span className="text-right">Streak</span>
          </div>
          {rest.map((p) => (
            <div
              key={p.rank}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3 sm:grid-cols-[3rem_minmax(0,1fr)_4rem_4rem_4rem_4rem]"
            >
              <span className="text-sm font-bold text-zinc-400 tabular-nums">#{p.rank}</span>
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ball to-brand text-[10px] font-bold text-zinc-900">
                  {p.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <span className="truncate text-sm font-semibold">{p.name}</span>
              </div>
              <span className="hidden text-right text-sm font-bold tabular-nums sm:inline">{p.rating.toFixed(1)}</span>
              <span className="text-right text-sm font-bold tabular-nums text-brand-dark sm:inline">{p.wins}</span>
              <span className="hidden text-right text-sm font-medium tabular-nums text-zinc-500 sm:inline">{p.losses}</span>
              <span className="hidden text-right text-xs font-bold sm:inline">
                {p.streak > 0 ? (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-brand-dark">🔥 {p.streak}</span>
                ) : (
                  <span className="text-zinc-300">—</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}

function Podium({
  player, height, gradient, medal, featured,
}: {
  player: typeof RANKINGS[number];
  height: string;
  gradient: string;
  medal: string;
  featured?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className={`mb-2 text-2xl sm:text-3xl ${featured ? "ball-bounce" : ""}`}>{medal}</div>
      <div className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-ball to-brand text-sm font-bold text-zinc-900 ring-4 ring-white shadow-lg sm:size-16">
        {player.name.split(" ").map((n) => n[0]).join("")}
      </div>
      <p className="mt-2 text-center text-xs font-bold sm:text-sm">{player.name}</p>
      <p className="text-[10px] text-zinc-500">{player.wins} wins</p>
      <div className={`mt-3 w-full rounded-t-2xl bg-gradient-to-b ${gradient} ${height} flex items-start justify-center pt-3 shadow-inner`}>
        <span className="text-2xl font-black text-white/90 sm:text-4xl">#{player.rank}</span>
      </div>
    </div>
  );
}