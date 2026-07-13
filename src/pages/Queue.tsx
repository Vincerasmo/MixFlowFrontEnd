import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Users, Lock, Unlock, Swords } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { getMySessions, getSessionPlayers, lockPair, unlockPair } from "@/services/sessions";
import {
  getQueue,
  enqueuePlayer,
  autoMatch,
  getActiveMatches,
  benchPlayer,
  returnToQueue,
  manualMixCourt,
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
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingPlayerId, setPendingPlayerId] = useState<number | null>(null);
  const [autoMixing, setAutoMixing] = useState(false);

  // Lock-pair flow: pick a player, then pick who to pair them with.
  const [lockingPlayerId, setLockingPlayerId] = useState<number | null>(null);

  const [manualMatchOpen, setManualMatchOpen] = useState(false);

  const selectedSession = useMemo(
    () => activeSessions.find((s) => s.sessionId === selectedSessionId) ?? null,
    [activeSessions, selectedSessionId],
  );

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

  // `silent` skips the loading spinner — used after actions so the list updates
  // in place instead of the whole panel blanking out and reappearing.
  const loadSessionData = async (sessionId: number, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setInitialLoading(true);
    setError(null);
    try {
      const [players, queueData, matches] = await Promise.all([
        getSessionPlayers(sessionId),
        getQueue(sessionId),
        getActiveMatches(sessionId),
      ]);
      setSessionPlayers(players);
      setQueue(queueData);
      setActiveMatches(matches);
    } catch {
      setError("Couldn't load the queue for this session.");
    } finally {
      if (!opts?.silent) setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId !== null) void loadSessionData(selectedSessionId);
  }, [selectedSessionId]);

  // Players currently on a court, derived from the active matches themselves — this is
  // the only reliable source, since a player mid-match has no "Waiting" queue entry.
  const inMatchPlayerIds = useMemo(() => {
    const ids = new Set<number>();
    activeMatches.forEach((m) => {
      m.team1.forEach((p) => ids.add(p.playerId));
      m.team2.forEach((p) => ids.add(p.playerId));
    });
    return ids;
  }, [activeMatches]);

  const courtByPlayerId = useMemo(() => {
    const map = new Map<number, number>();
    activeMatches.forEach((m) => {
      if (m.courtNumber == null) return;
      [...m.team1, ...m.team2].forEach((p) => map.set(p.playerId, m.courtNumber!));
    });
    return map;
  }, [activeMatches]);

  const benched = useMemo(() => sessionPlayers.filter((sp) => sp.status === "Benched"), [sessionPlayers]);

  const inMatchPlayers = useMemo(
    () => sessionPlayers.filter((sp) => inMatchPlayerIds.has(sp.playerId)),
    [sessionPlayers, inMatchPlayerIds],
  );

  // 🐛 FIX: this used to only exclude players already in the Waiting queue, so anyone
  // currently ON COURT (no Waiting entry, since they're "InMatch") wrongly showed up
  // here with an "Add to queue" button, even mid-game. Now also excludes in-match players.
  const availableToQueue = useMemo(() => {
    const queuedIds = new Set(queue.map((q) => q.playerId));
    return sessionPlayers.filter(
      (sp) => sp.status === "CheckedIn" && !queuedIds.has(sp.playerId) && !inMatchPlayerIds.has(sp.playerId),
    );
  }, [sessionPlayers, queue, inMatchPlayerIds]);

  const sessionPlayerByPlayerId = useMemo(() => {
    const map = new Map<number, SessionPlayerDto>();
    sessionPlayers.forEach((sp) => map.set(sp.playerId, sp));
    return map;
  }, [sessionPlayers]);

  const upNext = queue.slice(0, 4);

  const handleEnqueue = async (playerId: number) => {
    if (!selectedSessionId) return;
    setPendingPlayerId(playerId);
    setError(null);
    try {
      await enqueuePlayer(selectedSessionId, playerId);
      await loadSessionData(selectedSessionId, { silent: true });
    } catch {
      setError("Couldn't add that player to the queue.");
    } finally {
      setPendingPlayerId(null);
    }
  };

  // Benching now replaces "remove" as the queue's only exit action — the backend
  // already pulls a benched player out of the queue in the same transaction.
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

  const handleSmartMix = async () => {
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

  const idleCourts = useMemo(() => {
    if (!selectedSession) return [];
    const occupied = new Set(activeMatches.map((m) => m.courtNumber).filter((c): c is number => c != null));
    return Array.from({ length: selectedSession.numberOfCourts }, (_, i) => i + 1).filter((c) => !occupied.has(c));
  }, [selectedSession, activeMatches]);

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

  return (
    <AppShell>
      <PageHeader
        eyebrow="Live Queue"
        title="Player Queue"
        subtitle="Mix pairs by skill, priority, and locked partners."
        action={
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              disabled={idleCourts.length === 0 || queue.length < 4}
              onClick={() => setManualMatchOpen(true)}
              className="rounded-full"
            >
              <Swords className="size-4" /> Manual Match
            </Button>
            <Button
              onClick={handleSmartMix}
              disabled={autoMixing || queue.length < 4}
              className="rounded-full bg-ink text-white shadow-lg shadow-ink/20 hover:bg-zinc-800"
            >
              <Sparkles className="size-4" /> {autoMixing ? "Mixing…" : "Smart Mix"}
            </Button>
          </div>
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
          {/* Up Next — large hero card */}
          <Panel className="court-lines relative col-span-12 overflow-hidden bg-linear-to-r from-brand to-brand-dark text-white lg:col-span-8">
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Up Next</p>
              {upNext.length === 0 ? (
                <p className="mt-4 text-sm text-white/80">No one's in the queue yet.</p>
              ) : upNext.length < 4 ? (
                <>
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                    {upNext.map((q) => (
                      <p key={q.queueId} className="text-lg font-bold">
                        {q.fullName}
                      </p>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-white/80">
                    Need {4 - upNext.length} more queued before this becomes a match.
                  </p>
                </>
              ) : (
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <div>
                    <p className="truncate text-base font-bold sm:text-lg">{upNext[0].fullName}</p>
                    <p className="truncate text-base font-bold sm:text-lg">{upNext[1].fullName}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">vs</p>
                    <div className="mx-auto mt-1 size-8 rounded-full border-2 border-dashed border-white/40" />
                  </div>
                  <div className="text-right">
                    <p className="truncate text-base font-bold sm:text-lg">{upNext[2].fullName}</p>
                    <p className="truncate text-base font-bold sm:text-lg">{upNext[3].fullName}</p>
                  </div>
                </div>
              )}
            </div>
          </Panel>

          <Panel className="col-span-12 lg:col-span-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-dark">Waiting</p>
            <p className="mt-2 text-5xl font-bold tabular-nums">{queue.length}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {queue.length < 4 ? `Need ${4 - queue.length} more to mix` : "Ready to mix"}
            </p>
            <div className="mt-6 space-y-2">
              <StatRow label="Available" value={String(availableToQueue.length)} />
              <StatRow label="In match" value={String(inMatchPlayers.length)} />
              <StatRow label="Benched" value={String(benched.length)} />
            </div>
          </Panel>

          {/* Queue + Bench, side by side */}
          <Panel className="col-span-12 lg:col-span-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">Queue</h2>
            {queue.length === 0 ? (
              <p className="text-sm text-zinc-400">No one's in the queue yet — add players below.</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {queue.map((q, i) => {
                  const sp = sessionPlayerByPlayerId.get(q.playerId);
                  const isPicking = lockingPlayerId !== null;
                  const isPickingThis = lockingPlayerId === q.playerId;
                  const isPickTarget = isPicking && !isPickingThis && !sp?.lockedPartnerId;

                  return (
                    <div key={q.queueId} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 py-3">
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-dark">
                        {q.position ?? i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{q.fullName}</p>
                        <p className="text-xs text-zinc-400">
                          {q.skillCategory} • Rating {Number(q.skillLevel).toFixed(1)}
                          {sp?.lockedPartnerName ? ` • 🔒 with ${sp.lockedPartnerName}` : ""}
                        </p>
                      </div>

                      {sp?.lockedPartnerId ? (
                        <button
                          onClick={() => handleUnlock(q.playerId)}
                          disabled={pendingPlayerId === q.playerId}
                          className="grid size-8 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
                          aria-label={`Unlock ${q.fullName}`}
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
                          Pair here
                        </Button>
                      ) : (
                        <button
                          onClick={() => handleLockClick(q.playerId)}
                          className={`grid size-8 shrink-0 place-items-center rounded-full ${
                            isPickingThis
                              ? "bg-brand text-zinc-900"
                              : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                          }`}
                          aria-label={`Lock ${q.fullName} with a partner`}
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
                Pick who to pair them with, or click the lock icon again to cancel.
              </p>
            )}
          </Panel>

          <Panel className="col-span-12 lg:col-span-6">
            <h2 className="mb-4 text-sm font-semibold">On the bench</h2>
            {benched.length === 0 ? (
              <p className="text-sm text-zinc-400">No one's benched.</p>
            ) : (
              <div className="space-y-3">
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

          {/* Players currently on court — informational, no action. This used to be
              lumped into "checked in, not queued" below, which was misleading since
              these players are busy playing, not idle. */}
          {inMatchPlayers.length > 0 && (
            <Panel className="col-span-12">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Swords className="size-4" /> In Match — Players ({inMatchPlayers.length})
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {inMatchPlayers.map((sp) => (
                  <div
                    key={sp.playerId}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{sp.fullName}</p>
                      <p className="text-xs text-zinc-400">{sp.skillCategory}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase text-brand-dark">
                      Court {courtByPlayerId.get(sp.playerId) ?? "?"}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {availableToQueue.length > 0 && (
            <Panel className="col-span-12">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Users className="size-4" /> Checked in — Available ({availableToQueue.length})
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {availableToQueue.map((sp) => (
                  <div
                    key={sp.playerId}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-zinc-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{sp.fullName}</p>
                      <p className="text-xs text-zinc-400">{sp.skillCategory}</p>
                    </div>
                    <Button
                      size="sm"
                      disabled={pendingPlayerId === sp.playerId}
                      onClick={() => handleEnqueue(sp.playerId)}
                      className="shrink-0 rounded-full"
                    >
                      {pendingPlayerId === sp.playerId ? "…" : "Add to queue"}
                    </Button>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}

      {selectedSessionId && (
        <ManualMatchDialog
          open={manualMatchOpen}
          sessionId={selectedSessionId}
          queue={queue}
          idleCourts={idleCourts}
          onClose={() => setManualMatchOpen(false)}
          onCreated={() => {
            setManualMatchOpen(false);
            void loadSessionData(selectedSessionId, { silent: true });
          }}
        />
      )}
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

function ManualMatchDialog({
  open,
  sessionId,
  queue,
  idleCourts,
  onClose,
  onCreated,
}: {
  open: boolean;
  sessionId: number;
  queue: QueueEntryDto[];
  idleCourts: number[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [courtNumber, setCourtNumber] = useState<number | null>(null);
  const [team1, setTeam1] = useState<number[]>([]);
  const [team2, setTeam2] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCourtNumber(idleCourts[0] ?? null);
      setTeam1([]);
      setTeam2([]);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cyclePlayer = (playerId: number) => {
    if (team1.includes(playerId)) {
      setTeam1((t) => t.filter((id) => id !== playerId));
      if (team2.length < 2) setTeam2((t) => [...t, playerId]);
      return;
    }
    if (team2.includes(playerId)) {
      setTeam2((t) => t.filter((id) => id !== playerId));
      return;
    }
    if (team1.length < 2) {
      setTeam1((t) => [...t, playerId]);
    }
  };

  const nameFor = (id: number) => queue.find((q) => q.playerId === id)?.fullName ?? "";

  const handleSubmit = async () => {
    if (courtNumber === null) {
      setError("Pick a court for this match.");
      return;
    }
    if (team1.length !== 2 || team2.length !== 2) {
      setError("Pick exactly 2 players for each team.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await manualMixCourt(sessionId, courtNumber, [
        { playerId: team1[0], partnerId: team1[1] },
        { playerId: team2[0], partnerId: team2[1] },
      ]);
      onCreated();
    } catch (err) {
      const apiErr = err as { message?: string };
      setError(apiErr.message ?? "Couldn't create that match. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manual Match</DialogTitle>
          <DialogDescription>Pick a court, then tap players to build Team 1, then Team 2.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Court</p>
          <Select
            value={courtNumber ? String(courtNumber) : undefined}
            onValueChange={(v) => setCourtNumber(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an open court" />
            </SelectTrigger>
            <SelectContent>
              {idleCourts.map((c) => (
                <SelectItem key={c} value={String(c)}>
                  Court {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <p>Team 1 ({team1.length}/2){team1.map((id) => ` • ${nameFor(id)}`)}</p>
          <p>Team 2 ({team2.length}/2){team2.map((id) => ` • ${nameFor(id)}`)}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          {queue.map((q) => {
            const inTeam1 = team1.includes(q.playerId);
            const inTeam2 = team2.includes(q.playerId);
            return (
              <button
                key={q.queueId}
                type="button"
                onClick={() => cyclePlayer(q.playerId)}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                  inTeam1
                    ? "bg-brand text-zinc-900"
                    : inTeam2
                      ? "bg-ink text-white"
                      : "bg-zinc-50 hover:bg-zinc-100"
                }`}
              >
                <span className="font-medium">{q.fullName}</span>
                <span className="text-xs opacity-70">
                  {inTeam1 ? "Team 1" : inTeam2 ? "Team 2" : q.skillCategory}
                </span>
              </button>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Creating…" : "Create match"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}