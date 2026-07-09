export interface PlayerDto {
  playerId: number;
  fullName: string;
  skillCategory: string;
  skillLevel: number;
  winPercentage: number;
  gamesPlayed: number;
  totalWins: number;
  totalLosses: number;
}

export interface CreatePlayerPayload {
  fullName: string;
  skillCategory: string;
}

export interface UpdatePlayerPayload {
  fullName?: string;
  skillCategory?: string;
}