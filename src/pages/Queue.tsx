import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  DialogFooter,
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
  const [searchParams] = useSearchParams();

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

  // Pair-picker dialog: tap up to two players to highlight/select them (from any of
  // the 4 categories), then tap the confirm button to actually lock them together.
  // Triggered by one button next to the Queue panel, instead of a lock icon on every
  // individual player row.
  const [pairDialogOpen, setPairDialogOpen] = useState(false);
  const [selectedPairIds, setSelectedPairIds] = useState<number[]>([]);
  const [pairBlockedMessage, setPairBlockedMessage] = useState<string | null>(null);

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

        const requestedId = Number(searchParams.get("sessionId"));
        const requestedSession = active.find((s) => s.sessionId === requestedId);

        if (requestedSession) {
          setSelectedSessionId(requestedSession.sessionId);
        } else if (active.length > 0) {
          setSelectedSessionId(active[0].sessionId);
        }
      })
      .catch(() => setError("Couldn't load sessions."))
      .finally(() => setSessionsLoading(false));
  }, [searchParams]);

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
    return ids;
  }, [activeMatches]);

  // Separate from inMatchPlayerIds on purpose — a player slotted into a "Next Up"
  // match hasn't actually started playing yet, so lumping them in with players who
  // are genuinely mid-match was misleading (an organizer skimming the list could think
  // a court had already finished when really it was just reserved for later).
  const nextUpPlayerIds = useMemo(() => {
    const ids = new Set<number>();
    nextUpMatches.forEach((m) => {
      m.team1.forEach((p) => ids.add(p.playerId));
      m.team2.forEach((p) => ids.add(p.playerId));
    });
    return ids;
  }, [nextUpMatches]);

  const inMatchPlayers = useMemo(
    () => sessionPlayers.filter((sp) => inMatchPlayerIds.has(sp.playerId)),
    [sessionPlayers, inMatchPlayerIds]
  );

  const reservedNextUpPlayers = useMemo(
    () => sessionPlayers.filter((sp) => nextUpPlayerIds.has(sp.playerId)),
    [sessionPlayers, nextUpPlayerIds]
  );

  // Split out of reservedNextUpPlayers specifically for the two display cards below —
  // "Next Up" is nextUpMatches[0] (fills the very next open court), "On Deck" is
  // nextUpMatches[1] (fills the court after that). reservedNextUpPlayers itself stays
  // as the combined set since the lock-pairing selector below still wants both together.
  const nextUpCardPlayers = useMemo(() => {
    const ids = new Set<number>();
    const m = nextUpMatches[0];
    if (m) {
      m.team1.forEach((p) => ids.add(p.playerId));
      m.team2.forEach((p) => ids.add(p.playerId));
    }
    return sessionPlayers.filter((sp) => ids.has(sp.playerId));
  }, [nextUpMatches, sessionPlayers]);

  const onDeckCardPlayers = useMemo(() => {
    const ids = new Set<number>();
    const m = nextUpMatches[1];
    if (m) {
      m.team1.forEach((p) => ids.add(p.playerId));
      m.team2.forEach((p) => ids.add(p.playerId));
    }
    return sessionPlayers.filter((sp) => ids.has(sp.playerId));
  }, [nextUpMatches, sessionPlayers]);

  const lockedPartnerByPlayerId = useMemo(() => {
    const map = new Map<number, string>();
    sessionPlayers.forEach((sp) => {
      if (sp.lockedPartnerName) map.set(sp.playerId, sp.lockedPartnerName);
    });
    return map;
  }, [sessionPlayers]);

  // Every non-benched player, sorted into exactly one of 4 buckets: whichever they're
  // already locked to someone goes to "alreadyPaired" regardless of where they
  // currently are; otherwise they land in whichever of the other 3 lists they're
  // actually in right now.
  const pairCategories = useMemo(() => {
    const bucketOf = new Map<number, "inMatch" | "nextUp" | "queue">();
    inMatchPlayers.forEach((sp) => bucketOf.set(sp.playerId, "inMatch"));
    reservedNextUpPlayers.forEach((sp) => bucketOf.set(sp.playerId, "nextUp"));
    queue.forEach((q) => {
      if (!bucketOf.has(q.playerId)) bucketOf.set(q.playerId, "queue");
    });

    const result: {
      inMatch: { playerId: number; fullName: string }[];
      nextUp: { playerId: number; fullName: string }[];
      queue: { playerId: number; fullName: string }[];
      alreadyPaired: { playerId: number; fullName: string; partnerName: string }[];
    } = { inMatch: [], nextUp: [], queue: [], alreadyPaired: [] };

    sessionPlayers.forEach((sp) => {
      if (sp.status === "Benched") return;
      const bucket = bucketOf.get(sp.playerId);
      if (!bucket) return;

      if (sp.lockedPartnerName) {
        result.alreadyPaired.push({ playerId: sp.playerId, fullName: sp.fullName, partnerName: sp.lockedPartnerName });
      } else {
        result[bucket].push({ playerId: sp.playerId, fullName: sp.fullName });
      }
    });

    return result;
  }, [sessionPlayers, inMatchPlayers, reservedNextUpPlayers, queue]);

  const nameByPlayerId = useMemo(() => {
    const map = new Map<number, string>();
    sessionPlayers.forEach((sp) => map.set(sp.playerId, sp.fullName));
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

  const openPairDialog = () => {
    setPairDialogOpen(true);
    setSelectedPairIds([]);
    setPairBlockedMessage(null);
    setError(null);
  };

  const closePairDialog = () => {
    setPairDialogOpen(false);
    setSelectedPairIds([]);
    setPairBlockedMessage(null);
  };

  // Tapping a player toggles their selection. With 2 already selected, tapping a third
  // (unselected) player swaps out whichever of the two was picked first — so you can
  // just keep tapping to change your mind instead of having to deselect explicitly.
  const handleTogglePairSelection = (playerId: number) => {
    setPairBlockedMessage(null);
    setSelectedPairIds((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId);
      if (current.length >= 2) return [current[1], playerId];
      return [...current, playerId];
    });
  };

  // Clicking someone in the "Already Paired" bucket never selects them — they can't be
  // paired again without being unpaired first, so this just explains why instead of
  // silently doing nothing.
  const handleClickAlreadyPaired = (fullName: string, partnerName: string) => {
    setPairBlockedMessage(`${fullName} is already paired with ${partnerName}. Unpair them first if you want to change their partner.`);
  };

  const handleConfirmPair = async () => {
    if (!selectedSessionId || selectedPairIds.length !== 2) return;
    const [firstId, secondId] = selectedPairIds;
    setPendingPlayerId(secondId);
    setError(null);
    try {
      await lockPair(selectedSessionId, firstId, secondId);
      closePairDialog();
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

  // Still shown per-row — unpairing is a simple single-player action, so there's no
  // need to send it through the pair-picker dialog. Only renders for players who are
  // already locked; pairing itself now only happens through the dialog.
  const renderUnlockControl = (playerId: number) => {
    if (!lockedPartnerByPlayerId.has(playerId)) return null;

    return (
      <button
        onClick={() => handleUnlock(playerId)}
        disabled={pendingPlayerId === playerId}
        className="grid size-8 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
        title="Unlock pair"
      >
        <Unlock className="size-3.5" />
      </button>
    );
  };

  const IN_MATCH_PAIR_NOTE =
    "Pairing with someone who's mid-match takes effect starting their next match — it won't change the match they're currently playing.";

  const renderPairCategory = (
    title: string,
    items: { playerId: number; fullName: string }[],
    selectedIds: number[],
    onToggle: (playerId: number) => void,
    note?: string
  ) => {
    if (items.length === 0) return null;
    return (
      <div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
          {title} ({items.length})
        </p>
        {note && <p className="mb-1.5 text-xs text-zinc-500">{note}</p>}
        <div className="flex max-h-40 flex-col gap-1 overflow-y-auto pr-1">
          {items.map((p) => {
            const selected = selectedIds.includes(p.playerId);
            return (
              <button
                key={p.playerId}
                disabled={pendingPlayerId === p.playerId}
                onClick={() => onToggle(p.playerId)}
                className={`w-full shrink-0 truncate rounded-xl px-3 py-2 text-left text-sm font-medium disabled:opacity-50 ${
                  selected ? "bg-brand text-zinc-900" : "hover:bg-brand-soft"
                }`}
              >
                {p.fullName}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAlreadyPairedCategory = (items: { playerId: number; fullName: string; partnerName: string }[]) => {
    if (items.length === 0) return null;
    return (
      <div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
          Already Paired ({items.length})
        </p>
        <div className="flex max-h-40 flex-col gap-1 overflow-y-auto pr-1">
          {items.map((p) => (
            <button
              key={p.playerId}
              onClick={() => handleClickAlreadyPaired(p.fullName, p.partnerName)}
              className="flex w-full shrink-0 items-center justify-between gap-2 truncate rounded-xl bg-zinc-50 px-3 py-2 text-left text-sm font-medium text-zinc-400"
            >
              <span className="truncate">{p.fullName}</span>
              <span className="shrink-0 text-xs font-normal">🔒 {p.partnerName}</span>
            </button>
          ))}
        </div>
      </div>
    );
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
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-white">
                        {slot === 0 ? "Next Up" : "On Deck"}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => openEdit(match)}
                        aria-label="Edit this match"
                        className="size-7 rounded-full bg-white p-0 text-zinc-900 hover:bg-zinc-100"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
                    <p className="mb-3 text-[10px] font-semibold text-white/70">
                      {slot === 0
                        ? "Fills the very next court that opens up"
                        : "Fills the court after that"}
                    </p>
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
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    {slot === 0 ? "Next Up" : "On Deck"}
                  </p>
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
              <StatRow label="Total players in session" value={String(sessionPlayers.length)} />
              <StatRow label="Next up match players" value={String(nextUpPlayerIds.size)} />
              <StatRow label="In a match" value={String(inMatchPlayers.length)} />
              <StatRow label="Benched" value={String(benched.length)} />
              <StatRow label="Active courts" value={String(activeMatches.length)} />
            </div>
          </Panel>

          <Panel className="col-span-12 lg:col-span-8">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Queue</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={openPairDialog}
                className="shrink-0 gap-1.5 rounded-full"
              >
                <Lock className="size-3.5" /> Pair Players
              </Button>
            </div>
            {queue.length === 0 ? (
              <p className="text-sm text-zinc-400">No one's in the queue yet.</p>
            ) : (
              <div className="max-h-96 divide-y divide-zinc-100 overflow-y-auto">
                {queue.map((q, i) => {
                  const alreadyLocked = lockedPartnerByPlayerId.has(q.playerId);

                  return (
                    <div
                      key={q.queueId}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 py-3"
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

                      {renderUnlockControl(q.playerId)}

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
          </Panel>

          <Panel className="col-span-12 lg:col-span-3">
            <h2 className="mb-4 text-sm font-semibold">On the bench</h2>
            {benched.length === 0 ? (
              <p className="text-sm text-zinc-400">No one's benched.</p>
            ) : (
              <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
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
            <Panel className="col-span-12 lg:col-span-3">
              <h2 className="mb-4 text-sm font-semibold">In a Match ({inMatchPlayers.length})</h2>
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {inMatchPlayers.map((sp) => (
                  <div
                    key={sp.playerId}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-3 py-2 ring-1 ring-zinc-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{sp.fullName}</p>
                      <p className="text-xs text-zinc-400">
                        {sp.skillCategory}
                        {lockedPartnerByPlayerId.has(sp.playerId) ? ` • 🔒 with ${lockedPartnerByPlayerId.get(sp.playerId)}` : ""}
                      </p>
                    </div>
                    {renderUnlockControl(sp.playerId)}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {nextUpCardPlayers.length > 0 && (
            <Panel className="col-span-12 lg:col-span-3">
              <h2 className="mb-4 text-sm font-semibold">Next Up ({nextUpCardPlayers.length})</h2>
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {nextUpCardPlayers.map((sp) => (
                  <div
                    key={sp.playerId}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-3 py-2 ring-1 ring-zinc-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{sp.fullName}</p>
                      <p className="text-xs text-zinc-400">
                        {sp.skillCategory}
                        {lockedPartnerByPlayerId.has(sp.playerId) ? ` • 🔒 with ${lockedPartnerByPlayerId.get(sp.playerId)}` : ""}
                      </p>
                    </div>
                    {renderUnlockControl(sp.playerId)}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {onDeckCardPlayers.length > 0 && (
            <Panel className="col-span-12 lg:col-span-3">
              <h2 className="mb-4 text-sm font-semibold">On Deck ({onDeckCardPlayers.length})</h2>
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {onDeckCardPlayers.map((sp) => (
                  <div
                    key={sp.playerId}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-3 py-2 ring-1 ring-zinc-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{sp.fullName}</p>
                      <p className="text-xs text-zinc-400">
                        {sp.skillCategory}
                        {lockedPartnerByPlayerId.has(sp.playerId) ? ` • 🔒 with ${lockedPartnerByPlayerId.get(sp.playerId)}` : ""}
                      </p>
                    </div>
                    {renderUnlockControl(sp.playerId)}
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

      <Dialog open={pairDialogOpen} onOpenChange={(o) => !o && closePairDialog()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pair two players</DialogTitle>
            <DialogDescription>
              Tap two players below to select them, then confirm to lock them together as a fixed doubles pair for
              the rest of this session.
            </DialogDescription>
          </DialogHeader>

          {pairBlockedMessage && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{pairBlockedMessage}</p>
          )}

          <div className="space-y-4">
            {renderPairCategory("In Match", pairCategories.inMatch, selectedPairIds, handleTogglePairSelection, IN_MATCH_PAIR_NOTE)}
            {renderPairCategory("Next Up", pairCategories.nextUp, selectedPairIds, handleTogglePairSelection)}
            {renderPairCategory("Queue", pairCategories.queue, selectedPairIds, handleTogglePairSelection)}
            {renderAlreadyPairedCategory(pairCategories.alreadyPaired)}

            {pairCategories.inMatch.length === 0 &&
              pairCategories.nextUp.length === 0 &&
              pairCategories.queue.length === 0 &&
              pairCategories.alreadyPaired.length === 0 && (
                <p className="py-4 text-center text-sm text-zinc-400">No players available right now.</p>
              )}
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button
              disabled={selectedPairIds.length !== 2 || pendingPlayerId !== null}
              onClick={handleConfirmPair}
              className="w-full rounded-full sm:w-auto"
            >
              {selectedPairIds.length === 2
                ? `Pair ${nameByPlayerId.get(selectedPairIds[0])} & ${nameByPlayerId.get(selectedPairIds[1])}`
                : `Select ${2 - selectedPairIds.length} more player${2 - selectedPairIds.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
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