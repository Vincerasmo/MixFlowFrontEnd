export interface MatchPlayerDto {
  playerId: number;
  fullName: string;
  teamNumber: number;
  isWinner?: boolean | null;
}

export interface MatchDto {
  matchId: number;
  sessionId: number;
  courtNumber?: number | null;
  rotationMode: string;
  team1: MatchPlayerDto[];
  team2: MatchPlayerDto[];
  team1Score?: number | null;
  team2Score?: number | null;
  isCompleted: boolean;
}

export interface QueueEntryDto {
  queueId: number;
  playerId: number;
  fullName: string;
  skillCategory: string;
  skillLevel: number;
  priorityScore?: number | null;
  position?: number | null;
  checkInTime: string;
}

export interface RecordMatchResultPayload {
  courtNumber: number;
  team1PlayerIds: number[];
  team2PlayerIds: number[];
  team1Score: number;
  team2Score: number;
}

// Backend expects List<(int PlayerId, int PartnerId)> — verify on the wire whether
// System.Text.Json serializes this as {Item1, Item2} or {PlayerId, PartnerId}
// before relying on this shape.
export interface SmartMixPair {
  playerId: number;
  partnerId: number;
}