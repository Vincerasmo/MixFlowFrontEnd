import { useEffect, useMemo, useState } from "react";
import { Loader2, Flame, Snowflake, Trophy } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getSessionLeaderboard, getOverallLeaderboard } from "@/services/leaderboard";
import type { LeaderboardPlayerDto } from "@/services/leaderboard";
import { getMySessions } from "@/services/sessions";
import type { SessionDto } from "@/services/sessions";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("");
}

// Fire for a win streak, ice for a losing streak — session leaderboard only. The
// numeric label stays alongside the icon so it's not just decorative.
function StreakBadge({ streak, size = "text-xs" }: { streak: number; size?: string }) {
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

function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function LeaderboardPage() {
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [sessionRankings, setSessionRankings] = useState<LeaderboardPlayerDto[]>([]);
  const [sessionSwitching, setSessionSwitching] = useState(false);

  const [overallRankings, setOverallRankings] = useState<LeaderboardPlayerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getMySessions(), getOverallLeaderboard()])
      .then(([allSessions, overall]) => {
        if (cancelled) return;

        const sorted = [...allSessions].sort(
          (a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
        );
        setSessions(sorted);
        setOverallRankings(overall);

        const defaultSession = sorted.find((s) => s.status === "Active") ?? sorted[0];
        if (defaultSession) setSelectedSessionId(defaultSession.sessionId);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the leaderboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the picked session's rankings whenever the selection changes.
  useEffect(() => {
    if (selectedSessionId === null) return;

    let cancelled = false;
    setSessionSwitching(true);
    getSessionLeaderboard(selectedSessionId)
      .then((rankings) => {
        if (!cancelled) setSessionRankings(rankings);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load that session's leaderboard.");
      })
      .finally(() => {
        if (!cancelled) setSessionSwitching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSessionId]);

  const activeSessions = useMemo(() => sessions.filter((s) => s.status === "Active"), [sessions]);
  const pastSessions = useMemo(() => sessions.filter((s) => s.status !== "Active"), [sessions]);
  const selectedSession = useMemo(
    () => sessions.find((s) => s.sessionId === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading leaderboard…
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <PageHeader eyebrow="Standings" title="Leaderboard" />
        <Panel className="text-center text-sm text-red-500">{error}</Panel>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Standings" title="Leaderboard" subtitle="Updated in real time as matches finish." />

      <Tabs defaultValue="session">
        <TabsList>
          <TabsTrigger value="session">Session</TabsTrigger>
          <TabsTrigger value="overall">Overall</TabsTrigger>
        </TabsList>

        <TabsContent value="session">
          {sessions.length === 0 ? (
            <Panel className="mt-4 text-center text-sm text-zinc-400">
              No sessions yet. Start a session to see standings here.
            </Panel>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-2">
                <Select
                  value={selectedSessionId?.toString() ?? undefined}
                  onValueChange={(v) => setSelectedSessionId(Number(v))}
                >
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="Choose a session" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSessions.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Active now</SelectLabel>
                        {activeSessions.map((s) => (
                          <SelectItem key={s.sessionId} value={s.sessionId.toString()}>
                            {s.sessionName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {pastSessions.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Past sessions</SelectLabel>
                        {pastSessions.map((s) => (
                          <SelectItem key={s.sessionId} value={s.sessionId.toString()}>
                            {s.sessionName} — {formatSessionDate(s.sessionDate)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
                {sessionSwitching && <Loader2 className="size-4 shrink-0 animate-spin text-zinc-400" />}
              </div>

              <LeaderboardView
                rankings={sessionRankings}
                variant="session"
                subtitle={
                  selectedSession
                    ? `${selectedSession.sessionName} · ${
                        selectedSession.status === "Active" ? "In progress" : formatSessionDate(selectedSession.sessionDate)
                      }`
                    : undefined
                }
                emptyMessage="No results yet for this session — the leaderboard fills in as matches are recorded."
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="overall">
          <LeaderboardView
            rankings={overallRankings}
            variant="overall"
            subtitle="This week, across every session — resets every Sunday"
            emptyMessage="No players have recorded matches yet this week."
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function LeaderboardView({
  rankings,
  variant,
  subtitle,
  emptyMessage,
}: {
  rankings: LeaderboardPlayerDto[];
  variant: "session" | "overall";
  subtitle?: string;
  emptyMessage: string;
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardPlayerDto | null>(null);

  if (rankings.length === 0) {
    return (
      <Panel className="mt-4 text-center text-sm text-zinc-400">
        {emptyMessage}
      </Panel>
    );
  }

  const [first, second, third, ...rest] = rankings;

  return (
    <div className="mt-4">
      {subtitle && <p className="mb-4 text-sm text-zinc-500">{subtitle}</p>}

      {first && (
        <div className="mb-6 grid grid-cols-3 items-end gap-3 sm:gap-6">
          {second ? (
            <Podium
              player={second}
              height="h-32 sm:h-40"
              gradient="from-zinc-300 to-zinc-400"
              medal="🥈"
              onClick={() => setSelectedPlayer(second)}
            />
          ) : (
            <div />
          )}
          <Podium
            player={first}
            height="h-40 sm:h-56"
            gradient="from-ball to-ball-deep"
            medal="🥇"
            featured
            onClick={() => setSelectedPlayer(first)}
          />
          {third ? (
            <Podium
              player={third}
              height="h-28 sm:h-36"
              gradient="from-amber-600 to-amber-800"
              medal="🥉"
              onClick={() => setSelectedPlayer(third)}
            />
          ) : (
            <div />
          )}
        </div>
      )}

      <Panel>
        <h2 className="mb-4 text-sm font-semibold">Full rankings</h2>
        <div className="divide-y divide-zinc-100">
          {/* sm+ : full grid table. Below sm: stats used to just vanish (hidden
              sm:inline everywhere) — now they show as a wrapped chip row under
              the name instead of disappearing entirely. */}
          <div className="hidden grid-cols-[3rem_minmax(0,1fr)_4rem_4rem_4rem_4rem_4rem] items-center gap-3 pb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 sm:grid">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-right">Rating</span>
            <span className="text-right">Wins</span>
            <span className="text-right">Losses</span>
            <span className="text-right">Games</span>
            <span className="text-right">{variant === "session" ? "Streak" : "Win %"}</span>
          </div>
          {rest.map((p) => (
            <div key={p.playerId} className="py-3">
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[3rem_minmax(0,1fr)_4rem_4rem_4rem_4rem_4rem]">
                <span className="text-sm font-bold text-zinc-400 tabular-nums">#{p.rank}</span>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-ball to-brand text-[10px] font-bold text-zinc-900">
                    {initials(p.fullName)}
                  </div>
                  <span className="truncate text-sm font-semibold">{p.fullName}</span>
                </div>
                <span className="hidden text-right text-sm font-bold tabular-nums sm:inline">
                  {Number(p.skillLevel).toFixed(1)}
                </span>
                <span className="hidden text-right text-sm font-bold tabular-nums text-brand-dark sm:inline">
                  {p.wins}
                </span>
                <span className="hidden text-right text-sm font-medium tabular-nums text-zinc-500 sm:inline">
                  {p.losses}
                </span>
                <span className="hidden text-right text-sm font-medium tabular-nums text-zinc-500 sm:inline">
                  {p.gamesPlayed}
                </span>
                <span className="hidden text-right sm:inline">
                  {variant === "session" ? (
                    <StreakBadge streak={p.streak} />
                  ) : (
                    <span className="text-xs font-bold tabular-nums">{Number(p.winPercentage).toFixed(0)}%</span>
                  )}
                </span>
              </div>

              {/* Mobile-only stat chips — this is what actually makes the stats
                  visible on phones/tablets instead of silently disappearing. */}
              <div className="ml-11 mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-zinc-500 sm:hidden">
                <span>Rating {Number(p.skillLevel).toFixed(1)}</span>
                <span className="text-brand-dark">W {p.wins}</span>
                <span>L {p.losses}</span>
                <span>G {p.gamesPlayed}</span>
                {variant === "session" ? (
                  <StreakBadge streak={p.streak} size="text-[11px]" />
                ) : (
                  <span>{Number(p.winPercentage).toFixed(0)}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <PlayerStatsDialog player={selectedPlayer} variant={variant} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
}

function PlayerStatsDialog({
  player,
  variant,
  onClose,
}: {
  player: LeaderboardPlayerDto | null;
  variant: "session" | "overall";
  onClose: () => void;
}) {
  return (
    <Dialog open={player !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {player && (
          <>
            <DialogHeader>
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-linear-to-br from-ball to-brand text-lg font-bold text-zinc-900 ring-4 ring-white shadow-lg">
                {initials(player.fullName)}
              </div>
              <DialogTitle className="text-center">{player.fullName}</DialogTitle>
              <DialogDescription className="text-center">Rank #{player.rank}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Games Played" value={String(player.gamesPlayed)} />
              <StatBox label="Wins" value={String(player.wins)} accent />
              <StatBox label="Losses" value={String(player.losses)} />
              {variant === "session" ? (
                <div className="rounded-2xl bg-zinc-50 p-4 text-center">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Streak</p>
                  <div className="flex justify-center">
                    <StreakBadge streak={player.streak} size="text-lg" />
                  </div>
                </div>
              ) : (
                <StatBox label="Win %" value={`${Number(player.winPercentage).toFixed(0)}%`} accent />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
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

function Podium({
  player, height, gradient, medal, featured, onClick,
}: {
  player: LeaderboardPlayerDto;
  height: string;
  gradient: string;
  medal: string;
  featured?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <div className="ball-bounce mb-2 text-2xl sm:text-3xl">{medal}</div>
      <div className="grid size-14 place-items-center rounded-full bg-linear-to-br from-ball to-brand text-sm font-bold text-zinc-900 ring-4 ring-white shadow-lg sm:size-16">
        {initials(player.fullName)}
      </div>
      <p className="mt-2 text-center text-xs font-bold sm:text-sm">{player.fullName}</p>
      <p className="text-[10px] text-zinc-500">{player.wins} wins</p>
      <div className={`mt-3 w-full rounded-t-2xl bg-linear-to-b ${gradient} ${height} flex items-start justify-center pt-3 shadow-inner`}>
        <span className="text-2xl font-black text-white/90 sm:text-4xl">#{player.rank}</span>
      </div>
    </button>
  );
}