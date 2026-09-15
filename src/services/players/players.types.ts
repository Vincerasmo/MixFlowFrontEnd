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

export interface PlayerMatchHistoryEntry {
  matchId: number;
  playedAt: string;
  sessionId: number;
  sessionName: string;
  partnerName: string;
  opponentNames: string[];
  won: boolean;
  teamScore: number;
  opponentScore: number;
}

export interface PlayerHistory {
  playerId: number;
  fullName: string;
  skillCategory: string;
  skillLevel: number;
  totalWins: number;
  totalLosses: number;
  winPercentage: number;
  sessionsPlayed: number;
  matches: PlayerMatchHistoryEntry[];
}