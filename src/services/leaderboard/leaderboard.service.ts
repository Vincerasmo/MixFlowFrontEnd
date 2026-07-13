import { apiClient } from "../api/client";
import type { ActiveSessionLeaderboardDto, LeaderboardDto, LeaderboardPlayerDto } from "./leaderboard.types";

export async function getSessionLeaderboard(sessionId: number): Promise<LeaderboardPlayerDto[]> {
  const { data } = await apiClient.get<LeaderboardPlayerDto[]>(`/leaderboard/session/${sessionId}`);
  return data;
}

// Leaderboard for whichever session is currently active for this organizer.
// Returns null (rather than throwing) on a 404 so callers can just check
// `result === null` for "no active session right now".
export async function getActiveSessionLeaderboard(): Promise<ActiveSessionLeaderboardDto | null> {
  try {
    const { data } = await apiClient.get<ActiveSessionLeaderboardDto>("/leaderboard/session/active");
    return data;
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404) return null;
    throw err;
  }
}

export async function getOverallLeaderboard(): Promise<LeaderboardPlayerDto[]> {
  const { data } = await apiClient.get<LeaderboardPlayerDto[]>("/leaderboard/overall");
  return data;
}

export async function saveSessionLeaderboardSnapshot(sessionId: number): Promise<void> {
  await apiClient.post(`/leaderboard/session/${sessionId}/snapshot`);
}

export async function getSessionLeaderboardHistory(sessionId: number): Promise<LeaderboardDto[]> {
  const { data } = await apiClient.get<LeaderboardDto[]>(`/leaderboard/session/${sessionId}/history`);
  return data;
}