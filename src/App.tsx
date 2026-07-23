import { Routes, Route } from "react-router-dom";

import LoginPage from "./pages/Auth/Login";
import SignUpPage from "./pages/Auth/Register";
import DashboardPage from "./pages/Dashboard";
import SessionsPage from "./pages/Sessions";
import PlayersPage from "./pages/Players";
import QueuePage from "./pages/Queue";
import MatchesPage from "./pages/Matches";
import LeaderboardPage from "./pages/Leaderboard";
import WatchPage from "./pages/Watch";
import NotFoundPage from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<SignUpPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/sessions" element={<SessionsPage />} />
      <Route path="/players" element={<PlayersPage />} />
      <Route path="/queue" element={<QueuePage />} />
      <Route path="/matches" element={<MatchesPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      {/* Public, no-login spectator view — share this link/QR with players */}
      <Route path="/watch/:sessionId" element={<WatchPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}