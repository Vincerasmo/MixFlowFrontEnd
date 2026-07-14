import { apiClient } from "../api/client";
import type {
  MatchDto,
  QueueEntryDto,
  RecordMatchResultPayload,
} from "./matches.types";
import type { BenchPlayerPayload, SessionPlayerDto } from "../sessions/sessions.types";

export async function enqueuePlayer(sessionId: number, playerId: number): Promise<QueueEntryDto> {
  const { data } = await apiClient.post<QueueEntryDto>(
    `/matches/enqueue/${playerId}`,
    null,
    { params: { sessionId } }
  );
  return data;
}

export async function getQueue(sessionId: number): Promise<QueueEntryDto[]> {
  const { data } = await apiClient.get<QueueEntryDto[]>("/matches/queue", {
    params: { sessionId },
  });
  return data;
}

export async function autoMatch(sessionId: number): Promise<void> {
  await apiClient.post("/matches/auto-match", null, { params: { sessionId } });
}

export async function smartMixCourt(sessionId: number, courtNumber: number): Promise<MatchDto> {
  const { data } = await apiClient.post<MatchDto>(
    `/matches/court/${courtNumber}/smart-mix`,
    null,
    { params: { sessionId } }
  );
  return data;
}

export async function recordMatchResult(
  sessionId: number,
  payload: RecordMatchResultPayload
): Promise<{ message: string; matchId: number }> {
  const { data } = await apiClient.post(`/matches/record-result`, payload, {
    params: { sessionId },
  });
  return data;
}

export async function removeFromQueue(sessionId: number, playerId: number): Promise<void> {
  await apiClient.delete(`/matches/queue/${playerId}`, { params: { sessionId } });
}

export async function getCompletedMatches(sessionId: number): Promise<MatchDto[]> {
  const { data } = await apiClient.get<MatchDto[]>("/matches/completed", {
    params: { sessionId },
  });
  return data;
}

export async function getActiveMatches(sessionId: number): Promise<MatchDto[]> {
  const { data } = await apiClient.get<MatchDto[]>("/matches/active", {
    params: { sessionId },
  });
  return data;
}

// The prepared, not-yet-started matches (target: 2) — this is what the Queue
// page's "Next Up" cards render and edit.
export async function getNextUpMatches(sessionId: number): Promise<MatchDto[]> {
  const { data } = await apiClient.get<MatchDto[]>("/matches/next-up", {
    params: { sessionId },
  });
  return data;
}

export async function swapMatchTeams(
  sessionId: number,
  matchId: number,
  playerAId: number,
  playerBId: number
): Promise<MatchDto> {
  const { data } = await apiClient.put<MatchDto>(
    `/matches/next-up/${matchId}/swap-teams`,
    { playerAId, playerBId },
    { params: { sessionId } }
  );
  return data;
}

export async function swapMatchWithQueue(
  sessionId: number,
  matchId: number,
  playerOutId: number,
  playerInId: number
): Promise<MatchDto> {
  const { data } = await apiClient.put<MatchDto>(
    `/matches/next-up/${matchId}/swap-with-queue`,
    { playerOutId, playerInId },
    { params: { sessionId } }
  );
  return data;
}

export async function benchPlayer(sessionId: number, payload: BenchPlayerPayload): Promise<void> {
  await apiClient.post("/matches/bench", payload, { params: { sessionId } });
}

export async function returnToQueue(sessionId: number, playerId: number): Promise<QueueEntryDto> {
  const { data } = await apiClient.post<QueueEntryDto>(
    `/matches/bench/${playerId}/return-to-queue`,
    null,
    { params: { sessionId } }
  );
  return data;
}

export async function getBenchedPlayers(sessionId: number): Promise<SessionPlayerDto[]> {
  const { data } = await apiClient.get<SessionPlayerDto[]>("/matches/benched", {
    params: { sessionId },
  });
  return data;
}