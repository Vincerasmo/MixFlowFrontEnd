import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import PanelCard from "./PanelCard";
import { cn } from "@/lib/utils";

const AVATARS = [
  { initials: "JD", tone: "bg-brand text-zinc-900" },
  { initials: "KL", tone: "bg-ball text-zinc-900" },
  { initials: "AS", tone: "bg-zinc-800 text-white" },
  { initials: "MR", tone: "bg-court text-white" },
];

export default function QueuePanel() {
  return (
    <PanelCard title="Player Queue" accent="bg-court" to="/queue" className="md:col-span-6 lg:col-span-4">
      <div className="flex items-center -space-x-2 py-1">
        {AVATARS.map((a) => (
          <div
            key={a.initials}
            className={cn(
              "grid size-9 place-items-center rounded-full text-[11px] font-bold ring-2 ring-white",
              a.tone,
            )}
          >
            {a.initials}
          </div>
        ))}
        <div className="grid size-9 place-items-center rounded-full bg-zinc-100 text-[10px] font-bold ring-2 ring-white">
          +2
        </div>
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        Next in line: <span className="font-semibold text-zinc-900">Jordan & Kelly</span>
      </p>
      <Button className="mt-4 w-full bg-ink text-white hover:bg-zinc-800">
        <Shuffle className="size-3.5" /> Auto-Mix Pair
      </Button>
    </PanelCard>
  );
}