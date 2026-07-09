import { apiClient } from "../api/client";
import type {
  MatchDto,
  QueueEntryDto,
  RecordMatchResultPayload,
  SmartMixPair,
} from "./matches.types";

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

export async function createSmartMix(sessionId: number, pairs: SmartMixPair[]): Promise<MatchDto> {
  const { data } = await apiClient.post<MatchDto>(`/matches/smartmix/${sessionId}`, pairs);
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