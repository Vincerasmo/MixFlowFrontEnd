import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Plus, Loader2, Users, X, Share2, Check, Eye, History, MoreVertical, Square } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  createSession,
  getMySessions,
  endSession,
  addPlayerToSession,
  getSessionPlayers,
  removePlayerFromSession,
} from "@/services/sessions";
import { getAllPlayers } from "@/services/players";
import type { CreateSessionPayload, SessionDto, SessionPlayerDto } from "@/services/sessions";
import type { PlayerDto } from "@/services/players";

const SKILL_CATEGORIES = ["Novice", "Intermediate", "Advanced"] as const;

// Same skill-tier color coding as the Players page, so category reads consistently everywhere.
const TIER_STYLE: Record<string, string> = {
  Advanced: "bg-ink text-white",
  Intermediate: "bg-brand text-zinc-900",
  Novice: "bg-zinc-200 text-zinc-700",
};

const emptyForm = {
  sessionName: "",
  sessionDate: "",
  startTime: "",
  endTime: "",
  numberOfCourts: 4,
};

// Lock/unlock pairing lives on the Queue page — that's where the organizer is
// actually looking when deciding who should play together, and it needs to react to
// who's currently queued/in-match, which this dialog doesn't track.
export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [endingId, setEndingId] = useState<number | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<number | null>(null);

  // Roster management
  const [rosterSession, setRosterSession] = useState<SessionDto | null>(null);
  const [rosterPlayers, setRosterPlayers] = useState<SessionPlayerDto[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerDto[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [pendingPlayerId, setPendingPlayerId] = useState<number | null>(null);
  const [addSearch, setAddSearch] = useState("");
  const [addCategoryFilter, setAddCategoryFilter] = useState<string>("All");

  const [confirmStep, setConfirmStep] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMySessions();
      setSessions(data);
    } catch {
      setError("Couldn't load sessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  // Live sessions always float to the top, regardless of date — an organizer
  // actively running a session shouldn't have to scroll past history to find it.
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aLive = a.status === "Active" ? 1 : 0;
      const bLive = b.status === "Active" ? 1 : 0;
      if (aLive !== bLive) return bLive - aLive;

      return new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime();
    });
  }, [sessions]);

  const getTodayLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const validateSessionForm = (values: typeof emptyForm): string | null => {
  if (!values.sessionName.trim()) {
    return "Give the session a name.";
  }
  if (!values.sessionDate) {
    return "Pick a date for the session.";
  }
  if (values.sessionDate < getTodayLocalDateString()) {
    return "The session date can't be in the past.";
  }
  if (!values.startTime || !values.endTime) {
    return "Set both a start time and an end time.";
  }
  if (values.startTime >= values.endTime) {
    return "End time must be after start time.";
  }
  if (!Number.isInteger(values.numberOfCourts) || values.numberOfCourts < 1) {
    return "Number of courts must be at least 1.";
  }
  return null;
};

const handleReviewSubmit = (e: FormEvent) => {
  e.preventDefault();
  setFormError(null);

  const validationError = validateSessionForm(form);
  if (validationError) {
    setFormError(validationError);
    return;
  }

  setConfirmStep(true);
};

const handleConfirmCreate = async () => {
  setFormError(null);
  setCreating(true);
  try {
    const payload: CreateSessionPayload = {
      sessionName: form.sessionName.trim(),
      sessionDate: form.sessionDate,
      startTime: `${form.startTime}:00`,
      endTime: `${form.endTime}:00`,
      numberOfCourts: form.numberOfCourts,
    };

    await createSession(payload);
    setDialogOpen(false);
    setConfirmStep(false);
    setForm(emptyForm);
    await loadSessions();
  } catch (err) {
    const apiErr = err as { message?: string };
    setFormError(apiErr.message ?? "Couldn't create the session. Please try again.");
    setConfirmStep(false);
  } finally {
    setCreating(false);
  }
};

