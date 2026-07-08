import { TrendingUp } from "lucide-react";
import PanelCard from "./PanelCard";
import { cn } from "@/lib/utils";

export default function PlayersPanel() {
  return (
    <PanelCard title="Roster" accent="bg-brand-dark" to="/players" className="md:col-span-6 lg:col-span-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <p className="text-3xl font-bold tabular-nums">128</p>
          <p className="text-xs text-zinc-400">Active members</p>
        </div>
        <div className="flex items-center gap-1 text-right text-xs font-semibold text-brand-dark">
          <TrendingUp className="size-3" />
          +6 this week
        </div>
      </div>
      <div className="mt-5 grid grid-cols-8 gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={cn("h-1.5 rounded-full", i < 4 ? "bg-brand" : "bg-zinc-100")} />
        ))}
      </div>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
        50% court capacity utilized
      </p>
    </PanelCard>
  );
}