import { apiClient } from "../api/client";
import type { CreatePlayerPayload, PlayerDto, UpdatePlayerPayload } from "./players.types";

export async function getAllPlayers(): Promise<PlayerDto[]> {
  const { data } = await apiClient.get<PlayerDto[]>("/players");
  return data;
}

export async function getPlayerById(id: number): Promise<PlayerDto> {
  const { data } = await apiClient.get<PlayerDto>(`/players/${id}`);
  return data;
}

export async function createPlayer(payload: CreatePlayerPayload): Promise<PlayerDto> {
  const { data } = await apiClient.post<PlayerDto>("/players", payload);
  return data;
}

export async function updatePlayer(id: number, payload: UpdatePlayerPayload): Promise<PlayerDto> {
  const { data } = await apiClient.put<PlayerDto>(`/players/${id}`, payload);
  return data;
}

export async function deletePlayer(id: number): Promise<void> {
  await apiClient.delete(`/players/${id}`);
}