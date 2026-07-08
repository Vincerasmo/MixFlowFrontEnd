import { Medal } from "lucide-react";
import PanelCard from "./PanelCard";
import { cn } from "@/lib/utils";

const LEADERS = [
  { rank: 1, name: "Sarah Jenkins", wins: 42, medal: "bg-ball" },
  { rank: 2, name: "Marcus Thorne", wins: 38, medal: "bg-zinc-300" },
  { rank: 3, name: "Elena Rodriguez", wins: 35, medal: "bg-amber-600" },
];

export default function LeaderboardPanel() {
  return (
    <PanelCard title="Top Performers" accent="bg-ball" to="/leaderboard" className="lg:col-span-4">
      <div className="space-y-3">
        {LEADERS.map((p) => (
          <div key={p.rank} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className={cn("grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-zinc-900", p.medal)}>
                {p.rank === 1 ? <Medal className="size-3.5" /> : p.rank}
              </div>
              <span className="truncate text-sm font-semibold">{p.name}</span>
            </div>
            <span className="shrink-0 text-xs font-bold tabular-nums text-zinc-500">{p.wins}W</span>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}