const handleBackToEdit = () => {
  setConfirmStep(false);
  setFormError(null);
};

  const handleEndSession = async (id: number) => {
    setEndingId(id);
    try {
      await endSession(id);
      await loadSessions();
    } catch {
      setError("Couldn't end that session. Please try again.");
    } finally {
      setEndingId(null);
    }
  };

  // Copies a public, no-login link players can open to watch the live queue,
  // courts, and leaderboard for this session.
  const handleCopyWatchLink = async (sessionId: number) => {
    const url = `${window.location.origin}/watch/${sessionId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSessionId(sessionId);
      setTimeout(() => setCopiedSessionId((current) => (current === sessionId ? null : current)), 2000);
    } catch {
      setError("Couldn't copy the link. Please try again.");
    }
  };

  const openRoster = async (session: SessionDto) => {
    setRosterSession(session);
    setRosterError(null);
    setAddSearch("");
    setAddCategoryFilter("All");
    setRosterLoading(true);
    try {
      const [players, roster] = await Promise.all([
        allPlayers.length > 0 ? Promise.resolve(allPlayers) : getAllPlayers(),
        getSessionPlayers(session.sessionId),
      ]);
      setAllPlayers(players);
      setRosterPlayers(roster);
    } catch {
      setRosterError("Couldn't load the roster for this session.");
    } finally {
      setRosterLoading(false);
    }
  };

  const closeRoster = () => {
    setRosterSession(null);
    setRosterPlayers([]);
    setRosterError(null);
  };

  const availablePlayers = useMemo(() => {
    const rosterIds = new Set(rosterPlayers.map((rp) => rp.playerId));
    const pool = allPlayers.filter((p) => !rosterIds.has(p.playerId));
    const q = addSearch.trim().toLowerCase();
    return pool.filter((p) => {
      const matchesSearch = !q || p.fullName.toLowerCase().includes(q);
      const matchesCategory = addCategoryFilter === "All" || p.skillCategory === addCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [allPlayers, rosterPlayers, addSearch, addCategoryFilter]);

  const handleAddToRoster = async (playerId: number) => {
    if (!rosterSession) return;
    setPendingPlayerId(playerId);
    setRosterError(null);
    try {
      const added = await addPlayerToSession(rosterSession.sessionId, playerId);
      setRosterPlayers((prev) => [...prev, added]);
    } catch (err) {
      const apiErr = err as { message?: string };
      setRosterError(apiErr.message ?? "Couldn't add that player. They may already be in this session.");
    } finally {
      setPendingPlayerId(null);
    }
  };

  const handleRemoveFromRoster = async (playerId: number) => {
    if (!rosterSession) return;
    setPendingPlayerId(playerId);
    setRosterError(null);
    try {
      await removePlayerFromSession(rosterSession.sessionId, playerId);
      setRosterPlayers((prev) => prev.filter((rp) => rp.playerId !== playerId));
    } catch {
      setRosterError("Couldn't remove that player. Please try again.");
    } finally {
      setPendingPlayerId(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return {
      month: d.toLocaleDateString(undefined, { month: "short" }),
      day: d.getDate(),
    };
  };

  const formatTimeLabel = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

const formatDateLabel = (yyyyMmDd: string) => {
  const [year, month, day] = yyyyMmDd.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

  return (
    <AppShell>
      <PageHeader
        eyebrow="Sessions"
        title="Court sessions"
        subtitle="Schedule, run, and archive your play sessions."
        action={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setConfirmStep(false);
              setFormError(null);
              setDialogOpen(true);
            }}
            className="shrink-0 rounded-full bg-brand text-zinc-900 shadow-lg shadow-brand/30 hover:bg-brand-dark hover:text-white"
          >
            <Plus className="size-4" /> New Session
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading sessions…
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : sessions.length === 0 ? (
        <Panel className="text-center text-sm text-zinc-400">
          No sessions yet. Create one to get started.
        </Panel>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {sortedSessions.map((s) => {
            const { month, day } = formatDate(s.sessionDate);
            const isLive = s.status === "Active";

            return (
              <Panel key={s.sessionId} className="transition-transform hover:scale-[1.005]">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-dark">
                      <div className="text-center">
                        <p className="text-[9px] font-bold uppercase leading-none">{month}</p>
                        <p className="text-lg font-bold leading-none">{day}</p>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold">{s.sessionName}</h3>
                        {isLive ? (
                          <span className="pulse-dot rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                            Live
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)} • {s.numberOfCourts} courts • {s.totalMatchesPlayed} game
                        {s.totalMatchesPlayed === 1 ? "" : "s"} played
                      </p>
                    </div>
                  </div>

                  {/* Desktop / wide screens: full button row */}
                  <div className="hidden shrink-0 items-center gap-3 sm:flex">
                    <Button size="sm" variant="outline" onClick={() => openRoster(s)} className="rounded-full">
                      <Users className="size-3.5" /> Manage Players
                    </Button>
                    {isLive && (
                      <Button size="sm" variant="outline" asChild className="rounded-full">
                        <Link to={`/queue?sessionId=${s.sessionId}`}>
                          <Eye className="size-3.5" /> View Queue
                        </Link>
                      </Button>
                    )}
                    {!isLive && (
                      <Button size="sm" variant="outline" asChild className="rounded-full">
                        <Link to={`/matches?sessionId=${s.sessionId}`}>
                          <History className="size-3.5" /> View Results
                        </Link>
                      </Button>
                    )}
                    {isLive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyWatchLink(s.sessionId)}
                        className="rounded-full"
                      >
                        {copiedSessionId === s.sessionId ? (
                          <>
                            <Check className="size-3.5" /> Copied
                          </>
                        ) : (
                          <>
                            <Share2 className="size-3.5" /> Watch Link
                          </>
                        )}
                      </Button>
                    )}
                    {isLive && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={endingId === s.sessionId}
                        onClick={() => handleEndSession(s.sessionId)}
                        className="rounded-full"
                      >
                        {endingId === s.sessionId ? "Ending…" : "End Session"}
                      </Button>
                    )}
                  </div>

                  {/* Small screens: same actions collapsed into a menu */}
                  <div className="shrink-0 sm:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="size-9 rounded-full p-0">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openRoster(s)}>
                          <Users className="size-3.5" /> Manage Players
                        </DropdownMenuItem>
                        {isLive ? (
                          <DropdownMenuItem asChild>
                            <Link to={`/queue?sessionId=${s.sessionId}`}>
                              <Eye className="size-3.5" /> View Queue
                            </Link>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem asChild>
                            <Link to={`/matches?sessionId=${s.sessionId}`}>
                              <History className="size-3.5" /> View Results
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {isLive && (
                          <DropdownMenuItem onClick={() => handleCopyWatchLink(s.sessionId)}>
                            <Share2 className="size-3.5" /> {copiedSessionId === s.sessionId ? "Copied" : "Watch Link"}
                          </DropdownMenuItem>
                        )}
                        {isLive && (
                          <DropdownMenuItem
                            onClick={() => handleEndSession(s.sessionId)}
                            disabled={endingId === s.sessionId}
                            className="text-red-500 focus:text-red-500"
                          >
                            <Square className="size-3.5" /> {endingId === s.sessionId ? "Ending…" : "End Session"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Create session dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setConfirmStep(false);
        }}
      >
        <DialogContent>
          {!confirmStep ? (
            <>
              <DialogHeader>
                <DialogTitle>Start a new session</DialogTitle>
                <DialogDescription>Set the date, time, and courts. You can adjust the roster after.</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sessionName">Session name</Label>
                  <Input
                    id="sessionName"
                    required
                    value={form.sessionName}
                    onChange={(e) => setForm((f) => ({ ...f, sessionName: e.target.value }))}
                    placeholder="Morning Open Play"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sessionDate">Date</Label>
                  <Input
                    id="sessionDate"
                    type="date"
                    required
                    value={form.sessionDate}
                    onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="startTime">Start time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      required
                      value={form.startTime}
                      onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="endTime">End time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      required
                      value={form.endTime}
                      onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="numberOfCourts">Number of courts</Label>
                  <Input
                    id="numberOfCourts"
                    type="number"
                    min={1}
                    required
                    value={form.numberOfCourts}
                    onChange={(e) => setForm((f) => ({ ...f, numberOfCourts: Number(e.target.value) }))}
                  />
                </div>

                {formError && <p className="text-sm text-red-500">{formError}</p>}

                <DialogFooter>
                  <Button type="submit" className="w-full">
                    Review session
                  </Button>
                </DialogFooter>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Double-check before creating</DialogTitle>
                <DialogDescription>Make sure everything below is correct.</DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3 rounded-xl bg-zinc-50 p-4">
                <ReviewRow label="Name" value={form.sessionName.trim()} />
                <ReviewRow label="Date" value={formatDateLabel(form.sessionDate)} />
                <ReviewRow
                  label="Time"
                  value={`${formatTimeLabel(form.startTime)} – ${formatTimeLabel(form.endTime)}`}
                />
                <ReviewRow label="Courts" value={String(form.numberOfCourts)} />
              </div>

              {formError && <p className="text-sm text-red-500">{formError}</p>}

              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={handleBackToEdit} disabled={creating} className="flex-1">
                  Back
                </Button>
                <Button type="button" onClick={handleConfirmCreate} disabled={creating} className="flex-1">
                  {creating ? "Creating…" : "Confirm & create"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage players dialog */}
      <Dialog open={!!rosterSession} onOpenChange={(open) => !open && closeRoster()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Players — {rosterSession?.sessionName}</DialogTitle>
            <DialogDescription>
              Add or remove players from this session. Pair-locking is on the Queue page.
            </DialogDescription>
          </DialogHeader>

          {rosterLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-zinc-400">
              <Loader2 className="size-4 animate-spin" /> Loading roster…
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {rosterError && <p className="text-sm text-red-500">{rosterError}</p>}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  In this session ({rosterPlayers.length})
                </p>
                {rosterPlayers.length === 0 ? (
                  <p className="text-sm text-zinc-400">No players added yet.</p>
                ) : (
                  <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
                    {rosterPlayers.map((rp) => (
                      <div key={rp.playerId} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium">{rp.fullName}</p>
                            <span
                              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                TIER_STYLE[rp.skillCategory] ?? "bg-zinc-200 text-zinc-700"
                              }`}
                            >
                              {rp.skillCategory}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400">
                            {rp.gamesPlayedInSession} game{rp.gamesPlayedInSession === 1 ? "" : "s"} played
                            {rp.lockedPartnerName ? ` • 🔒 paired with ${rp.lockedPartnerName}` : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveFromRoster(rp.playerId)}
                          disabled={pendingPlayerId === rp.playerId}
                          className="grid size-7 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                          aria-label={`Remove ${rp.fullName}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Add from roster ({availablePlayers.length})
                </p>
                <Input
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="Search players to add…"
                  className="mb-2"
                />
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {["All", ...SKILL_CATEGORIES].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setAddCategoryFilter(cat)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                        addCategoryFilter === cat
                          ? "bg-ink text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {availablePlayers.length === 0 ? (
                  <p className="text-sm text-zinc-400">
                    {allPlayers.length === 0
                      ? "You don't have any players yet."
                      : "No players match your search or filter."}
                  </p>
                ) : (
                  <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
                    {availablePlayers.map((p) => (
                      <div
                        key={p.playerId}
                        className="flex items-center justify-between rounded-xl px-3 py-2 ring-1 ring-zinc-100"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium">{p.fullName}</p>
                            <span
                              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                TIER_STYLE[p.skillCategory] ?? "bg-zinc-200 text-zinc-700"
                              }`}
                            >
                              {p.skillCategory}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingPlayerId === p.playerId}
                          onClick={() => handleAddToRoster(p.playerId)}
                          className="rounded-full"
                        >
                          {pendingPlayerId === p.playerId ? "Adding…" : "Add"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}