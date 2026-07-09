import { apiClient } from "../api/client";
import type { LeaderboardDto, LeaderboardPlayerDto } from "./leaderboard.types";

export async function getSessionLeaderboard(sessionId: number): Promise<LeaderboardPlayerDto[]> {
  const { data } = await apiClient.get<LeaderboardPlayerDto[]>(`/leaderboard/session/${sessionId}`);
  return data;
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