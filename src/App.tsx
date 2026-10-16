import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import LoginPage from "./pages/Auth/Login";
import SignUpPage from "./pages/Auth/Register";
import DashboardPage from "./pages/Dashboard";
import SessionsPage from "./pages/Sessions";
import PlayersPage from "./pages/Players";
import QueuePage from "./pages/Queue";
import MatchesPage from "./pages/Matches";
import LeaderboardPage from "./pages/Leaderboard";
import WatchPage from "./pages/Watch";
import ReportPage from "./pages/Report";
import NotFoundPage from "./pages/NotFound";
import PlayerDetailPage from "./pages/PlayerDetail";
import { isAuthenticated } from "@/services/auth";

/**
 * Route guard for organizer-only pages.
 *
 * `isAuthenticated()` is a cheap localStorage check — it only tells us whether
 * a token *exists*, not whether it's still valid. That's intentional: if the
 * token turns out to be expired, the API interceptor in services/api/client.ts
 * handles the 401 and redirects. Doing a network round-trip here would stall
 * every navigation on a "verify token" call, which isn't worth it.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  if (!isAuthenticated()) {
    // `replace` so the browser back button doesn't bounce the user between
    // the protected page and the login screen forever.
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public: auth screens */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<SignUpPage />} />

      {/* Organizer-only: wrapped in RequireAuth */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sessions"
        element={
          <RequireAuth>
            <SessionsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/players"
        element={
          <RequireAuth>
            <PlayersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/players/:id"
        element={
          <RequireAuth>
            <PlayerDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/queue"
        element={
          <RequireAuth>
            <QueuePage />
          </RequireAuth>
        }
      />
      <Route
        path="/matches"
        element={
          <RequireAuth>
            <MatchesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <RequireAuth>
            <LeaderboardPage />
          </RequireAuth>
        }
      />

      {/* Public, no-login routes — deliberately NOT wrapped. A player opening a
          shared watch link on their phone should never be bounced to sign-in. */}
      <Route path="/watch/:sessionId" element={<WatchPage />} />
      <Route path="/report/:sessionId" element={<ReportPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}