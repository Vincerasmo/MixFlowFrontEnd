import { Plus } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import MatchesPanel from "@/components/dashboard/MatchesPanel";
import LeaderboardPanel from "@/components/dashboard/LeaderboardPanel";
import SessionPanel from "@/components/dashboard/SessionPanel";
import QueuePanel from "@/components/dashboard/QueuePanel";
import PlayersPanel from "@/components/dashboard/PlayersPanel";

export default function DashboardPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Pickleball Stacking Management"
        title="Time to Stack, {Organizer Name}!"
        subtitle="Loading up on pickleball, positive vibes, and a solid stack."
        action={
          <Button className="hidden shrink-0 rounded-full bg-brand text-zinc-900 shadow-lg shadow-brand/30 hover:bg-brand-dark hover:text-white sm:inline-flex">
            <Plus className="size-4" /> Start a Session
          </Button>
        }
      />

      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        <MatchesPanel />
        <LeaderboardPanel />
        <SessionPanel />
        <QueuePanel />
        <PlayersPanel />
      </div>
    </AppShell>
  );
}