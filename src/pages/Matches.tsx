import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Shuffle, ArrowLeftRight, History, Trophy, Flame, Snowflake } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { getActiveSession, getSessionById } from "@/services/sessions";
import { getSessionLeaderboard } from "@/services/leaderboard";
import {
  getActiveMatches,
  getCompletedMatches,
  recordMatchResult,
  smartMixCourt,
  swapMatchTeams,
  getQueue,
  getNextUpMatches,
} from "@/services/matches";
import type { SessionDto } from "@/services/sessions";
import type { MatchDto, QueueEntryDto } from "@/services/matches";
import type { LeaderboardPlayerDto } from "@/services/leaderboard";

const CARD_WIDTH = 340;
const GAP = 24;

function wrapperMaxWidth(courtCount: number) {
  if (courtCount <= 1) return CARD_WIDTH;
  if (courtCount === 2) return CARD_WIDTH * 2 + GAP;
  if (courtCount === 3) return CARD_WIDTH * 3 + GAP * 2;
  return CARD_WIDTH * 2 + GAP; // 4+: force exactly 2 per row
}

export default function MatchesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedSessionId = Number(searchParams.get("sessionId")) || null;

  const [session, setSession] = useState<SessionDto | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionNotFound, setSessionNotFound] = useState(false);

  const [activeMatches, setActiveMatches] = useState<MatchDto[]>([]);
  const [completedMatches, setCompletedMatches] = useState<MatchDto[]>([]);
  const [queue, setQueue] = useState<QueueEntryDto[]>([]);
  const [nextUpMatches, setNextUpMatches] = useState<MatchDto[]>([]);
  const [sessionPlayerStats, setSessionPlayerStats] = useState<LeaderboardPlayerDto[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scoringMatch, setScoringMatch] = useState<MatchDto | null>(null);
  const [busyCourt, setBusyCourt] = useState<number | null>(null);

  // Swapping two players between teams on a live (in-progress) match
  const [swappingMatch, setSwappingMatch] = useState<MatchDto | null>(null);
  const [selectedForSwap, setSelectedForSwap] = useState<number | null>(null);
  const [swapBusy, setSwapBusy] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Filtering the results list to one player, via clicking their row in "All Players"
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  const isLive = session?.status === "Active";

  useEffect(() => {
    setSessionNotFound(false);

    const load = requestedSessionId ? getSessionById(requestedSessionId) : getActiveSession();

    load
      .then((s) => {
        if (s === null) {
          setSessionNotFound(true);
          return;
        }
        setSession(s);
      })
      .catch(() => {
        // getSessionById 404s as a thrown error, not a null return — either way,
        // treat it as "nothing to show" rather than a generic error banner.
        setSessionNotFound(true);
      })
      .finally(() => setSessionLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedSessionId]);

  const loadMatches = async (sessionId: number, live: boolean, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setDataLoading(true);
    setError(null);
    try {
      if (live) {
        const [active, completed, queueData, nextUp] = await Promise.all([
          getActiveMatches(sessionId),
          getCompletedMatches(sessionId),
          getQueue(sessionId),
          getNextUpMatches(sessionId),
        ]);
        setActiveMatches(active);
        setCompletedMatches(completed);
        setQueue(queueData);
        setNextUpMatches(nextUp);
      } else {
        // Ended session: only the final results matter — skip the live-only calls
        // (queue/next-up/active are meaningless once a session is over). Also pull
        // per-session player stats for the "All Players" summary table.
        const [completed, stats] = await Promise.all([
          getCompletedMatches(sessionId),
          getSessionLeaderboard(sessionId),
        ]);
        setCompletedMatches(completed);
        setSessionPlayerStats(stats);
        setActiveMatches([]);
        setQueue([]);
        setNextUpMatches([]);
      }
    } catch {
      setError("Couldn't load matches for this session.");
    } finally {
      if (!opts?.silent) setDataLoading(false);
    }
  };

  useEffect(() => {
    setSelectedPlayerId(null);
    if (session) void loadMatches(session.sessionId, isLive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleAutoMix = async (courtNumber: number) => {
    if (!session) return;
    setBusyCourt(courtNumber);
    setError(null);
    try {
      await smartMixCourt(session.sessionId, courtNumber);
      await loadMatches(session.sessionId, true, { silent: true });
    } catch (err) {
      const apiErr = err as { message?: string };
      setError(apiErr.message ?? "Couldn't fill this court — there may not be enough players queued.");
    } finally {
      setBusyCourt(null);
    }
  };

  const openSwap = (match: MatchDto) => {
    setSwappingMatch(match);
    setSelectedForSwap(null);
    setSwapError(null);
  };

  const closeSwap = () => {
    setSwappingMatch(null);
    setSelectedForSwap(null);
    setSwapError(null);
  };

  const handlePlayerClickForSwap = async (playerId: number, teamNumber: number) => {
    if (!session || !swappingMatch) return;

    if (selectedForSwap === null) {
      setSelectedForSwap(playerId);
      return;
    }

    if (selectedForSwap === playerId) {
      setSelectedForSwap(null);
      return;
    }

    const selectedTeam = [...swappingMatch.team1, ...swappingMatch.team2].find(
      (p) => p.playerId === selectedForSwap
    )?.teamNumber;
    if (selectedTeam === teamNumber) {
      // Same team — just move the selection instead of swapping.
      setSelectedForSwap(playerId);
      return;
    }

    setSwapBusy(true);
    setSwapError(null);
    try {
      const updated = await swapMatchTeams(session.sessionId, swappingMatch.matchId, selectedForSwap, playerId);
      setSwappingMatch(updated);
      setActiveMatches((prev) => prev.map((m) => (m.matchId === updated.matchId ? updated : m)));
      setSelectedForSwap(null);
    } catch (err) {
      const apiErr = err as { message?: string };
      setSwapError(apiErr.message ?? "Couldn't swap those two players.");
    } finally {
      setSwapBusy(false);
    }
  };

  const displayedMatches = useMemo(() => {
    if (!selectedPlayerId) return completedMatches;
    return completedMatches.filter((m) =>
      [...m.team1, ...m.team2].some((p) => p.playerId === selectedPlayerId)
    );
  }, [completedMatches, selectedPlayerId]);

  const selectedPlayerName = selectedPlayerId
    ? sessionPlayerStats.find((p) => p.playerId === selectedPlayerId)?.fullName
    : null;

  const handleTogglePlayerFilter = (playerId: number) => {
    setSelectedPlayerId((current) => (current === playerId ? null : playerId));
  };

  if (sessionLoading) {
    return (
      <AppShell>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading matches…
        </div>
      </AppShell>
    );
  }

  if (!session || sessionNotFound) {
    return (
      <AppShell>
        <PageHeader eyebrow={requestedSessionId ? "Match history" : "Live scoreboard"} title="Matches" />
        <Panel className="text-center text-sm text-zinc-400">
          {requestedSessionId
            ? "That session couldn't be found."
            : "No active session right now. Start a session to see live courts and match results here."}
        </Panel>
      </AppShell>
    );
  }

  const matchByCourt = new Map(activeMatches.map((m) => [m.courtNumber, m]));
  const courts = Array.from({ length: session.numberOfCourts }, (_, i) => i + 1);

  return (
    <AppShell>
      <PageHeader
        eyebrow={isLive ? "Live scoreboard" : "Match history"}
        title="Matches"
        subtitle={
          isLive
            ? `${activeMatches.length} of ${session.numberOfCourts} court${session.numberOfCourts === 1 ? "" : "s"} in play, ${completedMatches.length} match${completedMatches.length === 1 ? "" : "es"} recorded this session.`
            : `${session.sessionName} • ${completedMatches.length} match${completedMatches.length === 1 ? "" : "es"} played • Session ended`
        }
      />

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {dataLoading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading courts…
        </div>
      ) : (
        <>
          {isLive && (
          <div className="mx-auto flex flex-wrap justify-center gap-6" style={{ maxWidth: wrapperMaxWidth(courts.length) }}>
            {courts.map((courtNumber) => {
              const match = matchByCourt.get(courtNumber);

              if (match) {
                return (
                  <div
                    key={courtNumber}
                    style={{ width: CARD_WIDTH }}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/queue")}
                    className="relative cursor-pointer overflow-hidden rounded-[20px] bg-[#8ba668] p-4 text-white ring-1 ring-black/10 transition-transform hover:scale-[1.01]"
                  >
                    <div className="relative">
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                          Court {courtNumber}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openSwap(match);
                            }}
                            aria-label="Swap teams"
                            title="Swap teams"
                            className="grid size-6 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30"
                          >
                            <ArrowLeftRight className="size-3.5" />
                          </button>
                          <span className="pulse-dot rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
                            Live
                          </span>
                        </div>
                      </div>

                      {/* Court view: each side split top/bottom, wide light-blue "kitchen" strip with a thin net line down the middle */}
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

                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScoringMatch(match);
                        }}
                        className="mt-4 w-full rounded-full bg-white text-zinc-900 hover:bg-zinc-100"
                      >
                        Record Result
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={courtNumber}
                  style={{ width: CARD_WIDTH }}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate("/queue")}
                  className="relative flex cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-zinc-200 bg-zinc-50 p-6 text-center transition-colors hover:border-brand hover:bg-brand-soft/40"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    Court {courtNumber}
                  </p>

                  {nextUpMatches[0] ? (
                    <div className="mt-2 space-y-0.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Up next</p>
                      <p className="truncate text-xs font-semibold text-zinc-600">
                        {nextUpMatches[0].team1.map((p) => p.fullName).join(" / ")}
                      </p>
                      <p className="truncate text-xs font-semibold text-zinc-600">
                        {nextUpMatches[0].team2.map((p) => p.fullName).join(" / ")}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-zinc-500">Available</p>
                  )}

                  <Button
                    size="sm"
                    disabled={busyCourt === courtNumber || queue.length < 4}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleAutoMix(courtNumber);
                    }}
                    className="mt-4 w-full rounded-full"
                  >
                    <Shuffle className="size-3.5" />
                    {busyCourt === courtNumber ? "Mixing…" : "Auto Mix"}
                  </Button>
                  {queue.length < 4 && (
                    <p className="mt-2 text-[11px] text-zinc-400">Need 4+ in queue to fill a court</p>
                  )}
                </div>
              );
            })}
          </div>
          )}

          {!isLive && (
            <div className="mt-6">
              <Panel>
                <h2 className="mb-4 text-sm font-semibold">All Players</h2>
                {sessionPlayerStats.length === 0 ? (
                  <p className="text-sm text-zinc-400">No players recorded for this session.</p>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <div className="hidden grid-cols-[minmax(0,1fr)_5rem_4rem_4rem_4rem] gap-3 pb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 sm:grid">
                      <span>Player</span>
                      <span className="text-right">Games</span>
                      <span className="text-right">Wins</span>
                      <span className="text-right">Losses</span>
                      <span className="text-right">Streak</span>
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {sessionPlayerStats.map((p) => (
                        <button
                          key={p.playerId}
                          onClick={() => handleTogglePlayerFilter(p.playerId)}
                          className={`flex w-full flex-col gap-2 rounded-lg px-2 py-3 text-left transition-colors sm:grid sm:grid-cols-[minmax(0,1fr)_5rem_4rem_4rem_4rem] sm:items-center sm:gap-3 ${
                            selectedPlayerId === p.playerId ? "bg-brand-soft" : "hover:bg-zinc-50"
                          }`}
                        >
                          <p className="truncate text-sm font-semibold">{p.fullName}</p>

                          {/* Below sm: all four stats as compact labeled chips instead of vanishing entirely */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:hidden">
                            <StatChip label="Games" value={String(p.gamesPlayed)} />
                            <StatChip label="Wins" value={String(p.wins)} accent />
                            <StatChip label="Losses" value={String(p.losses)} />
                            <span className="flex items-center gap-1">
                              <span className="text-zinc-400">Streak</span>
                              <StreakIndicator streak={p.streak} />
                            </span>
                          </div>

                          <span className="hidden text-right text-sm font-bold tabular-nums sm:inline">{p.gamesPlayed}</span>
                          <span className="hidden text-right text-sm font-bold tabular-nums text-brand-dark sm:inline">
                            {p.wins}
                          </span>
                          <span className="hidden text-right text-sm font-medium tabular-nums text-zinc-500 sm:inline">
                            {p.losses}
                          </span>
                          <span className="hidden text-right sm:inline">
                            <StreakIndicator streak={p.streak} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            </div>
          )}

          <div className="mt-6">
            <Panel>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">
                  <History className="mr-1.5 inline size-4 text-zinc-400" />
                  {isLive ? "Recent results" : "Final results"}
                  {selectedPlayerName && <span className="font-normal text-zinc-400"> — {selectedPlayerName}</span>}
                </h2>
                {selectedPlayerId && (
                  <button
                    onClick={() => setSelectedPlayerId(null)}
                    className="shrink-0 text-xs font-semibold text-brand-dark underline underline-offset-2"
                  >
                    Show all
                  </button>
                )}
              </div>
              {displayedMatches.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  {selectedPlayerId
                    ? `${selectedPlayerName} hasn't played a recorded match this session.`
                    : isLive
                      ? "No completed matches yet this session."
                      : "No matches were recorded in this session."}
                </p>
              ) : (
                <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                  {displayedMatches.map((m) => {
                    const t1Score = m.team1Score ?? 0;
                    const t2Score = m.team2Score ?? 0;
                    const t1Won = t1Score > t2Score;
                    const t2Won = t2Score > t1Score;
                    return (
                      <div
                        key={m.matchId}
                        className="rounded-2xl bg-[#8ba668] px-4 py-3 ring-1 ring-black/10"
                      >
                        {/* Numerator row — Team 1 */}
                        <div className={`flex items-center gap-3 ${t1Won ? "" : "opacity-60"}`}>
                          <span className="grid w-12 shrink-0 place-items-center rounded-lg bg-[#4a7a9c] py-1 text-lg font-black tabular-nums text-white shadow">
                            {t1Score}
                          </span>
                          <p
                            className={`min-w-0 flex-1 truncate text-sm drop-shadow ${
                              t1Won ? "font-black text-white" : "font-medium text-white/70"
                            }`}
                          >
                            {m.team1.map((p) => p.fullName).join(" / ")}
                          </p>
                          {t1Won && <Trophy className="size-4 shrink-0 fill-yellow-300 text-yellow-300" />}
                        </div>

                        {/* The fraction bar */}
                        <div className="my-1.5 ml-[60px] h-px bg-white/40" />

                        {/* Denominator row — Team 2 */}
                        <div className={`flex items-center gap-3 ${t2Won ? "" : "opacity-60"}`}>
                          <span className="grid w-12 shrink-0 place-items-center rounded-lg bg-[#4a7a9c] py-1 text-lg font-black tabular-nums text-white shadow">
                            {t2Score}
                          </span>
                          <p
                            className={`min-w-0 flex-1 truncate text-sm drop-shadow ${
                              t2Won ? "font-black text-white" : "font-medium text-white/70"
                            }`}
                          >
                            {m.team2.map((p) => p.fullName).join(" / ")}
                          </p>
                          {t2Won && <Trophy className="size-4 shrink-0 fill-yellow-300 text-yellow-300" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>
        </>
      )}

      <RecordResultDialog
        match={scoringMatch}
        sessionId={session.sessionId}
        onClose={() => setScoringMatch(null)}
        onRecorded={() => {
          setScoringMatch(null);
          void loadMatches(session.sessionId, true, { silent: true });
        }}
      />

      <Dialog open={!!swappingMatch} onOpenChange={(o) => !o && closeSwap()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Swap teams — Court {swappingMatch?.courtNumber ?? "?"}</DialogTitle>
            <DialogDescription>Tap two players on opposite teams to swap sides.</DialogDescription>
          </DialogHeader>

          {swappingMatch && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((teamNumber) => (
                  <div key={teamNumber}>
                    <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Team {teamNumber}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {(teamNumber === 1 ? swappingMatch.team1 : swappingMatch.team2).map((p) => (
                        <button
                          key={p.playerId}
                          onClick={() => handlePlayerClickForSwap(p.playerId, teamNumber)}
                          disabled={swapBusy}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-left text-sm font-medium disabled:opacity-50 ${
                            selectedForSwap === p.playerId ? "bg-brand-soft ring-1 ring-brand" : "bg-zinc-50"
                          }`}
                        >
                          <ArrowLeftRight className="size-3 shrink-0 text-zinc-400" />
                          <span className="truncate">{p.fullName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {swapError && <p className="mt-3 text-sm text-red-500">{swapError}</p>}
            </>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Done</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function StatChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-zinc-400">{label}</span>
      <span className={`font-bold tabular-nums ${accent ? "text-brand-dark" : "text-zinc-700"}`}>{value}</span>
    </span>
  );
}

// Same fire/ice treatment as the Leaderboard page's session view.
function StreakIndicator({ streak, size = "text-xs" }: { streak: number; size?: string }) {
  if (streak === 0) {
    return <span className={`${size} font-bold tabular-nums text-zinc-400`}>—</span>;
  }
  if (streak > 0) {
    return (
      <span className={`inline-flex items-center gap-1 ${size} font-bold tabular-nums text-orange-600`}>
        <Flame className="size-3.5 fill-orange-500 text-orange-500" /> {streak}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 ${size} font-bold tabular-nums text-sky-600`}>
      <Snowflake className="size-3.5 fill-sky-400 text-sky-500" /> {Math.abs(streak)}
    </span>
  );
}

function RecordResultDialog({
  match,
  sessionId,
  onClose,
  onRecorded,
}: {
  match: MatchDto | null;
  sessionId: number;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTeam1Score("");
    setTeam2Score("");
    setError(null);
  }, [match]);

  if (!match) return null;

  const handleSubmit = async () => {
    // --- Team composition validation ---
    // These guard against a corrupted/malformed match object rather than user input
    // (the dialog doesn't let anyone pick players) — but if any of these ever fail,
    // submitting a result would silently misattribute stats to the wrong players.
    const team1Ids = match.team1.map((p) => p.playerId);
    const team2Ids = match.team2.map((p) => p.playerId);

    if (team1Ids.length !== 2 || team2Ids.length !== 2) {
      setError("Each team needs exactly 2 players to record a result.");
      return;
    }
    if (new Set(team1Ids).size !== team1Ids.length || new Set(team2Ids).size !== team2Ids.length) {
      setError("A player appears twice on the same team — this match can't be recorded as-is.");
      return;
    }
    const overlap = team1Ids.filter((id) => team2Ids.includes(id));
    if (overlap.length > 0) {
      setError("A player is listed on both teams — this match can't be recorded as-is.");
      return;
    }

    // --- Score validation ---
    if (team1Score.trim() === "" || team2Score.trim() === "") {
      setError("Enter a score for both teams.");
      return;
    }

    const t1 = Number(team1Score);
    const t2 = Number(team2Score);
    if (!Number.isInteger(t1) || !Number.isInteger(t2) || t1 < 0 || t2 < 0) {
      setError("Scores must be whole numbers, 0 or higher.");
      return;
    }
    const winnerScore = Math.max(t1, t2);
    const margin = Math.abs(t1 - t2);
    if (margin === 0) {
      setError("Scores can't be tied — a match needs a winner.");
      return;
    }
    // Standard pickleball rules: win by at least 2, and the winner must actually
    // reach the target score (11 for a standard game) rather than just edging ahead
    // early — e.g. 11-9 is a legal finish, 6-4 isn't, and 11-10 isn't (no 2-point margin).
    // If your sessions play to 15 or 21 instead, adjust the 11 below to match.
    if (winnerScore < 11) {
      setError("The winning team needs at least 11 points to finish a game.");
      return;
    }
    if (margin < 2) {
      setError("A game must be won by at least 2 points.");
      return;
    }
    if (match.courtNumber == null) {
      setError("This match has no court number and can't be recorded.");
      return;
    }

    setSubmitting(true);
    setError(null);

    // Re-verify against the live match state right before submitting — the teams
    // shown in this dialog could be stale if someone swapped players via
    // swap-teams/swap-with-queue while this dialog was open.
    try {
      const freshMatches = await getActiveMatches(sessionId);
      const freshMatch = freshMatches.find((m) => m.matchId === match.matchId);

      if (!freshMatch) {
        setError("This match is no longer active — it may have already been recorded or removed. Close this dialog and check again.");
        setSubmitting(false);
        return;
      }

      const freshTeam1Ids = new Set(freshMatch.team1.map((p) => p.playerId));
      const freshTeam2Ids = new Set(freshMatch.team2.map((p) => p.playerId));
      const sameTeam1 = team1Ids.length === freshTeam1Ids.size && team1Ids.every((id) => freshTeam1Ids.has(id));
      const sameTeam2 = team2Ids.length === freshTeam2Ids.size && team2Ids.every((id) => freshTeam2Ids.has(id));

      if (!sameTeam1 || !sameTeam2) {
        setError("The players on this match changed since you opened this dialog. Close it and reopen to see the current lineup before recording.");
        setSubmitting(false);
        return;
      }
    } catch {
      setError("Couldn't verify the current match lineup. Please try again.");
      setSubmitting(false);
      return;
    }

    try {
      await recordMatchResult(sessionId, {
        courtNumber: match.courtNumber,
        team1PlayerIds: team1Ids,
        team2PlayerIds: team2Ids,
        team1Score: t1,
        team2Score: t2,
      });
      onRecorded();
    } catch {
      setError("Couldn't record that result. Double-check the scores and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record result — Court {match.courtNumber ?? "?"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1.5 space-y-0.5">
              {match.team1.map((p) => (
                <p key={p.playerId} className="truncate text-sm font-semibold">
                  {p.fullName}
                </p>
              ))}
            </div>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={team1Score}
              onChange={(e) => setTeam1Score(e.target.value)}
              placeholder="Score"
            />
          </div>
          <div>
            <div className="mb-1.5 space-y-0.5">
              {match.team2.map((p) => (
                <p key={p.playerId} className="truncate text-sm font-semibold">
                  {p.fullName}
                </p>
              ))}
            </div>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={team2Score}
              onChange={(e) => setTeam2Score(e.target.value)}
              placeholder="Score"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save result"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}