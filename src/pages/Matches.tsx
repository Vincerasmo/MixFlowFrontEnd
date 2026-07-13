import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Shuffle, Swords } from "lucide-react";
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
import { getActiveSession, getSessionPlayers } from "@/services/sessions";
import {
  getActiveMatches,
  getCompletedMatches,
  recordMatchResult,
  smartMixCourt,
  manualMixCourt,
  getQueue,
} from "@/services/matches";
import type { SessionDto, SessionPlayerDto } from "@/services/sessions";
import type { MatchDto, QueueEntryDto } from "@/services/matches";

// The card body now always renders as a pickleball court (green surround, blue court,
// light-blue kitchen, black net line) so multiple courts stay distinguishable by their
// "Court N" badge color rather than the whole card changing theme.
const COURT_ACCENTS = ["bg-amber-500", "bg-indigo-500", "bg-rose-500", "bg-emerald-500", "bg-sky-500", "bg-fuchsia-500"];

function courtAccent(courtNumber: number) {
  return COURT_ACCENTS[(courtNumber - 1) % COURT_ACCENTS.length];
}

// Fixed pixel width per court card, so the wrapper width below can force exact
// row-counts (1 centered / 2 side-by-side / 3 side-by-side / 2x2 for 4+).
const CARD_WIDTH = 340;
const GAP = 24;

function wrapperMaxWidth(courtCount: number) {
  if (courtCount <= 1) return CARD_WIDTH;
  if (courtCount === 2) return CARD_WIDTH * 2 + GAP;
  if (courtCount === 3) return CARD_WIDTH * 3 + GAP * 2;
  return CARD_WIDTH * 2 + GAP; // 4+: force exactly 2 per row
}

// 🐛 FIX: the "Next Up" preview used to be a naive `queue.slice(i*4, i*4+4)` — it had no
// idea two players were locked together, so a locked pair could get split across two
// different preview groups even though the backend would correctly keep them together
// once Smart Mix actually ran. This mirrors the backend's PickFourForNextCourt exactly:
// a locked pair is one atomic 2-slot unit, taken in full or skipped, never split — so
// what the organizer sees in the preview always matches what Smart Mix will produce.
function buildCourtPreviews(
  queue: QueueEntryDto[],
  lockedPartnerByPlayerId: Map<number, number>,
  courtCount: number,
): QueueEntryDto[][] {
  const remaining = [...queue];
  const groups: QueueEntryDto[][] = [];

  for (let c = 0; c < courtCount; c++) {
    const selected: QueueEntryDto[] = [];
    const consumed = new Set<number>();

    for (const entry of remaining) {
      if (selected.length >= 4) break;
      if (consumed.has(entry.playerId)) continue;

      const partnerId = lockedPartnerByPlayerId.get(entry.playerId);
      const partnerEntry = partnerId != null ? remaining.find((q) => q.playerId === partnerId) : undefined;
      const partnerAvailable = partnerEntry != null && !consumed.has(partnerEntry.playerId);

      if (partnerId != null && partnerAvailable) {
        if (selected.length + 2 <= 4) {
          selected.push(entry, partnerEntry!);
          consumed.add(entry.playerId);
          consumed.add(partnerEntry!.playerId);
        }
        continue;
      }

      selected.push(entry);
      consumed.add(entry.playerId);
    }

    for (const s of selected) {
      const idx = remaining.findIndex((q) => q.playerId === s.playerId);
      if (idx !== -1) remaining.splice(idx, 1);
    }

    groups.push(selected);
  }

  return groups;
}

