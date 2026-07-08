import { CalendarDays } from "lucide-react";
import PanelCard from "./PanelCard";

const SESSIONS = [
  { name: "Morning Open Play", date: "Oct 24", players: 12 },
  { name: "Advanced Round Robin", date: "Oct 22", players: 8 },
];

export default function SessionPanel() {
  return (
    <PanelCard title="Recent Sessions" accent="bg-brand" to="/sessions" className="md:col-span-6 lg:col-span-4">
      <div className="divide-y divide-zinc-950/5">
        {SESSIONS.map((s) => (
          <div key={s.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{s.name}</p>
              <p className="flex items-center gap-1 text-xs text-zinc-400">
                <CalendarDays className="size-3" />
                {s.date} • {s.players} Players
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-dark">
              LIVE
            </span>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}