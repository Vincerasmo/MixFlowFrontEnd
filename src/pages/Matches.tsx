import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Shuffle, ArrowLeftRight, History } from "lucide-react";
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
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scoringMatch, setScoringMatch] = useState<MatchDto | null>(null);
  const [busyCourt, setBusyCourt] = useState<number | null>(null);

  // Swapping two players between teams on a live (in-progress) match
  const [swappingMatch, setSwappingMatch] = useState<MatchDto | null>(null);
  const [selectedForSwap, setSelectedForSwap] = useState<number | null>(null);
  const [swapBusy, setSwapBusy] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

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
        // (queue/next-up/active are meaningless once a session is over).
        const completed = await getCompletedMatches(sessionId);
        setCompletedMatches(completed);
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

          <div className="mt-6">
            <Panel>
              <h2 className="mb-4 text-sm font-semibold">
                <History className="mr-1.5 inline size-4 text-zinc-400" />
                {isLive ? "Recent results" : "Final results"}
              </h2>
              {completedMatches.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  {isLive ? "No completed matches yet this session." : "No matches were recorded in this session."}
                </p>
              ) : (
                <div className="max-h-96 divide-y divide-zinc-100 overflow-y-auto">
                  {completedMatches.map((m) => (
                    <div
                      key={m.matchId}
                      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-3"
                    >
                      <p className="truncate text-right text-sm font-semibold">
                        {m.team1.map((p) => p.fullName).join(" / ")}
                      </p>
                      <span className="shrink-0 rounded-lg bg-brand-soft px-3 py-1 text-sm font-bold tabular-nums text-brand-dark">
                        {m.team1Score ?? 0}-{m.team2Score ?? 0}
                      </span>
                      <p className="truncate text-sm font-semibold text-zinc-500">
                        {m.team2.map((p) => p.fullName).join(" / ")}
                      </p>
                    </div>
                  ))}
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
    const t1 = Number(team1Score);
    const t2 = Number(team2Score);
    if (!Number.isFinite(t1) || !Number.isFinite(t2) || t1 < 0 || t2 < 0) {
      setError("Enter a valid, non-negative score for both teams.");
      return;
    }
    if (match.courtNumber == null) {
      setError("This match has no court number and can't be recorded.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await recordMatchResult(sessionId, {
        courtNumber: match.courtNumber,
        team1PlayerIds: match.team1.map((p) => p.playerId),
        team2PlayerIds: match.team2.map((p) => p.playerId),
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
            <p className="mb-1 truncate text-sm font-semibold">
              {match.team1.map((p) => p.fullName).join(" / ")}
            </p>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={team1Score}
              onChange={(e) => setTeam1Score(e.target.value)}
              placeholder="Score"
            />
          </div>
          <div>
            <p className="mb-1 truncate text-sm font-semibold">
              {match.team2.map((p) => p.fullName).join(" / ")}
            </p>
            <Input
              type="number"
              min={0}
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