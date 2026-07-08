import type { ComponentType } from "react";
import { Activity, Trophy, Users, Zap } from "lucide-react";
import { PickleballIcon } from "@/components/icons/pickleball-icons";

type Stat = { label: string; value: string; hint: string; icon: ComponentType<{ className?: string }> };

const STATS: Stat[] = [
  { label: "Active Courts", value: "3", hint: "of 4", icon: Activity },
  { label: "Players Waiting", value: "6", hint: "next: Jordan & Kelly", icon: Users },
  { label: "Matches Today", value: "27", hint: "+12 vs. yesterday", icon: Zap },
  { label: "Session Rating", value: "4.9", hint: "Morning Open Play", icon: Trophy },
];

export default function OverviewPanel() {
  return (
    <section className="court-lines relative col-span-12 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-dark via-brand-dark to-court p-6 text-white ring-1 ring-black/10 sm:p-8">
      <PickleballIcon
        spin
        className="absolute -right-8 -top-10 size-56 opacity-25 sm:size-64"
      />
      <div className="relative grid grid-cols-2 gap-6 sm:grid-cols-4">
        {STATS.map(({ label, value, hint, icon: Icon }) => (
          <div key={label} className="min-w-0">
            <div className="flex items-center gap-2 text-brand-soft/80">
              <Icon className="size-3.5" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em]">{label}</p>
            </div>
            <p className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">{value}</p>
            <p className="mt-1 truncate text-xs text-white/70">{hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}