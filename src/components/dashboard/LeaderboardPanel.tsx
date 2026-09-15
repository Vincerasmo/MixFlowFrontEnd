import { useEffect, useState } from "react";
import { Medal, Loader2 } from "lucide-react";
import PanelCard from "./PanelCard";
import { cn } from "@/lib/utils";
import { getSessionLeaderboard } from "@/services/leaderboard";
import type { LeaderboardPlayerDto } from "@/services/leaderboard";
import { getMySessions } from "@/services/sessions";

export default function LeaderboardPanel() {
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [leaders, setLeaders] = useState<LeaderboardPlayerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // The overall/weekly leaderboard was removed — this panel now shows whichever
    // session most recently ended, since that's the most relevant "recent form"
    // snapshot available without a cross-session aggregate.
    getMySessions()
      .then((sessions) => {
        const ended = sessions
          .filter((s) => s.status !== "Active")
          .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

        const lastSession = ended[0];
        if (!lastSession) {
          if (!cancelled) setSessionName(null);
          return Promise.resolve();
        }

        if (!cancelled) setSessionName(lastSession.sessionName);
        return getSessionLeaderboard(lastSession.sessionId).then((data) => {
          if (!cancelled) setLeaders(data);
        });
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

  const medalTone = (rank: number) =>
    rank === 1 ? "bg-ball" : rank === 2 ? "bg-zinc-300" : rank === 3 ? "bg-amber-600" : "bg-zinc-100 text-zinc-500";

  return (
    <PanelCard
      title={sessionName ? `Top Performers — ${sessionName}` : "Top Performers"}
      accent="bg-ball"
      to="/leaderboard"
      className="col-span-12"
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading leaderboard…
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : sessionName === null ? (
        <p className="text-sm text-zinc-400">No completed sessions yet — this fills in once a session ends.</p>
      ) : leaders.length === 0 ? (
        <p className="text-sm text-zinc-400">No results were recorded in that session.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="w-10 pb-2">#</th>
                <th className="pb-2">Player</th>
                <th className="pb-2 text-right">Games</th>
                <th className="pb-2 text-right">Wins</th>
                <th className="pb-2 text-right">Losses</th>
                <th className="pb-2 text-right">Win %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-950/5">
              {leaders.slice(0, 3).map((p) => (
                <tr key={p.playerId}>
                  <td className="py-3">
                    <div
                      className={cn(
                        "grid size-7 place-items-center rounded-full text-[11px] font-bold text-zinc-900",
                        medalTone(p.rank),
                      )}
                    >
                      {p.rank <= 3 ? <Medal className="size-3.5" /> : p.rank}
                    </div>
                  </td>
                  <td className="py-3 font-semibold">{p.fullName}</td>
                  <td className="py-3 text-right tabular-nums text-zinc-500">{p.gamesPlayed}</td>
                  <td className="py-3 text-right tabular-nums text-zinc-500">{p.wins}</td>
                  <td className="py-3 text-right tabular-nums text-zinc-500">{p.losses}</td>
                  <td className="py-3 text-right tabular-nums font-semibold text-brand-dark">
                    {p.winPercentage.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  );
}