export interface SessionDto {
  sessionId: number;
  sessionName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  numberOfCourts: number;
  status: string;
  createdAt: string;
  totalMatchesPlayed: number;
}

export interface CreateSessionPayload {
  sessionName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  numberOfCourts: number;
}

export interface SessionPlayerDto {
  sessionPlayerId: number;
  playerId: number;
  fullName: string;
  skillCategory: string;
  skillLevel: number;
  status: string;
  benchReason?: string | null;
  checkInTime?: string | null;
  benchedAt?: string | null;

  // How many matches this player has played within THIS session (not lifetime).
  gamesPlayedInSession: number;

  // Lock-pair info, if this player has locked in with a partner for this session.
  lockedPartnerId?: number | null;
  lockedPartnerName?: string | null;
}

export interface BenchPlayerPayload {
  playerId: number;
  reason?: string;
}