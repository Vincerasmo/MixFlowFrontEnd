import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, Medal, Trophy, Flame, Snowflake, Sparkles, Swords, Share2, Check, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { PickleballIcon } from "@/components/icons/pickleball-icons";
import { getPublicSessionReport, getPublicCompletedMatches } from "@/services/public";
import { isAuthenticated } from "@/services/auth";
import type { SessionReportDto } from "@/services/public";
import type { MatchDto } from "@/services/matches";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("");
}

function formatTimeLabel(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatTimeRange(startHHMM: string, endHHMM: string): string {
  const start = formatTimeLabel(startHHMM);
  const end = formatTimeLabel(endHHMM);
  const crossesMidnight = endHHMM <= startHHMM;
  return crossesMidnight ? `${start}–${end} (next day)` : `${start}–${end}`;
}

function formatDateLabel(yyyyMmDd: string) {
  const datePart = yyyyMmDd.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Same rank styling as Watch.tsx and the dashboard's Top Performers panel.
const medalTone = (rank: number) =>
  rank === 1 ? "bg-ball" : rank === 2 ? "bg-zinc-300" : rank === 3 ? "bg-amber-600" : "bg-brand-soft text-brand-dark";

// Same fire/ice treatment used on the Leaderboard, Matches, and Watch pages.
function StreakIndicator({ streak }: { streak: number }) {
  if (streak === 0) {
    return <span className="text-xs font-bold tabular-nums text-zinc-400">—</span>;
  }
  if (streak > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold tabular-nums text-orange-600">
        <Flame className="size-3.5 fill-orange-500 text-orange-500" /> {streak}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold tabular-nums text-sky-600">
      <Snowflake className="size-3.5 fill-sky-400 text-sky-500" /> {Math.abs(streak)}
    </span>
  );
}

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const id = Number(sessionId);

  const [report, setReport] = useState<SessionReportDto | null>(null);
  const [matches, setMatches] = useState<MatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError("Invalid report link.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    // A one-time load, not polled — this is a wrap-up of a session that's already
    // happened, not a live view. If more matches get recorded after this loads,
    // a refresh picks them up. The full match list reuses the same endpoint the
    // live Watch page already uses for its Recent/Final Results section.
    Promise.all([getPublicSessionReport(id), getPublicCompletedMatches(id)])
      .then(([reportData, matchesData]) => {
        if (cancelled) return;
        setReport(reportData);
        setMatches(matchesData);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this report. The link may be invalid.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Same behavior as the organizer's Matches page: tap a player in the standings to
  // narrow the match list to only their matches, tap again (or "Show all") to clear.
  const displayedMatches = useMemo(() => {
    if (!selectedPlayerId) return matches;
    return matches.filter((m) => [...m.team1, ...m.team2].some((p) => p.playerId === selectedPlayerId));
  }, [matches, selectedPlayerId]);

  const handleTogglePlayerFilter = (playerId: number) => {
    setSelectedPlayerId((current) => (current === playerId ? null : playerId));
  };

  // The shareable link lives here now rather than on the Sessions list.
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/report/${id}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (e.g. non-secure context) — nothing useful to show on a public page.
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-50">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-50 p-6 text-center">
        <div>
          <PickleballIcon className="mx-auto mb-4 size-12" />
          <p className="text-sm font-medium text-zinc-600">{error ?? "Report not found."}</p>
        </div>
      </div>
    );
  }

  const { mvp, biggestWin, biggestWinMargin, finalStandings } = report;
  const selectedPlayerName = selectedPlayerId
    ? finalStandings.find((p) => p.playerId === selectedPlayerId)?.fullName
    : null;

  return (
    <div className="min-h-screen bg-zinc-50 pb-16 font-sans text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          {/* Only meaningful for the organizer — public viewers arriving from a shared
              link have no app to go back to. */}
          {isAuthenticated() && (
            <Link
              to="/sessions"
              aria-label="Back to sessions"
              title="Back to sessions"
              className="grid size-8 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <ArrowLeft className="size-4" />
            </Link>
          )}
          <PickleballIcon className="size-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold">{report.sessionName}</p>
            <p className="text-xs text-zinc-500">
              Session Wrap-Up • {formatDateLabel(report.sessionDate)} •{" "}
              {formatTimeRange(report.startTime.slice(0, 5), report.endTime.slice(0, 5))}
            </p>
          </div>
          <button
            onClick={handleCopyLink}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {linkCopied ? (
              <>
                <Check className="size-3.5" /> Copied
              </>
            ) : (
              <>
                <Share2 className="size-3.5" /> Copy Link
              </>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Totals strip */}
        <div className="mb-8 grid grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-[20px] bg-white p-4 text-center ring-1 ring-black/5">
            <p className="text-2xl font-black tabular-nums">{report.totalMatchesPlayed}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Matches Played</p>
          </div>
          <div className="rounded-[20px] bg-white p-4 text-center ring-1 ring-black/5">
            <p className="text-2xl font-black tabular-nums">{report.totalDistinctPlayers}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Players</p>
          </div>
          <div className="rounded-[20px] bg-white p-4 text-center ring-1 ring-black/5">
            <p className="text-2xl font-black tabular-nums">{report.numberOfCourts}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Courts</p>
          </div>
        </div>

        {/* MVP callout */}
        {mvp && (
          <section className="mb-8 overflow-hidden rounded-[20px] bg-linear-to-br from-ball to-brand p-6 text-center text-zinc-900 ring-1 ring-black/5">
            <Sparkles className="mx-auto mb-2 size-6" />
            <p className="text-xs font-black uppercase tracking-[0.2em]">MVP of the Session</p>
            <div className="mx-auto my-3 grid size-16 place-items-center rounded-full bg-white text-lg font-black shadow">
              {initials(mvp.fullName)}
            </div>
            <p className="text-xl font-black">{mvp.fullName}</p>
            <p className="text-sm font-bold">
              {mvp.wins}-{mvp.losses} • {Number(mvp.winPercentage).toFixed(0)}% win rate
            </p>
          </section>
        )}

        {/* Highlights — biggest win */}
        {biggestWin && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500">
              <Swords className="mr-1.5 inline size-4 text-zinc-400" />
              Biggest Win
            </h2>
            <div className="rounded-[20px] bg-[#8ba668] p-4 text-white ring-1 ring-black/10">
              <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.15em] text-white/80">
                Won by {biggestWinMargin} point{biggestWinMargin === 1 ? "" : "s"}
                {biggestWin.courtNumber != null ? ` • Court ${biggestWin.courtNumber}` : ""}
              </p>
              <div className="grid grid-cols-[1fr_auto_1fr] overflow-hidden rounded-xl border-[4px] border-white">
                <div className="grid grid-rows-2 divide-y-[3px] divide-white bg-[#4a7a9c]">
                  {biggestWin.team1.map((p) => (
                    <div key={p.playerId} className="flex items-center justify-center p-2">
                      <p className="truncate text-sm font-bold text-white">{p.fullName}</p>
                    </div>
                  ))}
                </div>
                <div className="flex min-w-[92px] items-center justify-center bg-[#5ec2dd] px-3 sm:min-w-[140px] sm:px-5">
                  <p className="text-4xl leading-none font-black tabular-nums text-zinc-900 sm:text-2xl">
                    {biggestWin.team1Score}–{biggestWin.team2Score}
                  </p>
                </div>
                <div className="grid grid-rows-2 divide-y-[3px] divide-white bg-[#4a7a9c]">
                  {biggestWin.team2.map((p) => (
                    <div key={p.playerId} className="flex items-center justify-center p-2">
                      <p className="truncate text-sm font-bold text-white">{p.fullName}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Final standings */}
        <section className="mb-8 rounded-[20px] bg-white p-5 ring-1 ring-black/5">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Final Standings</h2>
            {finalStandings.length > 0 && (
              <p className="text-xs text-zinc-400">
                {selectedPlayerName ? `Showing ${selectedPlayerName}'s matches below ↓` : "Tap a player to see only their matches"}
              </p>
            )}
          </div>
          {finalStandings.length === 0 ? (
            <p className="text-sm text-zinc-400">No results were recorded in this session.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {finalStandings.map((l) => (
                <button
                  key={l.playerId}
                  type="button"
                  onClick={() => handleTogglePlayerFilter(l.playerId)}
                  aria-pressed={selectedPlayerId === l.playerId}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-2.5 text-left transition-colors",
                    selectedPlayerId === l.playerId ? "bg-brand-soft" : "hover:bg-zinc-50",
                  )}
                >
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
                  <div className="flex shrink-0 items-center gap-2 text-xs font-bold tabular-nums text-zinc-500">
                    <span>
                      {l.wins}-{l.losses}
                    </span>
                    <StreakIndicator streak={l.streak} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Full match list — same fraction-bar card treatment as Watch.tsx's Final Results */}
        <section className="rounded-[20px] bg-white p-5 ring-1 ring-black/5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              All Matches
              {selectedPlayerName && <span className="font-medium normal-case tracking-normal text-zinc-400"> — {selectedPlayerName}</span>}
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
                : "No matches were recorded in this session."}
            </p>
          ) : (
            <div className="space-y-2">
              {displayedMatches.map((m) => {
                const t1Score = m.team1Score ?? 0;
                const t2Score = m.team2Score ?? 0;
                const t1Won = t1Score > t2Score;
                const t2Won = t2Score > t1Score;
                return (
                  <div key={m.matchId} className="rounded-2xl bg-[#8ba668] px-4 py-3 ring-1 ring-black/10">
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

                    <div className="my-1.5 ml-[60px] h-px bg-white/40" />

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
        </section>
      </main>
    </div>
  );
}