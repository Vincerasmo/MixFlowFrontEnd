import { useEffect, useState } from "react";
import { Medal, Loader2 } from "lucide-react";
import PanelCard from "./PanelCard";
import { cn } from "@/lib/utils";
import { getOverallLeaderboard } from "@/services/leaderboard";
import type { LeaderboardPlayerDto } from "@/services/leaderboard";

export default function LeaderboardPanel() {
  const [leaders, setLeaders] = useState<LeaderboardPlayerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getOverallLeaderboard()
      .then((data) => {
        if (!cancelled) setLeaders(data);
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
    <PanelCard title="Top Performers (Weekly)" accent="bg-ball" to="/leaderboard" className="col-span-12">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading leaderboard…
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : leaders.length === 0 ? (
        <p className="text-sm text-zinc-400">No results yet — play a few matches to populate the leaderboard.</p>
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
              {leaders.slice(0, 5).map((p) => (
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