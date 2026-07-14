import { useEffect, useMemo, useState } from "react";
import { Loader2, Shuffle, Lock, Unlock, ArrowLeftRight, Repeat, X, Pencil } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getMySessions, getSessionPlayers, lockPair, unlockPair } from "@/services/sessions";
import {
  getQueue,
  autoMatch,
  getActiveMatches,
  benchPlayer,
  returnToQueue,
  getNextUpMatches,
  swapMatchTeams,
  swapMatchWithQueue,
} from "@/services/matches";
import type { SessionDto, SessionPlayerDto } from "@/services/sessions";
import type { QueueEntryDto, MatchDto } from "@/services/matches";



export default function QueuePage() {
  const [activeSessions, setActiveSessions] = useState<SessionDto[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [sessionPlayers, setSessionPlayers] = useState<SessionPlayerDto[]>([]);
  const [queue, setQueue] = useState<QueueEntryDto[]>([]);
  const [activeMatches, setActiveMatches] = useState<MatchDto[]>([]);
  const [nextUpMatches, setNextUpMatches] = useState<MatchDto[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingPlayerId, setPendingPlayerId] = useState<number | null>(null);
  const [autoMixing, setAutoMixing] = useState(false);
  const [lockingPlayerId, setLockingPlayerId] = useState<number | null>(null);

  // Editing a "Next Up" match
  const [editingMatch, setEditingMatch] = useState<MatchDto | null>(null);
  const [selectedForSwap, setSelectedForSwap] = useState<number | null>(null);
  const [replacingPlayerId, setReplacingPlayerId] = useState<number | null>(null);
  const [swapBusy, setSwapBusy] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  useEffect(() => {
    getMySessions()
      .then((all) => {
        const active = all.filter((s) => s.status === "Active");
        setActiveSessions(active);
        if (active.length > 0) setSelectedSessionId(active[0].sessionId);
      })
      .catch(() => setError("Couldn't load sessions."))
      .finally(() => setSessionsLoading(false));
  }, []);

  const loadSessionData = async (sessionId: number, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setInitialLoading(true);
    setError(null);
    try {
      const [players, queueData, matches, nextUp] = await Promise.all([
        getSessionPlayers(sessionId),
        getQueue(sessionId),
        getActiveMatches(sessionId),
        getNextUpMatches(sessionId),
      ]);
      setSessionPlayers(players);
      setQueue(queueData);
      setActiveMatches(matches);
      setNextUpMatches(nextUp);
    } catch {
      setError("Couldn't load the queue for this session.");
    } finally {
      if (!opts?.silent) setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId !== null) void loadSessionData(selectedSessionId);
  }, [selectedSessionId]);

  const benched = useMemo(() => sessionPlayers.filter((sp) => sp.status === "Benched"), [sessionPlayers]);

  const inMatchPlayerIds = useMemo(() => {
    const ids = new Set<number>();
    activeMatches.forEach((m) => {
      m.team1.forEach((p) => ids.add(p.playerId));
      m.team2.forEach((p) => ids.add(p.playerId));
    });
    nextUpMatches.forEach((m) => {
      m.team1.forEach((p) => ids.add(p.playerId));
      m.team2.forEach((p) => ids.add(p.playerId));
    });
    return ids;
  }, [activeMatches, nextUpMatches]);

  const inMatchPlayers = useMemo(
    () => sessionPlayers.filter((sp) => inMatchPlayerIds.has(sp.playerId)),
    [sessionPlayers, inMatchPlayerIds]
  );

  const lockedPartnerByPlayerId = useMemo(() => {
    const map = new Map<number, string>();
    sessionPlayers.forEach((sp) => {
      if (sp.lockedPartnerName) map.set(sp.playerId, sp.lockedPartnerName);
    });
    return map;
  }, [sessionPlayers]);

  const handleBench = async (playerId: number) => {
    if (!selectedSessionId) return;
    setPendingPlayerId(playerId);
    setError(null);
    try {
      await benchPlayer(selectedSessionId, { playerId, reason: "Resting" });
      await loadSessionData(selectedSessionId, { silent: true });
    } catch {
      setError("Couldn't bench that player.");
    } finally {
      setPendingPlayerId(null);
    }
  };

  const handleReturnToQueue = async (playerId: number) => {
    if (!selectedSessionId) return;
    setPendingPlayerId(playerId);
    setError(null);
    try {
      await returnToQueue(selectedSessionId, playerId);
      await loadSessionData(selectedSessionId, { silent: true });
    } catch (err) {
      const apiErr = err as { message?: string };
      setError(apiErr.message ?? "Couldn't return that player to the queue.");
    } finally {
      setPendingPlayerId(null);
    }
  };

  const handleAutoMix = async () => {
    if (!selectedSessionId) return;
    setAutoMixing(true);
    setError(null);
    try {
      await autoMatch(selectedSessionId);
      await loadSessionData(selectedSessionId, { silent: true });
    } catch {
      setError("Couldn't mix a match right now — there may not be enough players queued.");
    } finally {
      setAutoMixing(false);
    }
  };

  const handleLockClick = (playerId: number) => {
    setLockingPlayerId((current) => (current === playerId ? null : playerId));
  };

  const handlePairWith = async (partnerId: number) => {
    if (!selectedSessionId || lockingPlayerId == null) return;
    setPendingPlayerId(partnerId);
    setError(null);
    try {
      await lockPair(selectedSessionId, lockingPlayerId, partnerId);
      setLockingPlayerId(null);
      await loadSessionData(selectedSessionId, { silent: true });
    } catch {
      setError("Couldn't lock these two players. Make sure neither is benched or already paired.");
    } finally {
      setPendingPlayerId(null);
    }
  };

  const handleUnlock = async (playerId: number) => {
    if (!selectedSessionId) return;
    setPendingPlayerId(playerId);
    setError(null);
    try {
      await unlockPair(selectedSessionId, playerId);
      await loadSessionData(selectedSessionId, { silent: true });
    } catch {
      setError("Couldn't unlock that pair. Please try again.");
    } finally {
      setPendingPlayerId(null);
    }
  };

  const openEdit = (match: MatchDto) => {
    setEditingMatch(match);
    setSelectedForSwap(null);
    setReplacingPlayerId(null);
    setSwapError(null);
  };

  const closeEdit = () => {
    setEditingMatch(null);
    setSelectedForSwap(null);
    setReplacingPlayerId(null);
    setSwapError(null);
  };

  const applyUpdatedMatch = (updated: MatchDto) => {
    setEditingMatch(updated);
    setNextUpMatches((prev) => prev.map((m) => (m.matchId === updated.matchId ? updated : m)));
  };

  const handlePlayerClickForTeamSwap = async (playerId: number, teamNumber: number) => {
    if (!selectedSessionId || !editingMatch) return;
    setReplacingPlayerId(null);

    if (selectedForSwap === null) {
      setSelectedForSwap(playerId);
      return;
    }

    if (selectedForSwap === playerId) {
      setSelectedForSwap(null);
      return;
    }

    const selectedTeam = [...editingMatch.team1, ...editingMatch.team2].find((p) => p.playerId === selectedForSwap)?.teamNumber;
    if (selectedTeam === teamNumber) {
      // Same team — just move the selection instead of swapping.
      setSelectedForSwap(playerId);
      return;
    }

    setSwapBusy(true);
    setSwapError(null);
    try {
      const updated = await swapMatchTeams(selectedSessionId, editingMatch.matchId, selectedForSwap, playerId);
      applyUpdatedMatch(updated);
      setSelectedForSwap(null);
    } catch (err) {
      const apiErr = err as { message?: string };
      setSwapError(apiErr.message ?? "Couldn't swap those two players.");
    } finally {
      setSwapBusy(false);
    }
  };

  const handleReplaceFromQueue = async (candidateId: number) => {
    if (!selectedSessionId || !editingMatch || replacingPlayerId === null) return;

    setSwapBusy(true);
    setSwapError(null);
    try {
      const updated = await swapMatchWithQueue(selectedSessionId, editingMatch.matchId, replacingPlayerId, candidateId);
      applyUpdatedMatch(updated);
      setReplacingPlayerId(null);
      await loadSessionData(selectedSessionId, { silent: true });
    } catch (err) {
      const apiErr = err as { message?: string };
      setSwapError(apiErr.message ?? "Couldn't bring that player in.");
    } finally {
      setSwapBusy(false);
    }
  };

  if (sessionsLoading) {
    return (
      <AppShell>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading sessions…
        </div>
      </AppShell>
    );
  }

  if (activeSessions.length === 0) {
    return (
      <AppShell>
        <PageHeader eyebrow="Live Queue" title="Player Queue" subtitle="Manage who's up next on court." />
        <Panel className="text-center text-sm text-zinc-400">
          No active sessions right now. Start a session to build a queue.
        </Panel>
      </AppShell>
    );
  }

  const editingMatchPlayerIds = editingMatch ? [...editingMatch.team1, ...editingMatch.team2].map((p) => p.playerId) : [];
  const replaceCandidates = queue.filter((q) => !editingMatchPlayerIds.includes(q.playerId));

  return (
    <AppShell>
      <PageHeader
        eyebrow="Live Queue"
        title="Player Queue"
        subtitle="Bench, lock partners, and edit the next matches before they start."
        action={
          <Button
            onClick={handleAutoMix}
            disabled={autoMixing || queue.length < 4}
            className="shrink-0 rounded-full bg-ink text-white shadow-lg shadow-ink/20 hover:bg-zinc-800"
          >
            <Shuffle className="size-4" /> {autoMixing ? "Mixing…" : "Auto Mix"}
          </Button>
        }
      />

      {activeSessions.length > 1 && (
        <div className="mb-6 max-w-xs">
          <Select
            value={selectedSessionId ? String(selectedSessionId) : undefined}
            onValueChange={(v) => setSelectedSessionId(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a session" />
            </SelectTrigger>
            <SelectContent>
              {activeSessions.map((s) => (
                <SelectItem key={s.sessionId} value={String(s.sessionId)}>
                  {s.sessionName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {initialLoading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading queue…
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4 sm:gap-6">
          {/* Next Up — 2 real, editable prepared matches. Same card treatment as the
              live match cards on the Matches page, for visual consistency. */}
          <div className="col-span-12 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-6">
            {[0, 1].map((slot) => {
              const match = nextUpMatches[slot];
              return match ? (
                <div
                  key={slot}
                  className="relative cursor-pointer overflow-hidden rounded-[20px] bg-[#8ba668] p-4 text-white ring-1 ring-black/10 transition-transform hover:scale-[1.01]"
                >
                  <div className="relative">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Next Up</p>
                      <Button
                        size="sm"
                        onClick={() => openEdit(match)}
                        aria-label="Edit this match"
                        className="size-7 rounded-full bg-white p-0 text-zinc-900 hover:bg-zinc-100"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
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
                </div>
              ) : (
                <Panel
                  key={slot}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 bg-zinc-50 p-6 text-center"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Next Up</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {queue.length < 4 ? `Need ${4 - queue.length} more queued` : "Preparing…"}
                  </p>
                </Panel>
              );
            })}
          </div>

          <Panel className="col-span-12 lg:col-span-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-dark">Waiting</p>
            <p className="mt-2 text-5xl font-bold tabular-nums">{queue.length}</p>
            <div className="mt-6 space-y-2">
              <StatRow label="In a match" value={String(inMatchPlayers.length)} />
              <StatRow label="Benched" value={String(benched.length)} />
              <StatRow label="Active courts" value={String(activeMatches.length)} />
            </div>
          </Panel>

          <Panel className="col-span-12 lg:col-span-8">
            <h2 className="mb-4 text-sm font-semibold">Queue</h2>
            {queue.length === 0 ? (
              <p className="text-sm text-zinc-400">No one's in the queue yet.</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {queue.map((q, i) => {
                  const isPicking = lockingPlayerId !== null;
                  const isPickingThis = lockingPlayerId === q.playerId;
                  const alreadyLocked = lockedPartnerByPlayerId.has(q.playerId);
                  const isPickTarget = isPicking && !isPickingThis && !alreadyLocked;

                  return (
                    <div
                      key={q.queueId}
                      className={`grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 py-3 ${
                        isPickingThis ? "rounded-lg bg-brand-soft px-2" : ""
                      }`}
                    >
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-dark">
                        {q.position ?? i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{q.fullName}</p>
                        <p className="text-xs text-zinc-400">
                          {q.skillCategory} • Rating {Number(q.skillLevel).toFixed(1)}
                          {alreadyLocked ? ` • 🔒 with ${lockedPartnerByPlayerId.get(q.playerId)}` : ""}
                        </p>
                      </div>

                      {alreadyLocked ? (
                        <button
                          onClick={() => handleUnlock(q.playerId)}
                          disabled={pendingPlayerId === q.playerId}
                          className="grid size-8 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
                          title="Unlock pair"
                        >
                          <Unlock className="size-3.5" />
                        </button>
                      ) : isPickTarget ? (
                        <Button
                          size="sm"
                          disabled={pendingPlayerId === q.playerId}
                          onClick={() => handlePairWith(q.playerId)}
                          className="h-8 shrink-0 rounded-full px-2.5 text-xs"
                        >
                          Pair
                        </Button>
                      ) : (
                        <button
                          onClick={() => handleLockClick(q.playerId)}
                          className={`grid size-8 shrink-0 place-items-center rounded-full ${
                            isPickingThis
                              ? "bg-brand text-zinc-900"
                              : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                          }`}
                          title="Lock with a partner"
                        >
                          <Lock className="size-3.5" />
                        </button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pendingPlayerId === q.playerId}
                        onClick={() => handleBench(q.playerId)}
                        className="shrink-0 rounded-full"
                      >
                        {pendingPlayerId === q.playerId ? "…" : "Bench"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {lockingPlayerId !== null && (
              <p className="mt-2 text-xs text-zinc-400">
                Tap "Pair" on another queued player, or the lock icon again to cancel.
              </p>
            )}
          </Panel>

          <Panel className="col-span-12">
            <h2 className="mb-4 text-sm font-semibold">On the bench</h2>
            {benched.length === 0 ? (
              <p className="text-sm text-zinc-400">No one's benched.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {benched.map((sp) => (
                  <div
                    key={sp.playerId}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-zinc-50 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{sp.fullName}</p>
                      <p className="text-xs text-zinc-400">{sp.benchReason ?? "Resting"}</p>
                    </div>
                    <Button
                      size="sm"
                      disabled={pendingPlayerId === sp.playerId}
                      onClick={() => handleReturnToQueue(sp.playerId)}
                      className="shrink-0 rounded-full"
                    >
                      {pendingPlayerId === sp.playerId ? "…" : "Return to queue"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {inMatchPlayers.length > 0 && (
            <Panel className="col-span-12">
              <h2 className="mb-4 text-sm font-semibold">Players — In a Match ({inMatchPlayers.length})</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {inMatchPlayers.map((sp) => (
                  <div key={sp.playerId} className="rounded-xl px-3 py-2 ring-1 ring-zinc-100">
                    <p className="truncate text-sm font-medium">{sp.fullName}</p>
                    <p className="text-xs text-zinc-400">{sp.skillCategory}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}

      <Dialog open={!!editingMatch} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit next match</DialogTitle>
            <DialogDescription>
              Tap two players on opposite teams to swap sides, or tap <Repeat className="inline size-3" /> to bring
              in someone from the queue instead.
            </DialogDescription>
          </DialogHeader>

          {editingMatch && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((teamNumber) => (
                  <div key={teamNumber}>
                    <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Team {teamNumber}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {(teamNumber === 1 ? editingMatch.team1 : editingMatch.team2).map((p) => (
                        <div
                          key={p.playerId}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                            selectedForSwap === p.playerId ? "bg-brand-soft ring-1 ring-brand" : "bg-zinc-50"
                          }`}
                        >
                          <button
                            onClick={() => handlePlayerClickForTeamSwap(p.playerId, teamNumber)}
                            disabled={swapBusy}
                            className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm font-medium disabled:opacity-50"
                          >
                            <ArrowLeftRight className="size-3 shrink-0 text-zinc-400" />
                            <span className="truncate">{p.fullName}</span>
                          </button>
                          <button
                            onClick={() => {
                              setReplacingPlayerId(p.playerId);
                              setSelectedForSwap(null);
                            }}
                            disabled={swapBusy}
                            className={`grid size-6 shrink-0 place-items-center rounded-full disabled:opacity-50 ${
                              replacingPlayerId === p.playerId
                                ? "bg-ink text-white"
                                : "text-zinc-400 hover:bg-zinc-200"
                            }`}
                            title="Replace from queue"
                          >
                            <Repeat className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {replacingPlayerId !== null && (
                <div className="mt-4 rounded-xl bg-zinc-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Bring in from queue</p>
                    <button onClick={() => setReplacingPlayerId(null)} className="text-zinc-400 hover:text-zinc-600">
                      <X className="size-3.5" />
                    </button>
                  </div>
                  {replaceCandidates.length === 0 ? (
                    <p className="text-sm text-zinc-400">No one else is waiting in the queue.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {replaceCandidates.map((c) => (
                        <button
                          key={c.queueId}
                          disabled={swapBusy}
                          onClick={() => handleReplaceFromQueue(c.playerId)}
                          className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100 disabled:opacity-50"
                        >
                          {c.fullName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {swapError && <p className="mt-3 text-sm text-red-500">{swapError}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2">
      <p className="truncate text-xs text-zinc-500">{label}</p>
      <p className="shrink-0 text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}