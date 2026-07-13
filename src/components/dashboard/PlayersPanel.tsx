import { useEffect, useState } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import PanelCard from "./PanelCard";
import { getAllPlayers } from "@/services/players";
import type { PlayerDto } from "@/services/players";

export default function PlayersPanel() {
  const [players, setPlayers] = useState<PlayerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAllPlayers()
      .then((data) => {
        if (!cancelled) setPlayers(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load players.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PanelCard title="Roster" accent="bg-brand-dark" to="/players" className="col-span-12 md:col-span-6">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading roster…
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <div className="min-w-0">
              <p className="text-3xl font-bold tabular-nums">{players.length}</p>
              <p className="text-xs text-zinc-400">Active members</p>
            </div>
            {players.length > 0 && (
              <div className="flex items-center gap-1 text-right text-xs font-semibold text-brand-dark">
                <TrendingUp className="size-3" />
                {players.filter((p) => p.gamesPlayed > 0).length} with games played
              </div>
            )}
          </div>

          {players.length > 0 ? (
            <div className="mt-4 divide-y divide-zinc-950/5">
              {players.slice(0, 4).map((p) => (
                <div key={p.playerId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.fullName}</p>
                    <p className="text-xs text-zinc-400">{p.skillCategory}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-zinc-500">
                    {p.winPercentage.toFixed(0)}% W
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-400">No players added yet.</p>
          )}
        </>
      )}
    </PanelCard>
  );
}