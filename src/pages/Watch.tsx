import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { PickleballIcon } from "@/components/icons/pickleball-icons";
import {
  getPublicSession,
  getPublicQueue,
  getPublicActiveMatches,
  getPublicNextUpMatches,
  getPublicCompletedMatches,
  getPublicLeaderboard,
} from "@/services/public";
import type { PublicSessionDto } from "@/services/public";
import type { MatchDto, QueueEntryDto } from "@/services/matches";
import type { LeaderboardPlayerDto } from "@/services/leaderboard";

const POLL_INTERVAL_MS = 7000;

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("");
}

// Identical to the dashboard's Top Performers panel, so rank styling is consistent
// everywhere a leaderboard shows up.
const medalTone = (rank: number) =>
  rank === 1 ? "bg-ball" : rank === 2 ? "bg-zinc-300" : rank === 3 ? "bg-amber-600" : "bg-brand-soft text-brand-dark";

export default function WatchPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const id = Number(sessionId);

  const [session, setSession] = useState<PublicSessionDto | null>(null);
  const [queue, setQueue] = useState<QueueEntryDto[]>([]);
  const [activeMatches, setActiveMatches] = useState<MatchDto[]>([]);
  const [nextUpMatches, setNextUpMatches] = useState<MatchDto[]>([]);
  const [completedMatches, setCompletedMatches] = useState<MatchDto[]>([]);
  const [leaders, setLeaders] = useState<LeaderboardPlayerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError("Invalid session link.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const [s, q, active, nextUp, completed, board] = await Promise.all([
          getPublicSession(id),
          getPublicQueue(id),
          getPublicActiveMatches(id),
          getPublicNextUpMatches(id),
          getPublicCompletedMatches(id),
          getPublicLeaderboard(id),
        ]);
        if (cancelled) return;
        setSession(s);
        setQueue(q);
        setActiveMatches(active);
        setNextUpMatches(nextUp);
        setCompletedMatches(completed);
        setLeaders(board);
        setError(null);
      } catch {
        if (!cancelled) setError("Couldn't load this session. The link may be invalid or the session may have ended.");
      } finally {
        if (!cancelled && !opts?.silent) setLoading(false);
      }
    };

    void load();
    const interval = setInterval(() => void load({ silent: true }), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-50">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-50 p-6 text-center">
        <div>
          <PickleballIcon className="mx-auto mb-4 size-12" />
          <p className="text-sm font-medium text-zinc-600">{error ?? "Session not found."}</p>
        </div>
      </div>
    );
  }

  const matchByCourt = new Map(activeMatches.map((m) => [m.courtNumber, m]));
  const courts = Array.from({ length: session.numberOfCourts }, (_, i) => i + 1);
  const inMatchPlayers = activeMatches.flatMap((m) =>
    [...m.team1, ...m.team2].map((p) => ({ playerId: p.playerId, fullName: p.fullName, courtNumber: m.courtNumber })),
  );
  const reservedNextUpPlayers = nextUpMatches.flatMap((m) => [...m.team1, ...m.team2]);

  return (
    <div className="min-h-screen bg-zinc-50 pb-16 font-sans text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <PickleballIcon className="size-7" />
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{session.sessionName}</p>
            <p className="text-xs text-zinc-500">
              {session.status === "Active" ? "Live now" : "Session ended"} • {session.numberOfCourts} courts
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Courts */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500">On Court</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {courts.map((courtNumber) => {
              const match = matchByCourt.get(courtNumber);
              return (
                <div
                  key={courtNumber}
                  className="relative overflow-hidden rounded-[20px] bg-[#8ba668] p-4 text-white ring-1 ring-black/10"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-black uppercase tracking-[0.15em] text-zinc-900">
                      Court {courtNumber}
                    </span>
                    {match && (
                      <span className="pulse-dot rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black uppercase text-white shadow">
                        Live
                      </span>
                    )}
                  </div>

                  {match ? (
                    <div className="grid grid-cols-[1fr_56px_1fr] overflow-hidden rounded-xl border-[4px] border-white">
                      <div className="grid grid-rows-2 divide-y-[3px] divide-white bg-[#4a7a9c]">
                        {match.team1.map((p) => (
                          <div key={p.playerId} className="flex items-center justify-center p-2">
                            <p className="truncate text-sm font-bold text-white">{p.fullName}</p>
                          </div>
                        ))}
                      </div>
                      <div className="relative bg-[#5ec2dd]">
                        <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-zinc-900" />
                      </div>
                      <div className="grid grid-rows-2 divide-y-[3px] divide-white bg-[#4a7a9c]">
                        {match.team2.map((p) => (
                          <div key={p.playerId} className="flex items-center justify-center p-2">
                            <p className="truncate text-sm font-bold text-white">{p.fullName}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded-xl border-4 border-dashed border-white/50 text-sm font-bold text-white/80">
                      Available
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Next Up */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500">Next Up</h2>
          {nextUpMatches.length === 0 ? (
            <p className="text-sm text-zinc-400">Nothing prepared yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {nextUpMatches.map((match) => (
                <div
                  key={match.matchId}
                  className="relative overflow-hidden rounded-[20px] bg-[#8ba668] p-4 text-white ring-1 ring-black/10"
                >
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-zinc-900">Next Up</p>
                  <div className="grid grid-cols-[1fr_56px_1fr] overflow-hidden rounded-xl border-[4px] border-white">
                    <div className="grid grid-rows-2 divide-y-[3px] divide-white bg-[#4a7a9c]">
                      {match.team1.map((p) => (
                        <div key={p.playerId} className="flex items-center justify-center p-2">
                          <p className="truncate text-sm font-bold text-white">{p.fullName}</p>
                        </div>
                      ))}
                    </div>
                    <div className="relative bg-[#5ec2dd]">
                      <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-zinc-900" />
                    </div>
                    <div className="grid grid-rows-2 divide-y-[3px] divide-white bg-[#4a7a9c]">
                      {match.team2.map((p) => (
                        <div key={p.playerId} className="flex items-center justify-center p-2">
                          <p className="truncate text-sm font-bold text-white">{p.fullName}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Queue + In Match + Reserved Next Up, side by side */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          <section className="rounded-[20px] bg-white p-5 ring-1 ring-black/5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500">Queue ({queue.length})</h2>
            {queue.length === 0 ? (
              <p className="text-sm text-zinc-400">No one's waiting right now.</p>
            ) : (
              <div className="max-h-96 divide-y divide-zinc-100 overflow-y-auto">
                {queue.map((q, i) => (
                  <div key={q.queueId} className="flex items-center gap-3 py-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-dark">
                      {q.position ?? i + 1}
                    </span>
                    <p className="truncate text-sm font-semibold">{q.fullName}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[20px] bg-white p-5 ring-1 ring-black/5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500">
              In Match — Players ({inMatchPlayers.length})
            </h2>
            {inMatchPlayers.length === 0 ? (
              <p className="text-sm text-zinc-400">No one's playing right now.</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {inMatchPlayers.map((p) => (
                  <div key={p.playerId} className="flex items-center justify-between gap-3 py-2.5">
                    <p className="truncate text-sm font-semibold">{p.fullName}</p>
                    <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-0.5 text-[10px] font-bold uppercase text-brand-dark">
                      Court {p.courtNumber}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[20px] bg-white p-5 ring-1 ring-black/5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500">
              Reserved — Next Up ({reservedNextUpPlayers.length})
            </h2>
            {reservedNextUpPlayers.length === 0 ? (
              <p className="text-sm text-zinc-400">Nothing prepared yet.</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {reservedNextUpPlayers.map((p) => (
                  <div key={p.playerId} className="flex items-center gap-3 py-2.5">
                    <p className="truncate text-sm font-semibold">{p.fullName}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Leaderboard */}
        <section className="mb-8 rounded-[20px] bg-white p-5 ring-1 ring-black/5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500">Leaderboard</h2>
          {leaders.length === 0 ? (
            <p className="text-sm text-zinc-400">No results yet.</p>
          ) : (
            <div className="max-h-96 divide-y divide-zinc-100 overflow-y-auto">
              {leaders.slice(0, 10).map((l) => (
                <div key={l.playerId} className="flex items-center justify-between py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-zinc-900",
                        medalTone(l.rank),
                      )}
                    >
                      {l.rank <= 3 ? <Medal className="size-3.5" /> : l.rank}
                    </span>
                    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-ball to-brand text-[10px] font-bold text-zinc-900">
                      {initials(l.fullName)}
                    </div>
                    <p className="truncate text-sm font-semibold">{l.fullName}</p>
                  </div>
                  <p className="shrink-0 text-xs font-bold tabular-nums text-zinc-500">
                    {l.wins}-{l.losses} • {l.winPercentage.toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent results */}
        <section className="rounded-[20px] bg-white p-5 ring-1 ring-black/5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500">Recent Results</h2>
          {completedMatches.length === 0 ? (
            <p className="text-sm text-zinc-400">No matches finished yet.</p>
          ) : (
            <div className="max-h-96 divide-y divide-zinc-100 overflow-y-auto">
              {completedMatches.slice(0, 10).map((m) => (
                <div key={m.matchId} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-2.5">
                  <p className="truncate text-right text-sm font-semibold">
                    {m.team1.map((p) => p.fullName).join(" / ")}
                  </p>
                  <span className="shrink-0 rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-bold tabular-nums text-brand-dark">
                    {m.team1Score ?? 0}-{m.team2Score ?? 0}
                  </span>
                  <p className="truncate text-sm font-semibold text-zinc-500">
                    {m.team2.map((p) => p.fullName).join(" / ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}