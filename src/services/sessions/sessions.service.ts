import { apiClient } from "../api/client";
import type {
  BenchPlayerPayload,
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

export async function benchPlayer(sessionId: number, payload: BenchPlayerPayload): Promise<void> {
  await apiClient.post(`/sessions/${sessionId}/players/bench`, payload);
}

export async function returnFromBench(sessionId: number, playerId: number): Promise<void> {
  await apiClient.post(`/sessions/${sessionId}/players/${playerId}/return`);
}

export async function getBenchedPlayers(sessionId: number): Promise<SessionPlayerDto[]> {
  const { data } = await apiClient.get<SessionPlayerDto[]>(`/sessions/${sessionId}/players/benched`);
  return data;
}

export async function removePlayerFromSession(sessionId: number, playerId: number): Promise<void> {
  await apiClient.delete(`/sessions/${sessionId}/players/${playerId}`);
}