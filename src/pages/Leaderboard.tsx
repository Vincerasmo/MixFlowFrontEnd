import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getActiveSessionLeaderboard, getOverallLeaderboard } from "@/services/leaderboard";
import type { LeaderboardPlayerDto } from "@/services/leaderboard";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("");
}

export default function LeaderboardPage() {
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [sessionRankings, setSessionRankings] = useState<LeaderboardPlayerDto[]>([]);
  const [overallRankings, setOverallRankings] = useState<LeaderboardPlayerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getActiveSessionLeaderboard(), getOverallLeaderboard()])
      .then(([activeSession, overall]) => {
        if (cancelled) return;
        if (activeSession !== null) {
          setSessionName(activeSession.sessionName);
          setSessionRankings(activeSession.leaderboard);
        }
        setOverallRankings(overall);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the leaderboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading leaderboard…
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <PageHeader eyebrow="Standings" title="Leaderboard" />
        <Panel className="text-center text-sm text-red-500">{error}</Panel>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Standings" title="Leaderboard" subtitle="Updated in real time as matches finish." />

      <Tabs defaultValue="session">
        <TabsList>
          <TabsTrigger value="session">Session</TabsTrigger>
          <TabsTrigger value="overall">Overall</TabsTrigger>
        </TabsList>

        <TabsContent value="session">
          <LeaderboardView
            rankings={sessionRankings}
            subtitle={sessionName ? sessionName : undefined}
            emptyMessage={
              sessionName === null
                ? "No active session right now. Start a session to see live standings here."
                : "No results yet for this session — the leaderboard fills in as matches are recorded."
            }
          />
        </TabsContent>

        <TabsContent value="overall">
          <LeaderboardView
            rankings={overallRankings}
            subtitle="All-time, across every session"
            emptyMessage="No players have recorded matches yet."
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function LeaderboardView({
  rankings,
  subtitle,
  emptyMessage,
}: {
  rankings: LeaderboardPlayerDto[];
  subtitle?: string;
  emptyMessage: string;
}) {
  if (rankings.length === 0) {
    return (
      <Panel className="mt-4 text-center text-sm text-zinc-400">
        {emptyMessage}
      </Panel>
    );
  }

  const [first, second, third, ...rest] = rankings;

  return (
    <div className="mt-4">
      {subtitle && <p className="mb-4 text-sm text-zinc-500">{subtitle}</p>}

      {first && (
        <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-6">
          {second ? (
            <Podium player={second} height="h-32 sm:h-40" gradient="from-zinc-300 to-zinc-400" medal="🥈" />
          ) : (
            <div />
          )}
          <Podium player={first} height="h-40 sm:h-56" gradient="from-ball to-ball-deep" medal="🥇" featured />
          {third ? (
            <Podium player={third} height="h-28 sm:h-36" gradient="from-amber-600 to-amber-800" medal="🥉" />
          ) : (
            <div />
          )}
        </div>
      )}

      <Panel>
        <h2 className="mb-4 text-sm font-semibold">Full rankings</h2>
        <div className="divide-y divide-zinc-100">
          <div className="hidden grid-cols-[3rem_minmax(0,1fr)_4rem_4rem_4rem_4rem] items-center gap-3 pb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 sm:grid">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-right">Rating</span>
            <span className="text-right">Wins</span>
            <span className="text-right">Losses</span>
            <span className="text-right">Win %</span>
          </div>
          {rest.map((p) => (
            <div
              key={p.playerId}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3 sm:grid-cols-[3rem_minmax(0,1fr)_4rem_4rem_4rem_4rem]"
            >
              <span className="text-sm font-bold text-zinc-400 tabular-nums">#{p.rank}</span>
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-ball to-brand text-[10px] font-bold text-zinc-900">
                  {initials(p.fullName)}
                </div>
                <span className="truncate text-sm font-semibold">{p.fullName}</span>
              </div>
              <span className="hidden text-right text-sm font-bold tabular-nums sm:inline">
                {Number(p.skillLevel).toFixed(1)}
              </span>
              <span className="text-right text-sm font-bold tabular-nums text-brand-dark sm:inline">
                {p.wins}
              </span>
              <span className="hidden text-right text-sm font-medium tabular-nums text-zinc-500 sm:inline">
                {p.losses}
              </span>
              <span className="hidden text-right text-xs font-bold tabular-nums sm:inline">
                {Number(p.winPercentage).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Podium({
  player, height, gradient, medal, featured,
}: {
  player: LeaderboardPlayerDto;
  height: string;
  gradient: string;
  medal: string;
  featured?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className={`mb-2 text-2xl sm:text-3xl ${featured ? "ball-bounce" : ""}`}>{medal}</div>
      <div className="grid size-14 place-items-center rounded-full bg-linear-to-br from-ball to-brand text-sm font-bold text-zinc-900 ring-4 ring-white shadow-lg sm:size-16">
        {initials(player.fullName)}
      </div>
      <p className="mt-2 text-center text-xs font-bold sm:text-sm">{player.fullName}</p>
      <p className="text-[10px] text-zinc-500">{player.wins} wins</p>
      <div className={`mt-3 w-full rounded-t-2xl bg-linear-to-b ${gradient} ${height} flex items-start justify-center pt-3 shadow-inner`}>
        <span className="text-2xl font-black text-white/90 sm:text-4xl">#{player.rank}</span>
      </div>
    </div>
  );
}