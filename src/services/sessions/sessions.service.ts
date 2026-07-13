import { apiClient } from "../api/client";
import type {
  CreateSessionPayload,
  SessionDto,
  SessionPlayerDto,
  UpdateSessionPayload,
} from "./sessions.types";

export async function createSession(payload: CreateSessionPayload): Promise<SessionDto> {
  const { data } = await apiClient.post<SessionDto>("/sessions", payload);
  return data;
}

export async function getSessionById(id: number): Promise<SessionDto> {
  const { data } = await apiClient.get<SessionDto>(`/sessions/${id}`);
  return data;
}

export async function getMySessions(): Promise<SessionDto[]> {
  const { data } = await apiClient.get<SessionDto[]>("/sessions/mine");
  return data;
}

// The organizer's current in-progress session, if any. Returns null (rather than
// throwing) on a 404 so callers can just check `session === null` for "nothing active".
export async function getActiveSession(): Promise<SessionDto | null> {
  try {
    const { data } = await apiClient.get<SessionDto>("/sessions/active");
    return data;
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404) return null;
    throw err;
  }
}

export async function updateSession(id: number, payload: UpdateSessionPayload): Promise<SessionDto> {
  const { data } = await apiClient.put<SessionDto>(`/sessions/${id}`, payload);
  return data;
}

export async function endSession(id: number): Promise<void> {
  await apiClient.post(`/sessions/${id}/end`);
}

export async function addPlayerToSession(sessionId: number, playerId: number): Promise<SessionPlayerDto> {
  const { data } = await apiClient.post<SessionPlayerDto>(`/sessions/${sessionId}/players/${playerId}`);
  return data;
}

export async function getSessionPlayers(sessionId: number): Promise<SessionPlayerDto[]> {
  const { data } = await apiClient.get<SessionPlayerDto[]>(`/sessions/${sessionId}/players`);
  return data;
}

export async function removePlayerFromSession(sessionId: number, playerId: number): Promise<void> {
  await apiClient.delete(`/sessions/${sessionId}/players/${playerId}`);
}

// Lock two players in this session as a fixed doubles pair — auto-mix will always
// place them on the same team together.
export async function lockPair(sessionId: number, playerId: number, partnerId: number): Promise<void> {
  await apiClient.post(`/sessions/${sessionId}/players/${playerId}/lock/${partnerId}`);
}

// Unlock a player from their current pair (clears both sides).
export async function unlockPair(sessionId: number, playerId: number): Promise<void> {
  await apiClient.post(`/sessions/${sessionId}/players/${playerId}/unlock`);
}