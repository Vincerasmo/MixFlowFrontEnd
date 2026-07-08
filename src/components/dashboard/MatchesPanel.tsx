import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PanelCard from "./PanelCard";

type Match = {
  court: string;
  teamA: string;
  scoreA: number;
  teamB: string;
  scoreB: number;
  tag?: string;
};

const MATCHES: Match[] = [
  { court: "Court 01", teamA: "Miller / Ross", scoreA: 11, teamB: "Chen / Davis", scoreB: 8, tag: "Game Point" },
  { court: "Court 02", teamA: "Nguyen / Patel", scoreA: 7, teamB: "Wong / Rivera", scoreB: 9 },
];

export default function MatchesPanel() {
  return (
    <PanelCard title="Live Matches" accent="bg-red-500 pulse-dot" to="/matches" className="lg:col-span-8">
      <div className="grid gap-3">
        {MATCHES.map((m) => (
          <div
            key={m.court}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/60 p-4"
          >
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{m.court}</p>
              <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                <span className="truncate text-sm font-semibold">{m.teamA}</span>
                <span className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1 text-sm font-bold tabular-nums ring-1 ring-zinc-200">
                  <span>{m.scoreA}</span>
                  <span className="text-zinc-300">–</span>
                  <span>{m.scoreB}</span>
                </span>
                <span className="truncate text-sm font-semibold">{m.teamB}</span>
              </div>
            </div>
            {m.tag && (
              <span className="shrink-0 rounded-full bg-brand/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight text-brand-dark">
                {m.tag}
              </span>
            )}
          </div>
        ))}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-dashed border-zinc-200 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-400">
              <Plus className="size-4" />
            </div>
            <p className="truncate text-sm text-zinc-400">Court 3 warming up…</p>
          </div>
          <Button size="sm" variant="ghost" className="shrink-0 text-brand-dark hover:text-brand-dark">
            Start match
          </Button>
        </div>
      </div>
    </PanelCard>
  );
}