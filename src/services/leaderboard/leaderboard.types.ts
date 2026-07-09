export interface LeaderboardPlayerDto {
  playerId: number;
  fullName: string;
  winPercentage: number;
  gamesPlayed: number;
  skillLevel: number;
  wins: number;
  losses: number;
  rank: number;
}

export interface LeaderboardDto {
  sessionLeaders: LeaderboardPlayerDto[];
  overallLeaders: LeaderboardPlayerDto[];
}