export default function MatchesPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionDto | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [activeMatches, setActiveMatches] = useState<MatchDto[]>([]);
  const [completedMatches, setCompletedMatches] = useState<MatchDto[]>([]);
  const [queue, setQueue] = useState<QueueEntryDto[]>([]);
  const [sessionPlayers, setSessionPlayers] = useState<SessionPlayerDto[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scoringMatch, setScoringMatch] = useState<MatchDto | null>(null);
  const [manualMixCourtNumber, setManualMixCourtNumber] = useState<number | null>(null);
  const [busyCourt, setBusyCourt] = useState<number | null>(null);

  useEffect(() => {
    getActiveSession()
      .then(setSession)
      .catch(() => setError("Couldn't load your active session."))
      .finally(() => setSessionLoading(false));
  }, []);

  const loadMatches = async (sessionId: number, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setDataLoading(true);
    setError(null);
    try {
      const [active, completed, queueData, players] = await Promise.all([
        getActiveMatches(sessionId),
        getCompletedMatches(sessionId),
        getQueue(sessionId),
        getSessionPlayers(sessionId),
      ]);
      setActiveMatches(active);
      setCompletedMatches(completed);
      setQueue(queueData);
      setSessionPlayers(players);
    } catch {
      setError("Couldn't load matches for this session.");
    } finally {
      if (!opts?.silent) setDataLoading(false);
    }
  };

  useEffect(() => {
    if (session) void loadMatches(session.sessionId);
  }, [session]);

  // This is the ACTUAL smart-mix — picks 4 players off the priority-ordered queue
  // (honoring locked pairs) and immediately starts a real match on this court.
  const handleSmartMix = async (courtNumber: number) => {
    if (!session) return;
    setBusyCourt(courtNumber);
    setError(null);
    try {
      await smartMixCourt(session.sessionId, courtNumber);
      await loadMatches(session.sessionId, { silent: true });
    } catch (err) {
      const apiErr = err as { message?: string };
      setError(apiErr.message ?? "Couldn't fill this court — there may not be enough players queued.");
    } finally {
      setBusyCourt(null);
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

  if (!session) {
    return (
      <AppShell>
        <PageHeader eyebrow="Live scoreboard" title="Matches" subtitle="No active session right now." />
        <Panel className="text-center text-sm text-zinc-400">
          Start a session to see live courts and match results here.
        </Panel>
      </AppShell>
    );
  }

  const matchByCourt = new Map(activeMatches.map((m) => [m.courtNumber, m]));
  const courts = Array.from({ length: session.numberOfCourts }, (_, i) => i + 1);
  const idleCourtNumbers = courts.filter((c) => !matchByCourt.has(c));

  const lockedPartnerByPlayerId = new Map<number, number>();
  sessionPlayers.forEach((sp) => {
    if (sp.lockedPartnerId != null) lockedPartnerByPlayerId.set(sp.playerId, sp.lockedPartnerId);
  });
  const courtPreviews = buildCourtPreviews(queue, lockedPartnerByPlayerId, idleCourtNumbers.length);

  return (
    <AppShell>
      {/* Pickleball-court-styled backdrop for the whole page: deep court-blue fading
          into court-green at the edges, with a faint line grid over the top. */}
      <div className="court-lines -mx-4 -mt-2 rounded-[28px] bg-linear-to-b from-court/15 via-transparent to-brand-soft/40 px-4 pb-6 pt-2 sm:-mx-6 sm:px-6">
        <PageHeader
          eyebrow="Live scoreboard"
          title="Matches"
          subtitle={`${activeMatches.length} of ${session.numberOfCourts} court${session.numberOfCourts === 1 ? "" : "s"} in play, ${completedMatches.length} match${completedMatches.length === 1 ? "" : "es"} recorded this session.`}
        />

        {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}

        {dataLoading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="size-4 animate-spin" /> Loading courts…
          </div>
        ) : (
          <>
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
                      className="relative cursor-pointer overflow-hidden rounded-[20px] bg-[#7c9c66] p-3 ring-2 ring-white/40 transition-transform hover:scale-[1.01]"
                    >
                      <div className="relative">
                        <div className="mb-3 flex items-center justify-between">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-[0.15em] text-white shadow ${courtAccent(courtNumber)}`}
                          >
                            Court {courtNumber}
                          </span>
                          <span className="pulse-dot rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black uppercase text-white shadow">
                            Live
                          </span>
                        </div>

                        {/* Pickleball court view: blue sides, light-blue kitchen strip,
                            black net line down the middle, framed in a white border. */}
                        <div className="grid grid-cols-[1fr_26px_1fr] overflow-hidden rounded-xl border-4 border-white shadow-inner">
                          <div className="flex flex-col items-center justify-center gap-1 bg-[#3d6f96] px-2 py-4 text-center">
                            {match.team1.map((p) => (
                              <p key={p.playerId} className="truncate text-base font-black text-white drop-shadow">
                                {p.fullName}
                              </p>
                            ))}
                          </div>
                          <div className="relative bg-[#5fb9d6]">
                            <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-zinc-900" />
                          </div>
                          <div className="flex flex-col items-center justify-center gap-1 bg-[#3d6f96] px-2 py-4 text-center">
                            {match.team2.map((p) => (
                              <p key={p.playerId} className="truncate text-base font-black text-white drop-shadow">
                                {p.fullName}
                              </p>
                            ))}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setScoringMatch(match);
                          }}
                          className="mt-3 w-full rounded-full bg-white font-bold text-zinc-900 hover:bg-zinc-100"
                        >
                          Record Result
                        </Button>
                      </div>
                    </div>
                  );
                }

                // Idle court: same pickleball-court background as a live match, but with
                // a "Next Up" preview (pairing-aware — see buildCourtPreviews above) sitting
                // in the court instead of live team names, so a locked pair always shows up
                // together here exactly as Smart Mix would actually place them.
                const idleIndex = idleCourtNumbers.indexOf(courtNumber);
                const previewPlayers = idleIndex >= 0 ? courtPreviews[idleIndex] : [];
                const hasFullPreview = previewPlayers.length === 4;
                const left = previewPlayers.slice(0, 2);
                const right = previewPlayers.slice(2, 4);

                return (
                  <div
                    key={courtNumber}
                    style={{ width: CARD_WIDTH }}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/queue")}
                    className="relative cursor-pointer overflow-hidden rounded-[20px] bg-[#7c9c66] p-3 ring-2 ring-white/25 transition-transform hover:scale-[1.01]"
                  >
                    <div className="relative">
                      <div className="mb-3 flex items-center justify-between">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-[0.15em] text-white shadow ${courtAccent(courtNumber)}`}
                        >
                          Court {courtNumber}
                        </span>
                        <span className="rounded-full bg-zinc-900/70 px-2.5 py-1 text-[10px] font-black uppercase text-white shadow">
                          {hasFullPreview ? "Next Up" : "Available"}
                        </span>
                      </div>

                      <div className="grid min-h-[92px] grid-cols-[1fr_26px_1fr] overflow-hidden rounded-xl border-4 border-white/80 shadow-inner">
                        <div className="flex flex-col items-center justify-center gap-1 bg-[#3d6f96]/85 px-2 py-4 text-center">
                          {left.length > 0 ? (
                            left.map((p) => (
                              <p key={p.queueId} className="truncate text-sm font-black text-white drop-shadow">
                                {p.fullName}
                              </p>
                            ))
                          ) : (
                            <span className="text-[10px] font-bold uppercase text-white/60">Open</span>
                          )}
                        </div>
                        <div className="relative bg-[#5fb9d6]/85">
                          <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-zinc-900/70" />
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1 bg-[#3d6f96]/85 px-2 py-4 text-center">
                          {right.length > 0 ? (
                            right.map((p) => (
                              <p key={p.queueId} className="truncate text-sm font-black text-white drop-shadow">
                                {p.fullName}
                              </p>
                            ))
                          ) : (
                            <span className="text-[10px] font-bold uppercase text-white/60">Open</span>
                          )}
                        </div>
                      </div>

                      {!hasFullPreview && (
                        <p className="mt-2 text-center text-xs font-bold text-white drop-shadow">
                          {previewPlayers.length === 0
                            ? "No one queued for this court yet"
                            : `Waiting on ${4 - previewPlayers.length} more`}
                        </p>
                      )}

                      <div className="mt-3 flex w-full gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyCourt === courtNumber || !hasFullPreview}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleSmartMix(courtNumber);
                          }}
                          className="flex-1 rounded-full bg-white/95 font-bold hover:bg-white"
                        >
                          <Shuffle className="size-3.5" />
                          {busyCourt === courtNumber ? "…" : "Smart Mix"}
                        </Button>
                        <Button
                          size="sm"
                          disabled={queue.length < 4}
                          onClick={(e) => {
                            e.stopPropagation();
                            setManualMixCourtNumber(courtNumber);
                          }}
                          className="flex-1 rounded-full bg-ink font-bold text-white hover:bg-zinc-800"
                        >
                          <Swords className="size-3.5" /> Manual Match
                        </Button>
                      </div>
                      {queue.length < 4 && (
                        <p className="mt-2 text-center text-[11px] font-bold text-white/90 drop-shadow">
                          Need 4+ in queue to fill a court
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <Panel>
                <h2 className="mb-4 text-sm font-bold">Recent results</h2>
                {completedMatches.length === 0 ? (
                  <p className="text-sm text-zinc-400">No completed matches yet this session.</p>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {completedMatches.map((m) => (
                      <div
                        key={m.matchId}
                        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-3"
                      >
                        <p className="truncate text-right text-sm font-bold text-zinc-800">
                          {m.team1.map((p) => p.fullName).join(" / ")}
                        </p>
                        <span className="shrink-0 rounded-lg bg-brand-soft px-3 py-1 text-sm font-black tabular-nums text-brand-dark">
                          {m.team1Score ?? 0}-{m.team2Score ?? 0}
                        </span>
                        <p className="truncate text-sm font-bold text-zinc-800">
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
      </div>

      <RecordResultDialog
        match={scoringMatch}
        sessionId={session.sessionId}
        onClose={() => setScoringMatch(null)}
        onRecorded={() => {
          setScoringMatch(null);
          void loadMatches(session.sessionId, { silent: true });
        }}
      />

      <ManualMixDialog
        courtNumber={manualMixCourtNumber}
        queue={queue}
        sessionId={session.sessionId}
        onClose={() => setManualMixCourtNumber(null)}
        onCreated={() => {
          setManualMixCourtNumber(null);
          void loadMatches(session.sessionId, { silent: true });
        }}
      />
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

function ManualMixDialog({
  courtNumber,
  queue,
  sessionId,
  onClose,
  onCreated,
}: {
  courtNumber: number | null;
  queue: QueueEntryDto[];
  sessionId: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [team1, setTeam1] = useState<number[]>([]);
  const [team2, setTeam2] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTeam1([]);
    setTeam2([]);
    setError(null);
  }, [courtNumber]);

  const open = courtNumber !== null;

  // Tap a player to cycle: unselected -> Team 1 -> Team 2 -> unselected.
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
    if (courtNumber === null) return;
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
          <DialogTitle>Manual Match — Court {courtNumber}</DialogTitle>
          <DialogDescription>Tap players to build Team 1, then Team 2.</DialogDescription>
        </DialogHeader>

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