import { Plus } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import OverviewPanel from "@/components/dashboard/OverviewPanel";
import MatchesPanel from "@/components/dashboard/MatchesPanel";
import LeaderboardPanel from "@/components/dashboard/LeaderboardPanel";
import SessionPanel from "@/components/dashboard/SessionPanel";
import QueuePanel from "@/components/dashboard/QueuePanel";
import PlayersPanel from "@/components/dashboard/PlayersPanel";

export default function DashboardPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Court status • Live"
        title="Good afternoon, Vince"
        subtitle="3 courts running, 8 players in queue, and a Game Point brewing on Court 1."
        action={
          <Button className="hidden shrink-0 rounded-full bg-brand text-zinc-900 shadow-lg shadow-brand/30 hover:bg-brand-dark hover:text-white sm:inline-flex">
            <Plus className="size-4" /> Start a Session
          </Button>
        }
      />

      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        <OverviewPanel />
        <MatchesPanel />
        <LeaderboardPanel />
        <SessionPanel />
        <QueuePanel />
        <PlayersPanel />
      </div>
    </AppShell>
  );
}