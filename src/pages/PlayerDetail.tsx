import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Trophy, Calendar } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { getPlayerHistory } from "@/services/players";
import type { PlayerHistory } from "@/services/players";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("");
}

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playerId = Number(id);

  const [history, setHistory] = useState<PlayerHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId || Number.isNaN(playerId)) {
      setError("Invalid player.");
      setLoading(false);
      return;
    }

    getPlayerHistory(playerId)
      .then(setHistory)
      .catch(() => setError("Couldn't load this player's history."))
      .finally(() => setLoading(false));
  }, [playerId]);

  // Chronological (oldest first) for the chart, tracking a running win/loss net —
  // goes up on a win, down on a loss, so the line's direction reads as momentum.
  const chartData = useMemo(() => {
    if (!history) return [];
    let net = 0;
    return [...history.matches]
      .reverse()
      .map((m, i) => {
        net += m.won ? 1 : -1;
        return {
          index: i + 1,
          date: new Date(m.playedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          net,
          won: m.won,
        };
      });
  }, [history]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading player…
        </div>
      </AppShell>
    );
  }

  if (error || !history) {
    return (
      <AppShell>
        <PageHeader eyebrow="Player" title="Not found" />
        <Panel className="text-center text-sm text-zinc-400">{error ?? "Player not found."}</Panel>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <div className="mb-6 flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-linear-to-br from-ball to-brand text-lg font-bold text-zinc-900 ring-4 ring-white shadow-lg">
          {initials(history.fullName)}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{history.fullName}</h1>
          <p className="text-sm text-zinc-500">
            {history.skillCategory} • Rating {Number(history.skillLevel).toFixed(1)}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Games" value={String(history.matches.length)} />
        <StatBox label="Wins" value={String(history.totalWins)} accent />
        <StatBox label="Losses" value={String(history.totalLosses)} />
        <StatBox label="Win %" value={`${history.winPercentage.toFixed(0)}%`} accent />
      </div>

      <Panel className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">Win/loss trend</h2>
        <p className="mb-4 text-xs text-zinc-400">
          Running total across all {history.matches.length} matches — up on a win, down on a loss.
        </p>
        {chartData.length < 2 ? (
          <p className="text-sm text-zinc-400">Not enough matches yet for a trend line.</p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#a1a1aa" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <ReferenceLine y={0} stroke="#e4e4e7" />
                <Tooltip
                  formatter={(value: number) => [value, "Net"]}
                  labelFormatter={(label) => `Match on ${label}`}
                  contentStyle={{ borderRadius: 12, border: "1px solid #f4f4f5", fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#84cc16"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#84cc16" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel>
        <h2 className="mb-4 text-sm font-semibold">
          <Calendar className="mr-1.5 inline size-4 text-zinc-400" />
          Match history ({history.sessionsPlayed} session{history.sessionsPlayed === 1 ? "" : "s"})
        </h2>
        {history.matches.length === 0 ? (
          <p className="text-sm text-zinc-400">No matches recorded yet.</p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {history.matches.map((m) => (
              <div key={m.matchId} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    with {m.partnerName} vs {m.opponentNames.join(" / ")}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {m.sessionName} • {new Date(m.playedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {m.won && <Trophy className="size-3.5 fill-yellow-400 text-yellow-400" />}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                      m.won ? "bg-brand-soft text-brand-dark" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {m.teamScore}-{m.opponentScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </AppShell>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-4 text-center">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`text-2xl font-black tabular-nums ${accent ? "text-brand-dark" : "text-zinc-900"}`}>{value}</p>
    </div>
  );
}