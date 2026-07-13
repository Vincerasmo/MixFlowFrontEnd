import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import LeaderboardPanel from "@/components/dashboard/LeaderboardPanel";
import SessionPanel from "@/components/dashboard/SessionPanel";
import PlayersPanel from "@/components/dashboard/PlayersPanel";
import { getStoredOrganizer } from "@/services/auth";

export default function DashboardPage() {
  const organizer = getStoredOrganizer();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Pickleball Stacking Management"
        title={`Time to Stack, ${organizer?.fullName ?? "Organizer"}!`}
        subtitle="Loading up on pickleball, positive vibes, and a solid stack."
        action={
          <Button
            asChild
            className="hidden shrink-0 rounded-full bg-brand text-zinc-900 shadow-lg shadow-brand/30 hover:bg-brand-dark hover:text-white sm:inline-flex"
          >
            <Link to="/sessions">
              <Plus className="size-4" /> Start a Session
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        <SessionPanel />
        <PlayersPanel />
        <LeaderboardPanel />
      </div>
    </AppShell>
  );
}