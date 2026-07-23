import { apiClient } from "../api/client";
import type { MatchDto, QueueEntryDto } from "../matches/matches.types";
import type { LeaderboardPlayerDto } from "../leaderboard/leaderboard.types";

// These hit new, unauthenticated endpoints on the backend (see PublicController) — no
// token required, so this is safe to call from a public "watch" link with no login.
// apiClient still attaches a token if one happens to be present (e.g. an organizer
// opening their own watch link), but the backend won't require it here.

export interface PublicSessionDto {
  sessionId: number;
  sessionName: string;
  numberOfCourts: number;
  status: string;
}

export async function getPublicSession(sessionId: number): Promise<PublicSessionDto> {
  const { data } = await apiClient.get<PublicSessionDto>(`/public/sessions/${sessionId}`);
  return data;
}

export async function getPublicQueue(sessionId: number): Promise<QueueEntryDto[]> {
  const { data } = await apiClient.get<QueueEntryDto[]>(`/public/sessions/${sessionId}/queue`);
  return data;
}

export async function getPublicActiveMatches(sessionId: number): Promise<MatchDto[]> {
  const { data } = await apiClient.get<MatchDto[]>(`/public/sessions/${sessionId}/matches/active`);
  return data;
}

// Same "next up" data the organizer's Queue page shows — the prepared, not-yet-started
// matches (target: 2), read-only here.
export async function getPublicNextUpMatches(sessionId: number): Promise<MatchDto[]> {
  const { data } = await apiClient.get<MatchDto[]>(`/public/sessions/${sessionId}/matches/next-up`);
  return data;
}

export async function getPublicCompletedMatches(sessionId: number): Promise<MatchDto[]> {
  const { data } = await apiClient.get<MatchDto[]>(`/public/sessions/${sessionId}/matches/completed`);
  return data;
}

export async function getPublicLeaderboard(sessionId: number): Promise<LeaderboardPlayerDto[]> {
  const { data } = await apiClient.get<LeaderboardPlayerDto[]>(`/public/sessions/${sessionId}/leaderboard`);
  return data;
}