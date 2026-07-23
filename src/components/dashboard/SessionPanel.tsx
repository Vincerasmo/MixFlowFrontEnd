import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import PanelCard from "./PanelCard";
import { getMySessions } from "@/services/sessions";
import type { SessionDto } from "@/services/sessions";

export default function SessionPanel() {
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMySessions()
      .then((data) => {
        if (!cancelled) setSessions(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load sessions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Live sessions float to the top; within each group (live vs ended), most recent
  // first. Same rule as the Sessions page — otherwise a session you just wrapped up
  // could bury the one you're actually running right now.
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aLive = a.status === "Active" ? 0 : 1;
      const bLive = b.status === "Active" ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime();
    });
  }, [sessions]);

  return (
    <PanelCard title="Recent Sessions" accent="bg-brand" to="/sessions" className="col-span-12 md:col-span-6">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading sessions…
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : sortedSessions.length === 0 ? (
        <p className="text-sm text-zinc-400">No sessions yet. Start one to get going.</p>
      ) : (
        <div className="divide-y divide-zinc-950/5">
          {sortedSessions.slice(0, 4).map((s) => (
            <div key={s.sessionId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{s.sessionName}</p>
                <p className="flex items-center gap-1 text-xs text-zinc-400">
                  <CalendarDays className="size-3" />
                  {new Date(s.sessionDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} •{" "}
                  {s.numberOfCourts} courts
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase text-brand-dark">
                {s.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}