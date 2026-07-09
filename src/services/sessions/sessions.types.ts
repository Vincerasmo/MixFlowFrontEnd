export interface SessionDto {
  sessionId: number;
  sessionName: string;
  sessionDate: string; // ISO date string
  startTime: string; // TimeSpan as serialized by the backend, e.g. "18:00:00"
  endTime: string;
  numberOfCourts: number;
  status: string;
  createdAt: string;
}

export interface CreateSessionPayload {
  sessionName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  numberOfCourts: number;
}

export interface UpdateSessionPayload {
  sessionName?: string;
  status?: string;
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
}

export interface BenchPlayerPayload {
  playerId: number;
  reason?: string;
}